import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { loadEnv } from "./load-env.mjs";
import { ensureTables, clearSummaries, clearCategoryColumns, saveSummariesToD1, loadSummariesFromD1 } from "./d1-client.mjs";

loadEnv();

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const SUMMARIES_FILE = resolve(ROOT, "content/summaries.json");

async function main() {
  const seed = process.argv.includes("--seed");
  const clear = process.argv.includes("--clear");
  const clearCategories = process.argv.includes("--clear-categories");

  console.log("Creating D1 tables...");
  await ensureTables();
  console.log("Tables ready.");

  if (clearCategories) {
    console.log("Clearing category columns from D1...");
    await clearCategoryColumns();
    console.log("D1 category columns cleared.");
    return;
  }

  if (clear) {
    console.log("Clearing all summaries from D1...");
    await clearSummaries();
    console.log("D1 summaries cleared.");
    return;
  }

  if (seed) {
    if (!existsSync(SUMMARIES_FILE)) {
      console.error(`Seed file not found: ${SUMMARIES_FILE}`);
      process.exit(1);
    }

    const raw = JSON.parse(readFileSync(SUMMARIES_FILE, "utf-8"));
    const count = Object.keys(raw).length;
    console.log(`Seeding ${count} summaries from local file...`);
    await saveSummariesToD1(raw);
    console.log("Seed complete.");

    // Verify
    const verify = await loadSummariesFromD1();
    console.log(`Verified: ${Object.keys(verify).length} rows in D1.`);
  } else {
    // Just report current state
    const existing = await loadSummariesFromD1();
    const count = Object.keys(existing).length;
    console.log(`D1 has ${count} summary rows.`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
