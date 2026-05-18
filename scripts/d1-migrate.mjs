import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { loadEnv } from "./load-env.mjs";
import { ensureTables, saveSummariesToD1, loadSummariesFromD1 } from "./d1-client.mjs";

loadEnv();

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const SUMMARIES_FILE = resolve(ROOT, "content/summaries.json");

async function main() {
  const seed = process.argv.includes("--seed");

  console.log("Creating D1 tables...");
  await ensureTables();
  console.log("Tables ready.");

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
