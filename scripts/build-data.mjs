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
let generateIntro, translateText, suggestCategory, batchSuggestCategories, translateUITexts;

try {
  const ai = await import("./ai-provider.mjs");
  generateIntro = ai.generateIntro;
  translateText = ai.translateText;
  suggestCategory = ai.suggestCategory;
  batchSuggestCategories = ai.batchSuggestCategories;
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
      console.log(`Loaded ${Object.keys(raw).length} entries from D1 cache`);
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

// ---- Concurrency helper ----
async function pMap(items, fn, concurrency) {
  const results = [];
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

// ---- Per-repo AI processing (runs concurrently) ----

async function processRepo(star, cache, notesMap, languages, aiErrors) {
  const noteData = notesMap[star.fullName] || {};
  const userNotesRaw = noteData.notes || "";

  const ZH_VARIANTS = ["zh-CN", "zh-TW", "zh-HK", "zh-Hans", "zh-Hant", "zh"];
  const notesSourceLang = ZH_VARIANTS.find((z) => languages.includes(z)) || languages[0] || "zh-CN";

  // AI intros for each language — invalidate if description changed
  const introSource = `${star.fullName}|${star.description || ""}`;
  const introInvalidated = cache._introSource !== introSource;
  if (introInvalidated) {
    cache.aiIntro = {};
    cache._aiCategory = undefined;
  }

  // Generate intros for all languages in parallel
  const introPromises = languages.map(async (lang) => {
    if (cache.aiIntro[lang]) return;
    try {
      cache.aiIntro[lang] = await generateIntro(lang, star.fullName, star.description);
    } catch (e) {
      aiErrors.intro.count++;
      aiErrors.intro.repos.push({ repo: star.fullName, lang, error: e.message });
      console.warn(`AI intro [${lang}] failed for ${star.fullName}: ${e.message}`);
    }
  });

  await Promise.all(introPromises);
  cache._introSource = introSource;

  // Store raw notes under the detected source language
  if (languages.includes(notesSourceLang)) {
    cache.userNotes[notesSourceLang] = userNotesRaw;
  }

  // Translate notes to other languages in parallel
  const translatePromises = languages.map(async (lang) => {
    if (lang === notesSourceLang) return;
    if (cache._notesSource !== userNotesRaw) {
      cache.userNotes[lang] = "";
    }
    if (!cache.userNotes[lang] && userNotesRaw) {
      try {
        cache.userNotes[lang] = await translateText(userNotesRaw, lang, notesSourceLang);
      } catch (e) {
        aiErrors.translate.count++;
        aiErrors.translate.repos.push({ repo: star.fullName, lang, error: e.message });
        console.warn(`Notes translate [${lang}] failed for ${star.fullName}: ${e.message}`);
      }
    }
  });

  await Promise.all(translatePromises);
  cache._notesSource = userNotesRaw;
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
  let aiErrors = {
    intro: { count: 0, repos: [] },
    translate: { count: 0, repos: [] },
    category: { count: 0, repos: [] },
  };

  const CONCURRENCY = Number(process.env.AI_CONCURRENCY) || 3;
  let processed = 0;

  // Pre-initialize caches so concurrent workers don't race on summaries[fullName]
  for (const star of stars) {
    if (!summaries[star.fullName]) {
      summaries[star.fullName] = { aiIntro: {}, userNotes: {} };
    }
  }

  if (aiEnabled && aiAvailable) {
    console.log(`Processing ${stars.length} repos (concurrency=${CONCURRENCY})...`);
    await pMap(stars, async (star) => {
      const cache = summaries[star.fullName];
      await processRepo(star, cache, notesMap, languages, aiErrors);
      processed++;
      if (processed % 10 === 0) {
        console.log(`  ${processed}/${stars.length} repos processed`);
      }
    }, CONCURRENCY);
    console.log(`  ${stars.length}/${stars.length} repos processed`);
    summaryChanged = true;
  }

  // Build entries (always, even if AI disabled)
  for (const star of stars) {
    const noteData = notesMap[star.fullName] || {};
    let category = noteData.category || "Uncategorized";
    categoriesSet.add(category);

    const cache = summaries[star.fullName] || { aiIntro: {}, userNotes: {} };

    if (aiEnabled && aiAvailable && cache._aiCategory && cache._aiCategoryVer === AI_CATEGORY_PROMPT_VER && category === "Uncategorized") {
      category = cache._aiCategory;
      categoriesSet.add(category);
      aiCategories.add(category);
    }

    // Store raw notes when AI is disabled
    if (!aiEnabled || !aiAvailable) {
      const ZH_VARIANTS = ["zh-CN", "zh-TW", "zh-HK", "zh-Hans", "zh-Hant", "zh"];
      const notesSourceLang = ZH_VARIANTS.find((z) => languages.includes(z)) || languages[0] || "zh-CN";
      if (languages.includes(notesSourceLang)) {
        cache.userNotes[notesSourceLang] = noteData.notes || "";
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

  // ---- AI smart categorization: batch mode ----
  if (aiAvailable) {
    const uncategorized = entries.filter((e) => e.category === "Uncategorized");

    // Filter to only repos that need categorization
    const toCategorize = uncategorized.filter((entry) => {
      const cache = summaries[entry.fullName];
      if (!cache) return true;
      if (!cache._aiCategory) return true;
      if (cache._aiCategoryVer !== AI_CATEGORY_PROMPT_VER) return true;
      if (cache._aiCategoryDesc !== entry.description) return true;
      // Restore previous AI category
      entry.category = cache._aiCategory;
      categoriesSet.add(cache._aiCategory);
      aiCategories.add(cache._aiCategory);
      return false;
    });

    if (toCategorize.length > 0) {
      const BATCH_SIZE = 5;
      console.log(`AI batch categorizing ${toCategorize.length} repo(s) in groups of ${BATCH_SIZE}...`);
      let currentCategories = Array.from(categoriesSet);
      const failedRepos = [];

      for (let i = 0; i < toCategorize.length; i += BATCH_SIZE) {
        const batch = toCategorize.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(toCategorize.length / BATCH_SIZE);
        console.log(`  Batch ${batchNum}/${totalBatches} (${batch.length} repos, ${currentCategories.length} existing categories)...`);

        try {
          const assignments = await batchSuggestCategories(batch, currentCategories);
          for (const a of assignments) {
            const entry = batch.find((e) => e.fullName === a.repo);
            if (entry && a.category && a.category !== "Uncategorized") {
              entry.category = a.category;
              categoriesSet.add(a.category);
              aiCategories.add(a.category);
              if (!currentCategories.includes(a.category)) {
                currentCategories.push(a.category);
              }
              if (!summaries[entry.fullName]) summaries[entry.fullName] = { aiIntro: {}, userNotes: {} };
              summaries[entry.fullName]._aiCategory = a.category;
              summaries[entry.fullName]._aiCategoryDesc = entry.description;
              summaries[entry.fullName]._aiCategoryVer = AI_CATEGORY_PROMPT_VER;
              summaryChanged = true;
            }
          }
          // Collect repos that weren't assigned for retry
          const assigned = new Set(assignments.map((a) => a.repo));
          for (const entry of batch) {
            if (!assigned.has(entry.fullName)) {
              failedRepos.push(entry);
            }
          }
        } catch (e) {
          console.warn(`  Batch ${batchNum} failed: ${e.message}, will retry individually`);
          failedRepos.push(...batch);
        }
      }

      // Retry failed repos individually
      if (failedRepos.length > 0) {
        console.log(`Retrying ${failedRepos.length} failed repo(s) individually...`);
        let retrySuccess = 0;
        for (const entry of failedRepos) {
          try {
            const category = await suggestCategory(entry.fullName, entry.description, entry.topics, entry.language);
            if (category && category !== "Uncategorized") {
              entry.category = category;
              categoriesSet.add(category);
              aiCategories.add(category);
              if (!currentCategories.includes(category)) {
                currentCategories.push(category);
              }
              if (!summaries[entry.fullName]) summaries[entry.fullName] = { aiIntro: {}, userNotes: {} };
              summaries[entry.fullName]._aiCategory = category;
              summaries[entry.fullName]._aiCategoryDesc = entry.description;
              summaries[entry.fullName]._aiCategoryVer = AI_CATEGORY_PROMPT_VER;
              summaryChanged = true;
              retrySuccess++;
            } else {
              aiErrors.category.count++;
              aiErrors.category.repos.push({ repo: entry.fullName, error: "no valid category returned" });
            }
          } catch (e) {
            aiErrors.category.count++;
            aiErrors.category.repos.push({ repo: entry.fullName, error: e.message });
          }
        }
        console.log(`  Retry complete: ${retrySuccess}/${failedRepos.length} succeeded`);
      }
    } else {
      console.log("No new uncategorized repos to categorize");
    }
  }

  // Remove empty "Uncategorized" if all repos got categorized
  if (categoriesSet.has("Uncategorized")) {
    const hasUncategorized = entries.some((e) => e.category === "Uncategorized");
    if (!hasUncategorized) categoriesSet.delete("Uncategorized");
  }

  const categories = Array.from(categoriesSet);
  const totalStars = entries.reduce((sum, e) => sum + e.stargazersCount, 0);

  // ---- Generate i18n files ----
  const uiSourceTexts = {
    "app.title": "GitHub Stars Notes",
    "app.subtitle": "My GitHub Stars Collection & Notes",
    "search.placeholder": "Search repos, descriptions, notes...",
    "stats.totalStars": "{count} Stars",
    "stats.categories": "{count} Categories",
    "sidebar.toc": "Contents",
    "sidebar.all": "All",
    "sidebar.selected": "selected",
    "sidebar.clearAll": "Clear all",
    "sidebar.sort": "Sort",
    "sidebar.stars": "Stars",
    "sidebar.languages": "Languages",
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

  // Load category translations from D1 cache
  const categoryTranslationsCache = {};
  if (d1) {
    try {
      const rows = await d1.d1Query("SELECT category_name, translations FROM category_translations");
      for (const row of rows) {
        categoryTranslationsCache[row.category_name] = JSON.parse(row.translations);
      }
      console.log(`Loaded ${Object.keys(categoryTranslationsCache).length} category translations from D1`);
    } catch (e) {
      console.warn(`Failed to load category translations from D1: ${e.message}`);
    }
  }

  // Translate categories incrementally
  const categoryTranslations = {};
  for (const lang of languages) {
    categoryTranslations[lang] = {};
  }

  if (aiEnabled && aiAvailable) {
    const langsToTranslate = languages.filter((l) => l !== "en");
    const newTranslations = {};

    for (const cat of categories) {
      const cached = categoryTranslationsCache[cat] || {};
      for (const lang of langsToTranslate) {
        if (cached[lang]) {
          categoryTranslations[lang][cat] = cached[lang];
        } else {
          if (!newTranslations[lang]) newTranslations[lang] = [];
          newTranslations[lang].push(cat);
        }
      }
    }

    // Translate new categories one by one
    for (const lang of langsToTranslate) {
      const toTranslate = newTranslations[lang] || [];
      if (toTranslate.length > 0) {
        console.log(`Translating ${toTranslate.length} new categories to ${lang}...`);
        for (const cat of toTranslate) {
          try {
            const translated = await translateText(cat, lang, "en");
            categoryTranslations[lang][cat] = translated;
            if (!categoryTranslationsCache[cat]) categoryTranslationsCache[cat] = {};
            categoryTranslationsCache[cat][lang] = translated;
          } catch (e) {
            console.warn(`  Failed to translate "${cat}" to ${lang}: ${e.message}`);
            categoryTranslations[lang][cat] = cat; // fallback to English
          }
        }
      }
    }

    // Save updated category translations to D1
    if (d1 && Object.keys(categoryTranslationsCache).length > 0) {
      try {
        await d1.d1Query("CREATE TABLE IF NOT EXISTS category_translations (category_name TEXT PRIMARY KEY, translations TEXT)");
        for (const [cat, translations] of Object.entries(categoryTranslationsCache)) {
          await d1.d1Query(
            "INSERT OR REPLACE INTO category_translations (category_name, translations) VALUES (?, ?)",
            [cat, JSON.stringify(translations)]
          );
        }
        console.log(`Saved ${Object.keys(categoryTranslationsCache).length} category translations to D1`);
      } catch (e) {
        console.warn(`Failed to save category translations to D1: ${e.message}`);
      }
    }
  }

  // Generate i18n files
  const I18N_DIR = resolve(ROOT, "public/i18n");
  mkdirSync(I18N_DIR, { recursive: true });

  for (const lang of languages) {
    const i18nData = { ...uiSourceTexts };

    // Add category translations
    for (const cat of categories) {
      i18nData[`category.${cat}`] = categoryTranslations[lang]?.[cat] || cat;
    }

    // Translate UI texts for non-English languages
    if (lang !== "en" && aiEnabled && aiAvailable) {
      try {
        console.log(`Translating UI texts to ${lang}...`);
        const translated = await translateUITexts(uiSourceTexts, lang);
        Object.assign(i18nData, translated);
      } catch (e) {
        console.warn(`UI translation for ${lang} failed: ${e.message}`);
      }
    }

    writeFileSync(resolve(I18N_DIR, `${lang}.json`), JSON.stringify(i18nData, null, 2), "utf-8");
    console.log(`Generated i18n/${lang}.json`);
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
    aiCategories: Array.from(aiCategories),
  };

  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, JSON.stringify(merged, null, 2), "utf-8");

  const totalErrors = aiErrors.intro.count + aiErrors.translate.count + aiErrors.category.count;
  if (totalErrors > 0) {
    console.warn(`\nAI errors summary: ${totalErrors} total failure(s)`);
    for (const [type, data] of Object.entries(aiErrors)) {
      if (data.count > 0) {
        console.warn(`  ${type}: ${data.count} failure(s)`);
        data.repos.slice(0, 5).forEach((r) => {
          console.warn(`    - ${r.repo}${r.lang ? ` [${r.lang}]` : ""}: ${r.error}`);
        });
        if (data.repos.length > 5) {
          console.warn(`    ... and ${data.repos.length - 5} more`);
        }
      }
    }
  }

  console.log(
    `Built merged.json: ${entries.length} entries, ${categories.length} categories`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
