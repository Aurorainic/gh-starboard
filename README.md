# GH-STARBOARD

> Turn your GitHub stars into a browsable, searchable, bilingual notes page.

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

## Quick Start

```bash
cp .env.example .env.local
# Edit .env.local: set GH_TOKEN and GH_USERNAME
pnpm install
pnpm run all
pnpm dev
```

Open `http://localhost:5173` — your stars are ready to browse.

> **Prerequisites**: Node.js 22+ and pnpm. A [GitHub personal access token](https://github.com/settings/tokens) (no special scopes needed).

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

Build a static site and host it anywhere:

```bash
pnpm build        # outputs to dist/
```

The project includes a [GitHub Actions workflow](.github/workflows/deploy.yml) that fetches data, builds, and deploys to GitHub Pages on push to `main` (or daily schedule). The same `dist/` folder can be deployed to any static hosting provider.

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

Results are cached in `content/summaries.json` — only new repos trigger API calls. Un-starred repos are auto-pruned from cache. Set `AI_ENABLED=off` to skip AI entirely and fall back to GitHub descriptions.

## Data Pipeline

```
fetch-stars.mjs  ──►  public/data/stars.json
                           │
build-data.mjs            │
├── Parse content/stars.md (categories + notes)
├── Read content/summaries.json (AI cache)
├── For missing repos: call AI provider (intro + translation)
├── Prune un-starred repos from cache
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

## Tech Stack

React 18 + TypeScript + Vite + Tailwind CSS v3 + shadcn/ui + react-markdown + remark-gfm

## License

MIT
