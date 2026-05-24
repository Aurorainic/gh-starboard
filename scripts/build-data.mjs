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
const aiAutoCategory = (process.env.AI_AUTO_CATEGORY || "").toLowerCase() === "on";

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
let generateIntro, generateIntroAndCategory, translateText, suggestCategory, translateUITexts;

try {
  const ai = await import("./ai-provider.mjs");
  generateIntro = ai.generateIntro;
  generateIntroAndCategory = ai.generateIntroAndCategory;
  translateText = ai.translateText;
  suggestCategory = ai.suggestCategory;
  translateUITexts = ai.translateUITexts;

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
  const aiCategories = new Set();
  const entries = [];
  const AI_CATEGORY_PROMPT_VER = 2; // bump to force re-categorization

  let summaryChanged = cacheMigrated;
  let aiErrors = { intro: 0, translate: 0, category: 0 };

  for (const star of stars) {
    const noteData = notesMap[star.fullName] || {};
    let category = noteData.category || "Uncategorized";
    categoriesSet.add(category);

    const userNotesRaw = noteData.notes || "";
    const cache = summaries[star.fullName] || { aiIntro: {}, userNotes: {} };

    // Priority order for detecting Chinese source language from available languages
    const ZH_VARIANTS = ["zh-CN", "zh-TW", "zh-HK", "zh-Hans", "zh-Hant", "zh"];
    const notesSourceLang = ZH_VARIANTS.find((z) => languages.includes(z)) || languages[0] || "zh-CN";

    if (aiEnabled && aiAvailable) {
      // AI intros for each language — invalidate if description changed
      const introSource = `${star.fullName}|${star.description || ""}`;
      const introInvalidated = cache._introSource !== introSource;
      if (introInvalidated) {
        cache.aiIntro = {};
        cache._aiCategory = undefined; // force re-categorization on description change
      }

      for (let i = 0; i < languages.length; i++) {
        const lang = languages[i];
        if (!cache.aiIntro[lang]) {
          try {
            // When auto-categorize is on and this is the first language,
            // use combined function to get intro + category in one API call
            if (aiAutoCategory && i === 0) {
              const result = await generateIntroAndCategory(
                lang,
                star.fullName,
                star.description,
                star.topics,
                star.language
              );
              cache.aiIntro[lang] = result.intro;
              if (result.category && result.category !== "Uncategorized") {
                cache._aiCategory = result.category;
                cache._aiCategoryDesc = star.description;
                cache._aiCategoryVer = AI_CATEGORY_PROMPT_VER;
                // Apply immediately if still Uncategorized
                if (category === "Uncategorized") {
                  category = result.category;
                  categoriesSet.add(result.category);
                  aiCategories.add(result.category);
                }
              }
            } else {
              cache.aiIntro[lang] = await generateIntro(
                lang,
                star.fullName,
                star.description
              );
            }
            summaryChanged = true;
          } catch (e) {
            aiErrors.intro++;
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
            aiErrors.translate++;
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

  // ---- AI smart categorization fallback for remaining Uncategorized repos ----
  if (aiAutoCategory && aiAvailable) {
    const uncategorized = entries.filter((e) => e.category === "Uncategorized");

    // Filter to only repos that need categorization:
    // - New repos (not in cache) that are Uncategorized
    // - Previously AI-categorized repos whose description changed
    // - Cached categories from an older prompt version
    const toCategorize = uncategorized.filter((entry) => {
      const cache = summaries[entry.fullName];
      if (!cache) return true; // new repo
      if (!cache._aiCategory) return true; // never AI-categorized
      if (cache._aiCategoryVer !== AI_CATEGORY_PROMPT_VER) return true; // prompt changed
      if (cache._aiCategoryDesc !== entry.description) return true; // description changed
      // Restore previous AI category
      entry.category = cache._aiCategory;
      categoriesSet.add(cache._aiCategory);
      aiCategories.add(cache._aiCategory);
      return false;
    });

    if (toCategorize.length > 0) {
      console.log(`AI categorizing ${toCategorize.length} new/changed uncategorized repo(s)...`);
      for (const entry of toCategorize) {
        try {
          const suggested = await suggestCategory(
            entry.fullName,
            entry.description,
            entry.topics,
            entry.language
          );
          if (suggested && suggested !== "Uncategorized") {
            entry.category = suggested;
            categoriesSet.add(suggested);
            aiCategories.add(suggested);
            // Track in cache for incremental updates
            if (!summaries[entry.fullName]) summaries[entry.fullName] = { aiIntro: {}, userNotes: {} };
            summaries[entry.fullName]._aiCategory = suggested;
            summaries[entry.fullName]._aiCategoryDesc = entry.description;
            summaries[entry.fullName]._aiCategoryVer = AI_CATEGORY_PROMPT_VER;
            summaryChanged = true;
          }
        } catch (e) {
          aiErrors.category++;
          console.warn(`AI categorize failed for ${entry.fullName}: ${e.message}`);
        }
      }
    } else {
      console.log("No new uncategorized repos to categorize");
    }
  } else if (!aiAutoCategory) {
    console.log("AI_AUTO_CATEGORY=off, skipping auto categorization");
  }

  // Remove empty "Uncategorized" if all repos got categorized
  if (categoriesSet.has("Uncategorized")) {
    const hasUncategorized = entries.some((e) => e.category === "Uncategorized");
    if (!hasUncategorized) categoriesSet.delete("Uncategorized");
  }

  const categories = Array.from(categoriesSet);
  const totalStars = entries.reduce((sum, e) => sum + e.stargazersCount, 0);

  // ---- AI UI text translation for non-default languages ----
  const uiSourceTexts = {
    "app.title": "GitHub Stars Notes",
    "app.subtitle": "My GitHub Stars Collection & Notes",
    "search.placeholder": "Search repos, descriptions, notes...",
    "stats.totalStars": "{count} Stars",
    "stats.categories": "{count} Categories",
    "sidebar.toc": "Contents",
    "entry.stars": "{count} stars",
    "entry.language": "Language",
    "entry.topics": "Topics",
    "entry.aiIntro": "AI Intro",
    "entry.description": "Description",
    "entry.userNotes": "My Notes",
    "entry.updated": "Updated",
    "time.justNow": "just now",
    "empty.title": "No matching repositories",
    "empty.description": "Try adjusting your search terms or clearing filters",
    "pagination.prev": "Previous",
    "pagination.next": "Next",
    "pagination.pagePrefix": "Page",
    "pagination.pageSuffix": "of {total}",
    "pagination.perPage": "Per page",
    "footer.generated": "Generated by {link}",
    "footer.project": "gh-starboard",
    "footer.refreshed": "Data refreshed {time} ago",
    "theme.auto": "Auto",
    "theme.dark": "Dark",
    "theme.light": "Light",
    "sort.starred": "Star order",
    "sort.stars": "By stars",
    "sort.updated": "By updated",
    "sort.name": "By name",
    "error.loadFailed": "Failed to load data",
    "error.retry": "Retry",
    "backToTop": "Back to top",
    "filter.min": "Min",
    "filter.max": "Max",
  };

  const DEFAULT_LANG = "en";
  const SKIP_LANGS = new Set([DEFAULT_LANG, "zh-CN"]);
  const uiTranslations = {};

  if (aiEnabled && aiAvailable) {
    const langsToTranslate = languages.filter((l) => !SKIP_LANGS.has(l));
    for (const lang of langsToTranslate) {
      console.log(`Translating UI texts to ${lang}...`);
      try {
        uiTranslations[lang] = await translateUITexts(uiSourceTexts, lang);
      } catch (e) {
        console.warn(`UI translation for ${lang} failed: ${e.message}`);
      }
    }
  }

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
    uiTranslations,
    aiCategories: Array.from(aiCategories),
  };

  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, JSON.stringify(merged, null, 2), "utf-8");

  const totalErrors = aiErrors.intro + aiErrors.translate + aiErrors.category;
  if (totalErrors > 0) {
    console.warn(`AI errors: ${aiErrors.intro} intro, ${aiErrors.translate} translate, ${aiErrors.category} category`);
  }

  console.log(
    `Built merged.json: ${entries.length} entries, ${categories.length} categories`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
