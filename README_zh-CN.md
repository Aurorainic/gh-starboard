# GH-STARBOARD
[![Netlify Status](https://api.netlify.com/api/v1/badges/609c442f-67f1-41c2-89fc-3a947a6b225e/deploy-status)](https://app.netlify.com/projects/gh-starboard-dev/deploys)
> 将 GitHub Stars 转化为可浏览、可检索、带个人笔记的页面。

> [!IMPORTANT]
> **所有代码由生成式 AI 编写**

> [!NOTE]
> 本项目目前处在早期阶段。

[English](README.md) | **简体中文** | [在线示例](https://aurorainic.github.io/gh-starboard/)

## 快速概览

- 目的：从 GitHub Stars 构建静态多语言站点，支持自定义 Markdown 笔记与可选 AI 自动简介。
- 数据来源：GitHub Stars（API 拉取） + `content/stars.md` 中的用户笔记
- 输出：`dist/`（静态站，可部署到 GitHub Pages、Netlify、Vercel 等）

## 目录

- [GH-STARBOARD](#gh-starboard)
  - [快速概览](#快速概览)
  - [目录](#目录)
  - [功能亮点](#功能亮点)
  - [快速开始](#快速开始)
    - [本地开发](#本地开发)
  - [日常使用](#日常使用)
  - [自定义配置](#自定义配置)
    - [站点标题与语言](#站点标题与语言)
    - [内容结构](#内容结构)
  - [部署](#部署)
    - [GitHub Pages](#github-pages)
    - [其他平台（以 Netlify 为例）](#其他平台以-netlify-为例)
  - [配置参考](#配置参考)
  - [AI 配置](#ai-配置)
    - [D1 外置缓存（推荐）](#d1-外置缓存推荐)
  - [数据管道](#数据管道)
  - [常用命令](#常用命令)
  - [技术栈](#技术栈)
  - [贡献与许可](#贡献与许可)
  - [致谢](#致谢)

## 功能亮点

- **Markdown 笔记** — 在 `content/stars.md` 中按分类为 starred 仓库写个人笔记
- **AI 自动简介** — AI 为每个仓库生成指定语言的简介，增量缓存，不重复消耗 API
- **AI 智能分类** — 可选自动分类未归类仓库（`AI_AUTO_CATEGORY=on`），增量更新新增/变更仓库
- **AI UI 翻译** — 构建时 AI 翻译非英文/中文的 UI 文案，存储在数据层
- **智能搜索** — 按名称、描述、笔记搜索；支持 `topic:` 前缀精确搜索标签。300ms 防抖
- **高级过滤** — 按语言（多选）、星数范围（双滑块）过滤，活跃过滤条件显示为 badge
- **排序** — 按收藏顺序、星数、最近更新、名称排序
- **标签可点击** — 点击任意话题 badge 即可按标签过滤。话题超过 5 个时截断，显示 "+N more" 展开按钮
- **归档检测** — 仓库被作者标记为 archived 时显示黄色 "Archived" 徽章
- **过期仓库提示** — 更新时间按颜色区分：黄色为 6 个月以上，红色为 1 年以上
- **多语言支持** — 默认英文，通过 `SITE_LANGUAGES` 支持任意语言。AI 自动翻译笔记和 UI 文案
- **响应式布局** — 移动端单列、桌面端双列网格
- **D1 外置缓存** — Cloudflare D1 外置缓存（推荐），CI 工作区重置后仍保留 AI 缓存。未配置时降级到本地文件
- **分类分页** — 按分类组分页，不会拆分分类跨页显示。支持直接输入页码跳转
- **三模式主题** — Auto（跟随系统）、Dark、Light。`index.html` 内嵌防闪烁脚本

## 快速开始

1. **Fork** 本仓库
2. **启用 GitHub Actions**（Settings → Actions → Allow all actions）
3. **设置仓库 Secrets**（Settings → Secrets and variables → Actions）— 完整变量列表见[配置参考](#配置参考)。最低要求：
   - `GH_TOKEN` — [GitHub personal access token](https://github.com/settings/tokens)
   - `GH_USERNAME` — 你的 GitHub 用户名
4. **手动触发工作流**（Actions → Build & Deploy → Run workflow），或 push 到 `main`

站点将自动部署到 GitHub Pages。其他平台（Cloudflare Pages、Vercel、Netlify 等）导入 fork 仓库并设置相同的环境变量即可。

### 本地开发

```bash
cp .env.example .env.local
# 编辑 .env.local：填入 GH_TOKEN 和 GH_USERNAME
pnpm install
pnpm run all
pnpm dev
```

打开 `http://localhost:5173` 即可浏览你的 star 数据。

> **前置条件**：Node.js 24+ 和 pnpm。

## 日常使用

编辑 `content/stars.md` 来分类仓库和写笔记：

```markdown
# 机器学习

## [owner/repo](https://github.com/owner/repo)
你的笔记内容，支持 **Markdown** 语法。

## [owner/repo2](https://github.com/owner/repo2)
另一个仓库的笔记，可以多段落。
```

- **H1** (`#`) — 分类名，前端渲染为区块标题，侧边栏为导航项
- **H2** (`##`) — 仓库条目，必须包含 `[owner/repo](url)` 链接
- **正文** — 用户笔记（Markdown），AI 自动翻译到其他语言

编辑后执行 `pnpm run all` 重新构建数据。

## 自定义配置

### 站点标题与语言

编辑 `.env.local`：

```bash
# 语言列表，逗号分隔。第一项为默认语言。"en" 是内置基础语言。
# 如果不需要多语言，只保留你需要的那个即可——每多一种语言都会触发额外的 AI 调用，增加构建时间和成本。
SITE_LANGUAGES=en,zh-CN

# 自定义标题（JSON 格式，按语言代码索引），留空使用默认文案
SITE_TITLE={"en":"My Stars","zh-CN":"我的星标"}
SITE_SUBTITLE={"en":"Bookmark & Note","zh-CN":"收藏即笔记"}

# AI 开关
AI_ENABLED=on

# AI 自动分类未归类仓库（默认关闭）
AI_AUTO_CATEGORY=on

# 自定义页脚项目链接（可选）
PROJECT_URL=https://github.com/your-user/your-repo
```

### 内容结构

系统根据 `SITE_LANGUAGES` 自动确定语言。对于每种语言：
- **AI 简介** 会为每个仓库生成对应语言版本
- **用户笔记** 假设 `zh-CN` 为原始撰写语言；其他语言由 AI 自动翻译
- **UI 文案** 对非英文/中文的语言在构建时由 AI 自动翻译

## 部署

一键构建数据 + 前端：

```bash
pnpm run all      # 拉取 stars → AI 生成 → vite build → dist/
```

`dist/` 是纯静态站点，可部署到任意托管平台。

### GitHub Pages

项目内置 [GitHub Actions 工作流](.github/workflows/deploy.yml) 支持自动化构建（push to main、每日定时、手动触发）。在仓库设置中配置所需的 Secrets 即可。

另有 [PR 检查工作流](.github/workflows/check.yml) 在 PR 到 `main` 时运行 typecheck + build。

### 其他平台（以 Netlify 为例）

<details>
<summary>配置</summary>

| 设置项 | 值 |
|--------|-----|
| Build command | `pnpm run all` |
| Publish directory | `dist` |

> **注意**：Build command 必须填 `pnpm run all`（而非 `pnpm run build`），它会先执行完整的数据管道（拉取 stars + AI 生成）再构建前端。同时在 Site settings > Environment variables 中设置 `GH_TOKEN` 和 `GH_USERNAME`。

</details>

## 配置参考

| 变量 | 必填 | 说明 |
|------|------|------|
| `GH_TOKEN` | 是 | GitHub personal access token |
| `GH_USERNAME` | 是 | 要抓取的 GitHub 用户名 |
| `AI_API_KEY` | 否 | AI API Key（OpenAI 兼容接口） |
| `AI_API_BASE_URL` | 否 | API 地址（默认 `https://api.openai.com/v1`） |
| `AI_MODEL` | 否 | 模型名（默认 `gpt-4o-mini`） |
| `AI_ENABLED` | 否 | `on` / `off`（默认 `on`） |
| `AI_AUTO_CATEGORY` | 否 | `on` / off（默认 off）。AI 自动分类未归类仓库 |
| `SITE_LANGUAGES` | 否 | 语言列表，逗号分隔（默认 `en`）。不需要多语言时只保留需要的，避免额外 AI 开销 |
| `SITE_TITLE` | 否 | 自定义标题，JSON 格式，按语言代码索引 |
| `SITE_SUBTITLE` | 否 | 自定义副标题，JSON 格式，按语言代码索引 |
| `PROJECT_URL` | 否 | 自定义页脚项目链接 |
| `REFRESH_DAYS` | 否 | 定时刷新间隔天数（默认 1）。仓库级变量 |
| `CLOUDFLARE_API_TOKEN` | 推荐 | Cloudflare API Token（D1 外置缓存） |
| `CLOUDFLARE_ACCOUNT_ID` | 推荐 | Cloudflare 账号 ID |
| `D1_DATABASE_ID` | 推荐 | D1 数据库 ID |

## AI 配置

> [!TIP]
> AI 简介与用户笔记翻译需要消耗 API Token，请选择便宜的模型。

内置 AI 提供者调用任意 OpenAI 兼容 API。`scripts/ai-provider.mjs` 导出 6 个函数：

```js
export async function generateIntro(language, repoName, repoDescription)
// 生成 50-100 字的仓库简介，语言为指定 language

export async function generateIntroAndCategory(language, repoName, repoDescription, repoTopics, repoLanguage, existingCategories)
// 一次调用同时生成简介 + 分类建议，减少 API 调用。返回 { intro, category }

export async function translateText(text, targetLanguage, sourceLanguage)
// 翻译 Markdown 文本到目标语言，保留格式

export async function suggestCategory(repoName, description, topics, language, existingCategories)
// AI 分类建议（兜底用，主要用于已有简介但缺分类的仓库）

export async function translateUITexts(texts, targetLanguage)
// 批量翻译 UI 键值对，保留 {variable} 占位符

export async function healthCheck(retries)
// 检查 AI 提供者连通性
```

结果增量缓存，仅对新增仓库调用 AI。取消 star 的仓库自动从缓存中清理。设置 `AI_ENABLED=off` 可完全跳过 AI，回退显示 GitHub 原始描述。

### D1 外置缓存（推荐）

[Cloudflare D1](https://developers.cloudflare.com/d1/) 是推荐的缓存后端。构建时连接 D1 → 拉取缓存 → 仅处理新增/变更的仓库 → 回写缓存。确保缓存在 CI 工作区重置后不丢失，无需每次重新生成 AI 简介。

未配置 D1 时，降级到本地 `content/summaries.json` 文件（CI 工作区临时的情况下会丢失）。

<details>
<summary>配置指南（一次性，约 5 分钟）</summary>

**1. 安装 Wrangler CLI**

```bash
npm install -g wrangler
wrangler login
```

**2. 创建 D1 数据库**

```bash
wrangler d1 create gh-starboard-cache
```

记下输出中的 `database_id`。

**3. 获取 Account ID**

在 [Cloudflare Dashboard](https://dash.cloudflare.com) 任意域名概览页的右侧栏可以看到 Account ID。

**4. 创建 API Token**

前往 [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens) → 创建 Token → 自定义 Token，权限选择 `D1:Edit`，账号选择你的账号。

**5. 设置环境变量**

将 `CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`、`D1_DATABASE_ID` 添加到 `.env.local`（本地开发）或托管平台 Secrets（CI/CD）。

**6. 初始化并迁移**

```bash
pnpm run d1-migrate    # 创建表结构
pnpm run d1-seed       # 导入已有 summaries.json（如有）
```

完成。后续 `pnpm run all` 构建会自动使用 D1。

</details>

## 数据管道

```
fetch-stars.mjs  ──►  public/data/stars.json
                           │
build-data.mjs            │
├── 解析 content/stars.md（分类 + 笔记）
├── 读取 AI 缓存 ← D1 外置 / summaries.json（降级）
├── 缺失仓库：一次 AI 调用同时生成简介 + 分类
├── 已有简介但缺分类的仓库：suggestCategory 兜底补分类
├── AI 翻译非 en/zh-CN 的 UI 文案
├── 清理已取消 star 的缓存
├── 写回缓存 → D1 / summaries.json
└── 合并  ──►  public/data/merged.json
                           │
                     vite build  ──►  dist/
```

## 常用命令

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 启动开发服务器（localhost:5173） |
| `pnpm build` | TypeScript 检查 + 生产构建 |
| `pnpm typecheck` | 仅 TypeScript 检查 |
| `pnpm test` | 运行 Vitest 测试 |
| `pnpm run fetch-stars` | 从 GitHub API 拉取最新 stars |
| `pnpm run build-data` | 解析笔记 + AI 生成 + 合并数据 |
| `pnpm run all` | 一键执行全流程 |
| `pnpm run d1-migrate` | 初始化 D1 表结构 |
| `pnpm run d1-seed` | 从本地 summaries.json 迁移到 D1（一次性） |

## 技术栈

| 层 | 选型 |
|----|------|
| 框架 | React 18 + TypeScript + Vite |
| 样式 | Tailwind CSS v3 + shadcn/ui (New York) |
| 渲染 | react-markdown + remark-gfm |
| 国际化 | 自建轻量 Context + AI 动态翻译 |
| AI | OpenAI 兼容接口（DeepSeek 等） |
| 主题 | auto / dark / light 三模式，防闪烁 |
| 缓存 | Cloudflare D1（构建时外置） / 本地文件（降级） |
| 测试 | Vitest + @testing-library/react |
| 部署 | GitHub Pages + GitHub Actions（push / 定时 / 手动） |

## 贡献与许可

- 欢迎通过 Issues 和 PR 贡献。提交更改时请保持变更聚焦并简述目的。
- 更新文档时请同步维护中英文两份。

## 致谢

界面设计参考 [selfh.st.](https://selfh.st/apps/)

MIT
