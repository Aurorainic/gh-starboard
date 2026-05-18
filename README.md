# GH-STARBOARD

> Turn your GitHub stars into a browsable, searchable, notes page.

> [!IMPORTANT]
> **All Codes Made by Generative AI**

> [!NOTE]
> This project is currently in the early stages of development.

**English** | [简体中文](README_zh-CN.md) | [Live Demo](https://aurorainic.github.io/gh-starboard/)

## Features

- **Markdown Notes** — Write personal notes for starred repos in `content/stars.md`, organized by categories
- **AI Auto Intro** — AI generates concise summaries for each repo in your preferred language, cached incrementally
- **Smart Search** — Search by name, description, notes, or use `topic:` prefix for exact tag filtering
- **Clickable Tags** — Click any topic badge to filter repos by that tag
- **Bilingual** — English by default, with support for additional languages (e.g. Chinese). AI translates your notes automatically
- **Responsive** — 1-column on mobile, 2-column grid on desktop
- **D1 Cache** — Cloudflare D1 external cache for AI summaries (recommended), survives CI workspace resets. Falls back to local file if not configured

## Quick Start

1. **Fork** this repository
2. **Enable GitHub Actions** in your fork (Settings → Actions → Allow all actions)
3. **Set repository secrets** (Settings → Secrets and variables → Actions) — see [Configuration Reference](#configuration-reference) for the full list. At minimum:
   - `GH_TOKEN` — [GitHub personal access token](https://github.com/settings/tokens)
   - `GH_USERNAME` — your GitHub username
4. **Trigger the workflow** manually (Actions → Build & Deploy → Run workflow), or push to `main`

The site will be deployed to GitHub Pages automatically. For other platforms (Cloudflare Pages, Vercel, Netlify, etc.), import your fork and set the same environment variables.

### Local Development

```bash
cp .env.example .env.local
# Edit .env.local: set GH_TOKEN and GH_USERNAME
pnpm install
pnpm run all
pnpm dev
```

Open `http://localhost:5173` — your stars are ready to browse.

> **Prerequisites**: Node.js 22+ and pnpm.

## Daily Usage

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

### Site Title & Languages

Edit `.env.local`:

```bash
# Comma-separated language codes. First is default. "en" is always the base language.
SITE_LANGUAGES=en,zh-CN

# Custom titles (JSON, keyed by language code). Leave empty for defaults.
SITE_TITLE={"en":"My Stars","zh-CN":"我的星标"}
SITE_SUBTITLE={"en":"Bookmark & Note","zh-CN":"收藏即笔记"}

# Toggle AI features
AI_ENABLED=on
```

### Content Structure

The app auto-detects languages from `SITE_LANGUAGES`. For each language:
- **AI intro** is generated for every repo
- **Your notes** are stored raw for `zh-CN` (assumed to be your writing language) and auto-translated to all other languages

## Deploy

Build the complete data + frontend in one pass:

```bash
pnpm run all      # fetch stars → AI generate → vite build → dist/
```

The `dist/` folder is a static site — deploy to any hosting provider (GitHub Pages, Cloudflare Pages, Vercel, Netlify, etc.).

A [GitHub Actions workflow](.github/workflows/deploy.yml) is included for automated builds (push to `main`, daily schedule, or manual trigger). Set the required secrets in your repository settings.

## Configuration Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `GH_TOKEN` | Yes | GitHub personal access token |
| `GH_USERNAME` | Yes | GitHub username to fetch stars from |
| `AI_API_KEY` | No | AI API key (OpenAI-compatible) |
| `AI_API_BASE_URL` | No | API base URL (default: `https://api.openai.com/v1`) |
| `AI_MODEL` | No | Model name (default: `gpt-4o-mini`) |
| `SITE_LANGUAGES` | No | Comma-separated language codes (default: `en`) |
| `SITE_TITLE` | No | Custom site title, JSON keyed by language code |
| `SITE_SUBTITLE` | No | Custom site subtitle, JSON keyed by language code |
| `AI_ENABLED` | No | `on` / `off` (default: `on`) |
| `CLOUDFLARE_API_TOKEN` | Recommended | Cloudflare API token for D1 external cache |
| `CLOUDFLARE_ACCOUNT_ID` | Recommended | Cloudflare account ID |
| `D1_DATABASE_ID` | Recommended | D1 database ID |

## AI Provider

> [!TIP]
> AI summaries and user note translation consume API tokens; please choose a cheap model.

The built-in AI provider calls any OpenAI-compatible API. Two functions to customize in `scripts/ai-provider.mjs`:

```js
export async function generateIntro(language, repoName, repoDescription) {
  // Return a 50-100 word summary in the requested language
}

export async function translateText(text, targetLanguage) {
  // Translate Chinese Markdown text to the target language, preserving Markdown formatting
}
```

Results are cached incrementally — only new repos trigger API calls. Un-starred repos are auto-pruned from cache. Set `AI_ENABLED=off` to skip AI entirely and fall back to GitHub descriptions.

### D1 External Cache (Recommended)

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

Output:

```
✅ Successfully created DB 'gh-starboard-cache'

[[d1_databases]]
binding = "DB"
database_name = "gh-starboard-cache"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

Save the `database_id` — you'll need it later.

**3. Find your Account ID**

In the [Cloudflare Dashboard](https://dash.cloudflare.com), your Account ID is displayed in the right sidebar of any domain's overview page. It's a 32-character hex string.

**4. Create an API Token**

Go to [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens) → Create Token → use the "Edit zone DNS" template or create a custom token with:

- Permissions: `D1:Edit`
- Account: select your account

Copy the token — it's shown only once.

**5. Set environment variables**

Add `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `D1_DATABASE_ID` to your `.env.local` (local dev) or hosting platform secrets (CI/CD). See [Configuration Reference](#configuration-reference).

**6. Initialize and seed**

```bash
pnpm run d1-migrate    # Create tables
pnpm run d1-seed       # Import existing summaries.json (if any)
```

Done. Subsequent `pnpm run all` builds will use D1 automatically.

</details>

## Data Pipeline

```
fetch-stars.mjs  ──►  public/data/stars.json
                           │
build-data.mjs            │
├── Parse content/stars.md (categories + notes)
├── Read AI cache ← D1 external / summaries.json (fallback)
├── For missing repos: call AI provider (intro + translation)
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
| `pnpm run fetch-stars` | Fetch latest stars from GitHub API |
| `pnpm run build-data` | Parse notes + AI generate + merge |
| `pnpm run all` | fetch → build-data → build in one pass |
| `pnpm run d1-migrate` | Initialize D1 tables |
| `pnpm run d1-seed` | Seed D1 from local summaries.json (one-time) |

## Tech Stack

React 18 + TypeScript + Vite + Tailwind CSS v3 + shadcn/ui + react-markdown + remark-gfm

## License

MIT
