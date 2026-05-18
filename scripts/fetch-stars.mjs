import { writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { loadEnv } from "./load-env.mjs";

loadEnv();

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT = resolve(__dirname, "../public/data/stars.json");

const GH_TOKEN = process.env.GH_TOKEN;
const GH_USERNAME = process.env.GH_USERNAME;

if (!GH_TOKEN || !GH_USERNAME) {
  console.error("Missing GH_TOKEN or GH_USERNAME");
  process.exit(1);
}

const API = "https://api.github.com";
const PER_PAGE = 100;

async function fetchPage(page) {
  const url = `${API}/users/${GH_USERNAME}/starred?per_page=${PER_PAGE}&page=${page}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `token ${GH_TOKEN}`,
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "gh-starboard",
    },
  });
  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

async function fetchAllStars() {
  let page = 1;
  let allStars = [];

  while (true) {
    console.log(`Fetching page ${page}...`);
    const stars = await fetchPage(page);
    if (stars.length === 0) break;
    allStars = allStars.concat(
      stars.map((repo) => ({
        fullName: repo.full_name,
        htmlUrl: repo.html_url,
        description: repo.description ?? "",
        language: repo.language ?? "",
        topics: repo.topics ?? [],
        stargazersCount: repo.stargazers_count ?? 0,
        pushedAt: repo.pushed_at,
      }))
    );
    if (stars.length < PER_PAGE) break;
    page++;
  }

  console.log(`Fetched ${allStars.length} stars total`);
  return allStars;
}

const stars = await fetchAllStars();
mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, JSON.stringify(stars, null, 2), "utf-8");
console.log(`Written to ${OUTPUT}`);
