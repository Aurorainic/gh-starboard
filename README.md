# GH-STARBOARD
[![Netlify Status](https://api.netlify.com/api/v1/badges/609c442f-67f1-41c2-89fc-3a947a6b225e/deploy-status)](https://app.netlify.com/projects/gh-starboard-dev/deploys)
> Turn your GitHub stars into a browsable, searchable, notes page.

> [!IMPORTANT]
> **All Code Made by Generative AI**

> [!NOTE]
> This project is currently in the early stages of development.

**English** | [简体中文](README_zh-CN.md) | [Live Demo](https://aurorainic.github.io/gh-starboard/)

## Quick overview

- Purpose: Build a static, multi-language site from your GitHub stars with handwritten Markdown notes and optional AI-generated summaries.
- Data source: GitHub Stars (fetched via API) + `content/stars.md` for user notes
- Output: Static site in `dist/` (deployable to GitHub Pages, Netlify, Vercel, etc.)

## Table of contents

- [GH-STARBOARD](#gh-starboard)
  - [Quick overview](#quick-overview)
  - [Table of contents](#table-of-contents)
  - [Features](#features)
  - [Quick start](#quick-start)
    - [Local development](#local-development)
  - [Daily usage](#daily-usage)
  - [Customization](#customization)
    - [Site title \& languages](#site-title--languages)
    - [Content structure](#content-structure)
  - [Deploy](#deploy)
    - [GitHub Pages](#github-pages)
    - [Other platforms (Netlify example)](#other-platforms-netlify-example)
  - [Configuration reference](#configuration-reference)
  - [AI provider](#ai-provider)
    - [D1 external cache (recommended)](#d1-external-cache-recommended)
  - [Data pipeline](#data-pipeline)
  - [Commands](#commands)
  - [Tech stack](#tech-stack)
  - [Contributing](#contributing)
  - [License](#license)

## Features

- **Markdown Notes** — Write personal notes for starred repos in `content/stars.md`, organized by categories
- **AI Auto Intro** — AI generates concise summaries for each repo in your preferred language, cached incrementally
- **AI Smart Categorization** — Optionally auto-categorize uncategorized repos using AI (`AI_AUTO_CATEGORY=on`), with incremental updates on new/changed repos
- **AI UI Translation** — Build-time AI translation of UI texts for non-English/Chinese languages, stored in data layer
- **Smart Search** — Search by name, description, notes, or use `topic:` prefix for exact tag filtering. 300ms debounce
- **Advanced Filters** — Filter by language (multi-select), star count range (dual-thumb slider), with active filter badges
- **Sorting** — Sort by star order, star count, last updated, or name
- **Clickable Tags** — Click any topic badge to filter repos by that tag. Topics truncate at 5 with "+N more" expansion
- **Archived Detection** — Yellow "Archived" badge on repos marked as archived by their owner
- **Stale Repo Indicator** — Update time color-coded: yellow for 6+ months, red for 1+ year
- **Multi-language** — English by default, support for arbitrary languages via `SITE_LANGUAGES`. AI translates notes and UI texts
- **Responsive** — 1-column on mobile, 2-column grid on desktop
- **D1 Cache** — Cloudflare D1 external cache for AI summaries (recommended), survives CI workspace resets. Falls back to local file if not configured
- **Category Pagination** — Paginates by category groups, never splits a category across pages. Direct page-jump input
- **Three-mode Theme** — Auto (system), dark, light. Anti-flash script in `index.html`

## Quick start

1. **Fork** this repository
2. **Enable GitHub Actions** in your fork (Settings → Actions → Allow all actions)
3. **Set repository secrets** (Settings → Secrets and variables → Actions) — see [Configuration Reference](#configuration-reference) for the full list. At minimum:
   - `GH_TOKEN` — [GitHub personal access token](https://github.com/settings/tokens)
   - `GH_USERNAME` — your GitHub username
4. **Trigger the workflow** manually (Actions → Build & Deploy → Run workflow), or push to `main`

The site will be deployed to GitHub Pages automatically. For other platforms (Cloudflare Pages, Vercel, Netlify, etc.), import your fork and set the same environment variables.

### Local development

```bash
cp .env.example .env.local
# Edit .env.local: set GH_TOKEN and GH_USERNAME
pnpm install
pnpm run all
pnpm dev
```

Open `http://localhost:5173` — your stars are ready to browse.

> **Prerequisites**: Node.js 24+ and pnpm.

## Daily usage

Edit `content/stars.md` to organize repos and write notes:

```markdown
# Machine Learning

## [owner/repo](https://github.com/owner/repo)
Your notes here. Supports **Markdown** syntax.

## [owner/repo2](https://github.com/owner/repo2)
Another repo with multi-paragraph notes.
```

- **H1** (`#`) — category name, rendered as section header and sidebar navigation
- **H2** (`##`) — repo entry, must include `[owner/repo](url)` link
- **Body** — personal notes (Markdown). Automatically translated to other languages via AI

Run `pnpm run all` after editing to rebuild the dataset.

## Customization

### Site title & languages

Edit `.env.local`:

```bash
# Comma-separated language codes. First is default. "en" is always the base language.
SITE_LANGUAGES=en

# Custom titles (JSON, keyed by language code). Leave empty for defaults.
SITE_TITLE={"en":"My Stars","zh-CN":"我的星标"}
SITE_SUBTITLE={"en":"Bookmark & Note","zh-CN":"收藏即笔记"}

# Toggle AI features
AI_ENABLED=on

# Auto-categorize uncategorized repos via AI (default: off)
AI_AUTO_CATEGORY=on

# Custom footer project URL (optional)
PROJECT_URL=https://github.com/your-user/your-repo
```

### Content structure

The app auto-detects languages from `SITE_LANGUAGES`. For each language:
- **AI intro** is generated for every repo
- **Your notes** are stored raw for `zh-CN` (assumed to be your writing language) and auto-translated to all other languages
- **UI texts** are auto-translated for non-English/Chinese languages at build time

## Deploy

Build the complete data + frontend in one pass:

```bash
pnpm run all      # fetch stars → AI generate → vite build → dist/
```

The `dist/` folder is a static site — deploy to any hosting provider.

### GitHub Pages

A [GitHub Actions workflow](.github/workflows/deploy.yml) is included for automated builds (push to `main`, daily schedule, or manual trigger). Set the required secrets in your repository settings.

A [PR check workflow](.github/workflows/check.yml) runs typecheck + build on pull requests to `main`.

### Other platforms (Netlify example)

<details>
<summary>Configuration</summary>

| Setting | Value |
|---------|-------|
| Build command | `pnpm run all` |
| Publish directory | `dist` |

> **Important**: Use `pnpm run all` (not `pnpm run build`) as the build command — it runs the full data pipeline (fetch stars + AI generate) before building the frontend. Also set `GH_TOKEN` and `GH_USERNAME` in Site settings > Environment variables.

</details>

## Configuration reference

| Variable | Required | Description |
|----------|----------|-------------|
| `GH_TOKEN` | Yes | GitHub personal access token |
| `GH_USERNAME` | Yes | GitHub username to fetch stars from |
| `AI_API_KEY` | No | AI API key (OpenAI-compatible) |
| `AI_API_BASE_URL` | No | API base URL (default: `https://api.openai.com/v1`) |
| `AI_MODEL` | No | Model name (default: `gpt-4o-mini`) |
| `AI_ENABLED` | No | `on` / `off` (default: `on`) |
| `AI_AUTO_CATEGORY` | No | `on` / off (default: off). Auto-categorize uncategorized repos via AI |
| `SITE_LANGUAGES` | No | Comma-separated language codes (default: `en`) |
| `SITE_TITLE` | No | Custom site title, JSON keyed by language code |
| `SITE_SUBTITLE` | No | Custom site subtitle, JSON keyed by language code |
| `PROJECT_URL` | No | Custom footer project URL |
| `REFRESH_DAYS` | No | Scheduled refresh interval in days (default: 1). Repository variable |
| `CLOUDFLARE_API_TOKEN` | Recommended | Cloudflare API token for D1 external cache |
| `CLOUDFLARE_ACCOUNT_ID` | Recommended | Cloudflare account ID |
| `D1_DATABASE_ID` | Recommended | D1 database ID |

## AI provider

> [!TIP]
> AI summaries and user note translation consume API tokens; please choose a cheap model.

The built-in AI provider calls any OpenAI-compatible API. Six exported functions in `scripts/ai-provider.mjs`:

```js
export async function generateIntro(language, repoName, repoDescription)
// Generate a 50-100 word repo summary in the requested language

export async function generateIntroAndCategory(language, repoName, repoDescription, repoTopics, repoLanguage, existingCategories)
// Generate intro + category suggestion in one API call. Returns { intro, category }

export async function translateText(text, targetLanguage, sourceLanguage)
// Translate Markdown text preserving formatting

export async function suggestCategory(repoName, description, topics, language, existingCategories)
// Category suggestion fallback for repos with cached intros but missing category

export async function translateUITexts(texts, targetLanguage)
// Batch-translate UI key-value pairs, preserving {variable} placeholders

export async function healthCheck(retries)
// Verify AI provider connectivity
```

Results are cached incrementally — only new repos trigger API calls. Un-starred repos are auto-pruned from cache. Set `AI_ENABLED=off` to skip AI entirely and fall back to GitHub descriptions.

### D1 external cache (recommended)

[Cloudflare D1](https://developers.cloudflare.com/d1/) is the recommended cache backend. The build pipeline connects to D1, reads the cache, processes only new/changed repos, and writes the updated cache back. This ensures the cache persists across CI workspace resets — no need to regenerate AI summaries from scratch on every build.

Without D1, the cache falls back to a local `content/summaries.json` file, which is lost when the CI workspace is ephemeral.

<details>
<summary>Setup guide (one-time, ~5 minutes)</summary>

**1. Install Wrangler CLI**

```bash
npm install -g wrangler
wrangler login
```

**2. Create a D1 database**

```bash
wrangler d1 create gh-starboard-cache
```

Save the `database_id` from the output.

**3. Find your Account ID**

In the [Cloudflare Dashboard](https://dash.cloudflare.com), your Account ID is displayed in the right sidebar of any domain's overview page.

**4. Create an API Token**

Go to [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens) → Create Token → custom token with `D1:Edit` permission for your account.

**5. Set environment variables**

Add `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `D1_DATABASE_ID` to `.env.local` or hosting platform secrets.

**6. Initialize and seed**

```bash
pnpm run d1-migrate    # Create tables
pnpm run d1-seed       # Import existing summaries.json (if any)
```

Done. Subsequent `pnpm run all` builds will use D1 automatically.

</details>

## Data pipeline

```
fetch-stars.mjs  ──►  public/data/stars.json
                           │
build-data.mjs            │
├── Parse content/stars.md (categories + notes)
├── Read AI cache ← D1 external / summaries.json (fallback)
├── For missing repos: generate intro + category in one AI call
├── For cached repos missing category: suggestCategory fallback
├── AI translate UI texts for non-en/zh-CN languages
├── Prune un-starred repos from cache
├── Write AI cache → D1 / summaries.json
└── Merge  ──►  public/data/merged.json
                           │
                     vite build  ──►  dist/
```

## Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server (localhost:5173) |
| `pnpm build` | TypeScript check + production build |
| `pnpm typecheck` | TypeScript check only |
| `pnpm test` | Run Vitest tests |
| `pnpm run fetch-stars` | Fetch latest stars from GitHub API |
| `pnpm run build-data` | Parse notes + AI generate + merge |
| `pnpm run all` | fetch → build-data → build in one pass |
| `pnpm run d1-migrate` | Initialize D1 tables |
| `pnpm run d1-seed` | Seed D1 from local summaries.json (one-time) |

## Tech stack

| Layer | Choice |
|-------|--------|
| Framework | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS v3 + shadcn/ui (New York) |
| Rendering | react-markdown + remark-gfm |
| i18n | Custom lightweight Context + AI dynamic translation |
| AI | OpenAI-compatible API (DeepSeek, etc.) |
| Theme | auto / dark / light with anti-flash |
| Cache | Cloudflare D1 (build-time external) / local file (fallback) |
| Testing | Vitest + @testing-library/react |
| Deploy | GitHub Pages + GitHub Actions (push / daily / manual) |

## Contributing

- Issues and PRs are welcome. Keep changes focused and include a short description of intent.
- When updating docs, keep English and Chinese versions aligned.

## License

MIT
