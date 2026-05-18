# GH-STARBOARD

> Turn your GitHub stars into a browsable, searchable, bilingual notes page — deployed on GitHub Pages.

**⚠️ All Codes made by Generative AI**

[中文说明](README_zh.md) | [Live Demo](https://aurorainic.github.io/gh-starboard/)

## Features

- **Markdown Notes** — Write personal notes for starred repos in `content/stars.md`, organized by categories
- **AI Auto Intro** — AI generates 50-100 word Chinese intros for each repo, cached incrementally
- **Smart Search** — Search by name, description, notes, or use `topic:` prefix for exact tag filtering
- **Clickable Tags** — Click any topic badge to filter repos by that tag
- **Responsive** — 1-column on mobile, 2-column grid on desktop. Text auto-truncates with ellipsis
- **Auto Deploy** — GitHub Actions (or other platforms) runs on main branch push + daily schedule + manual trigger

## Quick Start

```bash
cp .env.example .env.local
# Edit .env.local: GH_TOKEN, GH_USERNAME, and optionally AI_API_KEY
pnpm install
pnpm run fetch-stars
pnpm run build-data
pnpm dev
```

## How It Works

Daily workflow — just edit `content/stars.md`:

```markdown
# Category Name

## [owner/repo](https://github.com/owner/repo)
Your notes in Chinese. Markdown supported.
```

- **H1** (`#`) — category name
- **H2** (`##`) — repo entry, must include `[owner/repo](url)` link
- **Body** — personal notes (Markdown), auto-translated to English via AI

### Customize Title & Subtitle

Edit `content/config.json`:

```json
{
  "titleZh": "My Stars",
  "titleEn": "My Stars",
  "subtitleZh": "收藏即笔记",
  "subtitleEn": "Bookmark & Note"
}
```

Leave fields empty to use the defaults.

## Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server |
| `pnpm build` | TypeScript check + production build |
| `pnpm run fetch-stars` | Fetch latest stars from GitHub API |
| `pnpm run build-data` | Parse notes + AI generate + merge |
| `pnpm run all` | fetch → build-data → build in one pass |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GH_TOKEN` | Yes | GitHub personal access token |
| `GH_USERNAME` | Yes | GitHub username to fetch stars from |
| `AI_API_KEY` | No | AI API key (OpenAI-compatible) |
| `AI_API_BASE_URL` | No | API base URL (default: `https://api.openai.com/v1`) |
| `AI_MODEL` | No | Model name (default: `gpt-4o-mini`) |

## AI Setup

Edit `scripts/ai-provider.mjs` — two functions to implement:

```js
export async function generateIntroZh(repoName, repoDescription, readmePreview) {
  // Return 50-100 character Chinese intro
}

export async function translateToEn(text) {
  // Return English translation
}
```

The default implementation calls any OpenAI-compatible API using `AI_API_BASE_URL` + `AI_API_KEY` + `AI_MODEL`. Results are cached in `content/summaries.json` — only new repos trigger API calls. Un-starred repos are auto-pruned from cache.

## Data Pipeline

```
fetch-stars.mjs ──► public/data/stars.json
                         │
build-data.mjs           │
├── Parse content/stars.md (categories + notes)
├── Read content/summaries.json (AI cache)
├── For missing repos: call AI provider (intro + translate)
├── Prune un-starred repos from cache
└── Merge ──► public/data/merged.json
                         │
                   vite build ──► dist/
                         │
               GitHub Pages deploy
```

## Deploy

Deployed via GitHub Actions (`.github/workflows/deploy.yml`):

- **Triggers**: push to `main` / daily schedule / manual `workflow_dispatch`
- **Secrets needed**: `GH_TOKEN`, `GH_USERNAME`, `AI_API_KEY`
- **Node**: 22 (pnpm latest requirement)

Repo Settings required:
1. **Actions Secrets** — add `GH_TOKEN`, `GH_USERNAME`, `AI_API_KEY`, etc.
2. **Pages** — source: GitHub Actions

## Tech Stack

React 18 + TypeScript + Vite + Tailwind CSS v3 + shadcn/ui + react-markdown + remark-gfm

## License
CC0 1.0 Universal