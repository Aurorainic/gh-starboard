import { loadEnv } from "./load-env.mjs";

loadEnv();

const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const DATABASE_ID = process.env.D1_DATABASE_ID;

const BASE_URL = ACCOUNT_ID && DATABASE_ID
  ? `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}/query`
  : "";

async function d1Query(sql, params = []) {
  if (!BASE_URL) throw new Error("D1 not configured: missing CLOUDFLARE_ACCOUNT_ID or D1_DATABASE_ID");
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sql, params }),
  });
  const json = await res.json();
  if (!json.success) {
    throw new Error(`D1 query error: ${JSON.stringify(json.errors)}`);
  }
  return json.result?.[0]?.results ?? [];
}

async function d1Batch(queries) {
  for (const q of queries) {
    await d1Query(q.sql, q.params);
  }
}

export async function ensureTables() {
  await d1Query(`
    CREATE TABLE IF NOT EXISTS summaries (
      full_name         TEXT PRIMARY KEY,
      ai_intro          TEXT NOT NULL DEFAULT '{}',
      user_notes        TEXT NOT NULL DEFAULT '{}',
      intro_source      TEXT NOT NULL DEFAULT '',
      notes_source      TEXT NOT NULL DEFAULT '',
      ai_category       TEXT NOT NULL DEFAULT '',
      ai_category_desc  TEXT NOT NULL DEFAULT '',
      ai_category_ver   INTEGER NOT NULL DEFAULT 0,
      updated_at        TEXT NOT NULL
    )
  `);
  // Migrate: add columns if they don't exist (for existing databases)
  for (const col of [
    { name: "ai_category", type: "TEXT NOT NULL DEFAULT ''" },
    { name: "ai_category_desc", type: "TEXT NOT NULL DEFAULT ''" },
    { name: "ai_category_ver", type: "INTEGER NOT NULL DEFAULT 0" },
  ]) {
    try {
      await d1Query(`ALTER TABLE summaries ADD COLUMN ${col.name} ${col.type}`);
    } catch (e) {
      if (!e.message?.includes("duplicate column")) throw e;
    }
  }
}

export async function clearSummaries() {
  await d1Query("DELETE FROM summaries");
}

export async function clearCategoryColumns() {
  await d1Query("UPDATE summaries SET ai_category = '', ai_category_desc = '', ai_category_ver = 0");
}

export async function loadSummariesFromD1() {
  const rows = await d1Query(
    "SELECT full_name, ai_intro, user_notes, intro_source, notes_source, ai_category, ai_category_desc, ai_category_ver FROM summaries"
  );
  const result = {};
  for (const row of rows) {
    const cache = {
      aiIntro: JSON.parse(row.ai_intro),
      userNotes: JSON.parse(row.user_notes),
      _introSource: row.intro_source,
      _notesSource: row.notes_source,
    };
    if (row.ai_category) {
      cache._aiCategory = row.ai_category;
      cache._aiCategoryDesc = row.ai_category_desc;
      cache._aiCategoryVer = row.ai_category_ver;
    }
    result[row.full_name] = cache;
  }
  return result;
}

export async function saveSummariesToD1(summaries) {
  const now = new Date().toISOString();
  const entries = Object.entries(summaries);

  if (entries.length === 0) {
    await d1Query("DELETE FROM summaries");
    return;
  }

  // Upsert all current entries
  let done = 0;
  for (const [fullName, cache] of entries) {
    await d1Query(
      `INSERT OR REPLACE INTO summaries (full_name, ai_intro, user_notes, intro_source, notes_source, ai_category, ai_category_desc, ai_category_ver, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        fullName,
        JSON.stringify(cache.aiIntro || {}),
        JSON.stringify(cache.userNotes || {}),
        cache._introSource || "",
        cache._notesSource || "",
        cache._aiCategory || "",
        cache._aiCategoryDesc || "",
        cache._aiCategoryVer || 0,
        now,
      ]
    );
    done++;
    if (done % 50 === 0 || done === entries.length) {
      console.log(`  D1 upsert: ${done}/${entries.length}`);
    }
  }

  // Remove stale rows no longer in summaries using SQL NOT IN
  const currentNames = entries.map(([name]) => name);
  if (currentNames.length > 0) {
    const placeholders = currentNames.map(() => "?").join(",");
    const staleRows = await d1Query(
      `SELECT full_name FROM summaries WHERE full_name NOT IN (${placeholders})`,
      currentNames
    );

    if (staleRows.length > 0) {
      const BATCH = 50;
      for (let i = 0; i < staleRows.length; i += BATCH) {
        const batch = staleRows.slice(i, i + BATCH);
        const batchPlaceholders = batch.map(() => "?").join(",");
        await d1Query(
          `DELETE FROM summaries WHERE full_name IN (${batchPlaceholders})`,
          batch.map((r) => r.full_name)
        );
      }
      console.log(`  D1 pruned ${staleRows.length} stale row(s)`);
    }
  }
}
