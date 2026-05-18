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

  await d1Query("DELETE FROM summaries");

  const entries = Object.entries(summaries);
  if (entries.length === 0) return;

  const queries = entries.map(([fullName, cache]) => ({
    sql: `INSERT INTO summaries (full_name, ai_intro, user_notes, intro_source, notes_source, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)`,
    params: [
      fullName,
      JSON.stringify(cache.aiIntro || {}),
      JSON.stringify(cache.userNotes || {}),
      cache._introSource || "",
      cache._notesSource || "",
      now,
    ],
  }));

  let done = 0;
  for (const q of queries) {
    await d1Query(q.sql, q.params);
    done++;
    if (done % 50 === 0 || done === queries.length) {
      console.log(`  D1 write: ${done}/${queries.length}`);
    }
  }
}
