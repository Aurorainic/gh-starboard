import { loadEnv } from "./load-env.mjs";

loadEnv();

const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const DATABASE_ID = process.env.D1_DATABASE_ID;

const BASE_URL = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}/query`;

async function d1Query(sql, params = []) {
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
      full_name      TEXT PRIMARY KEY,
      ai_intro       TEXT NOT NULL DEFAULT '{}',
      user_notes     TEXT NOT NULL DEFAULT '{}',
      intro_source   TEXT NOT NULL DEFAULT '',
      notes_source   TEXT NOT NULL DEFAULT '',
      updated_at     TEXT NOT NULL
    )
  `);
}

export async function loadSummariesFromD1() {
  const rows = await d1Query(
    "SELECT full_name, ai_intro, user_notes, intro_source, notes_source FROM summaries"
  );
  const result = {};
  for (const row of rows) {
    result[row.full_name] = {
      aiIntro: JSON.parse(row.ai_intro),
      userNotes: JSON.parse(row.user_notes),
      _introSource: row.intro_source,
      _notesSource: row.notes_source,
    };
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
      `INSERT OR REPLACE INTO summaries (full_name, ai_intro, user_notes, intro_source, notes_source, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        fullName,
        JSON.stringify(cache.aiIntro || {}),
        JSON.stringify(cache.userNotes || {}),
        cache._introSource || "",
        cache._notesSource || "",
        now,
      ]
    );
    done++;
    if (done % 50 === 0 || done === entries.length) {
      console.log(`  D1 upsert: ${done}/${entries.length}`);
    }
  }

  // Remove stale rows no longer in summaries
  const placeholders = entries.map(() => "?").join(",");
  const stale = await d1Query(
    `SELECT full_name FROM summaries WHERE full_name NOT IN (${placeholders})`,
    entries.map(([name]) => name)
  );
  if (stale.length > 0) {
    for (const row of stale) {
      await d1Query("DELETE FROM summaries WHERE full_name = ?", [row.full_name]);
    }
    console.log(`  D1 pruned ${stale.length} stale row(s)`);
  }
}
