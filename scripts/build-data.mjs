import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { loadEnv } from "./load-env.mjs";

loadEnv();

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// ---- D1 support ----
const D1_ENABLED = !!(
  process.env.CLOUDFLARE_API_TOKEN &&
  process.env.CLOUDFLARE_ACCOUNT_ID &&
  process.env.D1_DATABASE_ID
);
let d1 = null;
if (D1_ENABLED) {
  try {
    const mod = await import("./d1-client.mjs");
    d1 = mod;
    await d1.ensureTables();
    console.log("D1 storage enabled");
  } catch (e) {
    console.warn(`D1 init failed: ${e.message}. Falling back to file storage.`);
    d1 = null;
  }
} else {
  console.log("D1 not configured, using file-based storage");
}

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

  if (aiEnabled) {
    try {
      await ai.healthCheck();
      aiAvailable = true;
      console.log("AI provider loaded and verified");
    } catch (e) {
      console.error(`AI provider health check failed: ${e.message}`);
    }
  } else {
    console.log("AI provider loaded (AI_ENABLED=off, health check skipped)");
  }
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

async function loadSummaries() {
  let raw;

  if (d1) {
    try {
      raw = await d1.loadSummariesFromD1();
    } catch (e) {
      console.warn(`D1 read failed: ${e.message}. Falling back to file.`);
    }
  }

  if (raw === undefined) {
    if (!existsSync(SUMMARIES_FILE)) {
      return { data: {}, migrated: false };
    }
    raw = JSON.parse(readFileSync(SUMMARIES_FILE, "utf-8"));
  }

  const entries = Object.entries(raw);

  // Detect and migrate old format: entries with aiIntroZh (string) → new Record format
  const needsMigration = entries.some(
    ([, v]) => typeof v.aiIntroZh === "string"
  );

  if (!needsMigration) return { data: raw, migrated: false };

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
  return { data: migrated, migrated: true };
}

async function saveSummaries(summaries) {
  if (d1) {
    try {
      await d1.saveSummariesToD1(summaries);
      return;
    } catch (e) {
      console.warn(`D1 write failed: ${e.message}. Writing to file.`);
    }
  }
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

    const h2Match = line.match(/^## \[(.+?)\]\((?:https?:\/\/)?github\.com\/(.+?)\)\s*$/i);
    if (h2Match) {
      if (currentRepo) {
        categoryMap[currentRepo] = {
          category: currentCategory,
          notes: currentNotes.join("\n").trim(),
        };
      }
      currentRepo = h2Match[1].replace(/\/+$/, "");
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
  const { data: summaries, migrated: cacheMigrated } = await loadSummaries();
  const notesMap = parseStarsMd();

  const categoriesSet = new Set();
  const entries = [];

  let summaryChanged = cacheMigrated;

  for (const star of stars) {
    const noteData = notesMap[star.fullName] || {};
    const category = noteData.category || "Uncategorized";
    categoriesSet.add(category);

    const userNotesRaw = noteData.notes || "";
    const cache = summaries[star.fullName] || { aiIntro: {}, userNotes: {} };

    // Priority order for detecting Chinese source language from available languages
    const ZH_VARIANTS = ["zh-CN", "zh-TW", "zh-HK", "zh-Hans", "zh-Hant", "zh"];
    const notesSourceLang = ZH_VARIANTS.find((z) => languages.includes(z)) || languages[0] || "zh-CN";

    if (aiEnabled && aiAvailable) {
      // AI intros for each language — invalidate if description changed
      const introSource = `${star.fullName}|${star.description || ""}`;
      if (cache._introSource !== introSource) {
        cache.aiIntro = {};
      }
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
      cache._introSource = introSource;

      // Store raw notes under the detected source language
      if (languages.includes(notesSourceLang)) {
        cache.userNotes[notesSourceLang] = userNotesRaw;
      }

      for (const lang of languages) {
        if (lang === notesSourceLang) continue;
        // Invalidate stale translation if source changed
        if (cache._notesSource !== userNotesRaw) {
          cache.userNotes[lang] = "";
        }
        if (!cache.userNotes[lang] && userNotesRaw) {
          try {
            cache.userNotes[lang] = await translateText(userNotesRaw, lang, notesSourceLang);
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
      // AI disabled: store raw notes under detected source language
      if (languages.includes(notesSourceLang)) {
        cache.userNotes[notesSourceLang] = userNotesRaw;
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
    await saveSummaries(summaries);
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
      projectUrl: process.env.PROJECT_URL || "",
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
