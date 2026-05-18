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

// ---- Env config ----
const languages = (process.env.SITE_LANGUAGES || "en")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const aiEnabled = (process.env.AI_ENABLED || "on").toLowerCase() === "on";

let siteTitle = {};
let siteSubtitle = {};
try {
  if (process.env.SITE_TITLE) siteTitle = JSON.parse(process.env.SITE_TITLE);
  if (process.env.SITE_SUBTITLE) siteSubtitle = JSON.parse(process.env.SITE_SUBTITLE);
} catch {
  console.warn("Failed to parse SITE_TITLE or SITE_SUBTITLE as JSON, using defaults");
}

// ---- AI provider ----
let aiAvailable = false;
let generateIntro, translateText;

try {
  const ai = await import("./ai-provider.mjs");
  generateIntro = ai.generateIntro;
  translateText = ai.translateText;
  aiAvailable = true;
  console.log("AI provider loaded");
} catch {
  console.log("AI provider not available, skipping AI features");
}

if (!aiEnabled) {
  console.log("AI_ENABLED=off, skipping all AI features");
}

// ---- File loaders ----

function loadStars() {
  if (!existsSync(STARS_FILE)) {
    console.error("stars.json not found. Run fetch-stars first.");
    process.exit(1);
  }
  return JSON.parse(readFileSync(STARS_FILE, "utf-8"));
}

function loadSummaries() {
  if (!existsSync(SUMMARIES_FILE)) {
    return {};
  }

  const raw = JSON.parse(readFileSync(SUMMARIES_FILE, "utf-8"));
  const entries = Object.entries(raw);

  // Detect and migrate old format: entries with aiIntroZh (string) → new Record format
  const needsMigration = entries.some(
    ([, v]) => typeof v.aiIntroZh === "string"
  );

  if (!needsMigration) return raw;

  console.log("Migrating summaries cache from old format...");
  const migrated = {};
  for (const [key, val] of entries) {
    if (typeof val.aiIntroZh === "string") {
      migrated[key] = {
        aiIntro: {
          "zh-CN": val.aiIntroZh || "",
          en: val.aiIntroEn || "",
        },
        userNotes: {
          "zh-CN": val.userNotesZh || "",
          en: val.userNotesEn || "",
        },
      };
    } else {
      migrated[key] = val;
    }
  }
  return migrated;
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

  const categoryMap = {};
  let currentCategory = "Uncategorized";
  let currentRepo = null;
  let currentNotes = [];

  for (const line of lines) {
    if (/^# /.test(line)) {
      currentCategory = line.replace(/^# /, "").trim();
      continue;
    }

    const h2Match = line.match(/^## \[(.+?)\]\(https:\/\/github\.com\/(.+?)\)/);
    if (h2Match) {
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

    if (currentRepo && line.trim()) {
      currentNotes.push(line);
    }
  }

  if (currentRepo) {
    categoryMap[currentRepo] = {
      category: currentCategory,
      notes: currentNotes.join("\n").trim(),
    };
  }

  return categoryMap;
}

// ---- Main pipeline ----

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

    const userNotesRaw = noteData.notes || "";
    const cache = summaries[star.fullName] || { aiIntro: {}, userNotes: {} };

    if (aiEnabled && aiAvailable) {
      // AI intros for each language
      for (const lang of languages) {
        if (!cache.aiIntro[lang]) {
          try {
            cache.aiIntro[lang] = await generateIntro(
              lang,
              star.fullName,
              star.description
            );
            summaryChanged = true;
          } catch (e) {
            console.warn(
              `AI intro [${lang}] failed for ${star.fullName}: ${e.message}`
            );
          }
        }
      }

      // User notes: raw = Chinese. zh-CN stores raw, others translate.
      if (languages.includes("zh-CN")) {
        cache.userNotes["zh-CN"] = userNotesRaw;
      }

      for (const lang of languages) {
        if (lang === "zh-CN") continue;
        // Invalidate stale translation if source changed
        if (cache._notesSource !== userNotesRaw) {
          cache.userNotes[lang] = "";
        }
        if (!cache.userNotes[lang] && userNotesRaw) {
          try {
            cache.userNotes[lang] = await translateText(userNotesRaw, lang);
            summaryChanged = true;
          } catch (e) {
            console.warn(
              `Notes translate [${lang}] failed for ${star.fullName}: ${e.message}`
            );
          }
        }
      }
      cache._notesSource = userNotesRaw;
    } else {
      // AI disabled: only store raw notes for zh-CN if present in languages
      if (languages.includes("zh-CN")) {
        cache.userNotes["zh-CN"] = userNotesRaw;
      }
    }

    summaries[star.fullName] = cache;

    entries.push({
      fullName: star.fullName,
      htmlUrl: star.htmlUrl,
      description: star.description,
      language: star.language,
      topics: star.topics,
      stargazersCount: star.stargazersCount,
      pushedAt: star.pushedAt,
      category,
      aiIntro: cache.aiIntro || {},
      userNotes: cache.userNotes || {},
    });
  }

  // Prune un-starred repos from summaries cache
  const currentFullNames = new Set(stars.map((s) => s.fullName));
  for (const key of Object.keys(summaries)) {
    if (!currentFullNames.has(key)) {
      delete summaries[key];
      summaryChanged = true;
    }
  }

  if (summaryChanged) {
    saveSummaries(summaries);
    console.log("Summaries cache updated");
  }

  const categories = Array.from(categoriesSet);
  const totalStars = entries.reduce((sum, e) => sum + e.stargazersCount, 0);

  const merged = {
    categories,
    entries,
    totalStars,
    lastUpdated: new Date().toISOString(),
    siteConfig: {
      title: siteTitle,
      subtitle: siteSubtitle,
      languages,
      aiEnabled,
    },
    languages,
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
