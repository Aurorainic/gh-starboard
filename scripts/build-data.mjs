import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { loadEnv } from "./load-env.mjs";

loadEnv();

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const STARS_FILE = resolve(ROOT, "public/data/stars.json");
const STARS_MD = resolve(ROOT, "content/stars.md");
const SUMMARIES_FILE = resolve(ROOT, "content/summaries.json");
const OUTPUT = resolve(ROOT, "public/data/merged.json");

let aiAvailable = false;
let generateIntroZh, translateToEn;

try {
  const ai = await import("./ai-provider.mjs");
  generateIntroZh = ai.generateIntroZh;
  translateToEn = ai.translateToEn;
  aiAvailable = true;
  console.log("AI provider loaded");
} catch {
  console.log("AI provider not available, skipping AI features");
}

function loadStars() {
  if (!existsSync(STARS_FILE)) {
    console.error("stars.json not found. Run fetch-stars first.");
    process.exit(1);
  }
  return JSON.parse(readFileSync(STARS_FILE, "utf-8"));
}

function loadSummaries() {
  if (existsSync(SUMMARIES_FILE)) {
    return JSON.parse(readFileSync(SUMMARIES_FILE, "utf-8"));
  }
  return {};
}

function saveSummaries(summaries) {
  mkdirSync(dirname(SUMMARIES_FILE), { recursive: true });
  writeFileSync(SUMMARIES_FILE, JSON.stringify(summaries, null, 2), "utf-8");
}

function parseStarsMd() {
  if (!existsSync(STARS_MD)) {
    console.log("stars.md not found, all entries go to 'Uncategorized'");
    return {};
  }

  const content = readFileSync(STARS_MD, "utf-8");
  const lines = content.split("\n");

  const categoryMap = {}; // fullName → { category, notes }
  let currentCategory = "Uncategorized";
  let currentRepo = null;
  let currentNotes = [];

  for (const line of lines) {
    // H1 → category
    if (/^# /.test(line)) {
      currentCategory = line.replace(/^# /, "").trim();
      continue;
    }

    // H2 → repo entry
    const h2Match = line.match(/^## \[(.+?)\]\(https:\/\/github\.com\/(.+?)\)/);
    if (h2Match) {
      // flush previous
      if (currentRepo) {
        categoryMap[currentRepo] = {
          category: currentCategory,
          notes: currentNotes.join("\n").trim(),
        };
      }
      currentRepo = h2Match[1];
      currentNotes = [];
      continue;
    }

    // Collect notes
    if (currentRepo && line.trim()) {
      currentNotes.push(line);
    }
  }

  // flush last
  if (currentRepo) {
    categoryMap[currentRepo] = {
      category: currentCategory,
      notes: currentNotes.join("\n").trim(),
    };
  }

  return categoryMap;
}

async function main() {
  const stars = loadStars();
  const summaries = loadSummaries();
  const notesMap = parseStarsMd();

  const categoriesSet = new Set();
  const entries = [];

  let summaryChanged = false;

  for (const star of stars) {
    const noteData = notesMap[star.fullName] || {};
    const category = noteData.category || "Uncategorized";
    categoriesSet.add(category);

    const userNotesZh = noteData.notes || "";

    // AI intro
    let { aiIntroZh = "", aiIntroEn = "" } = summaries[star.fullName] || {};
    if (!aiIntroZh && aiAvailable) {
      try {
        aiIntroZh = await generateIntroZh(
          star.fullName,
          star.description,
          ""
        );
        summaries[star.fullName] = {
          ...summaries[star.fullName],
          aiIntroZh,
        };
        summaryChanged = true;
      } catch (e) {
        console.warn(`AI intro failed for ${star.fullName}: ${e.message}`);
      }
    }
    if (!aiIntroEn && aiIntroZh && aiAvailable) {
      try {
        aiIntroEn = await translateToEn(aiIntroZh);
        summaries[star.fullName] = {
          ...summaries[star.fullName],
          aiIntroEn,
        };
        summaryChanged = true;
      } catch (e) {
        console.warn(`AI translate failed for ${star.fullName}: ${e.message}`);
      }
    }

    // Translate user notes
    let { userNotesEn = "" } = summaries[star.fullName] || {};
    if (!userNotesEn && userNotesZh && aiAvailable) {
      try {
        userNotesEn = await translateToEn(userNotesZh);
        summaries[star.fullName] = {
          ...summaries[star.fullName],
          userNotesEn,
        };
        summaryChanged = true;
      } catch (e) {
        console.warn(`Notes translate failed for ${star.fullName}: ${e.message}`);
      }
    }

    entries.push({
      fullName: star.fullName,
      htmlUrl: star.htmlUrl,
      description: star.description,
      language: star.language,
      topics: star.topics,
      stargazersCount: star.stargazersCount,
      pushedAt: star.pushedAt,
      category,
      aiIntroZh,
      aiIntroEn,
      userNotesZh,
      userNotesEn: userNotesEn || "",
    });
  }

  if (summaryChanged) {
    saveSummaries(summaries);
    console.log("Summaries cache updated");
  }

  const categories = Array.from(categoriesSet);
  const totalStars = entries.reduce(
    (sum, e) => sum + e.stargazersCount,
    0
  );

  const merged = {
    categories,
    entries,
    totalStars,
    lastUpdated: new Date().toISOString(),
  };

  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, JSON.stringify(merged, null, 2), "utf-8");
  console.log(
    `Built merged.json: ${entries.length} entries, ${categories.length} categories`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
