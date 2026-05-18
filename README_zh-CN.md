# GH-STARBOARD

> 将 GitHub Stars 转化为可浏览、可检索、带个人笔记的页面。

> [!IMPORTANT]
> **所有代码由 生成式 AI 编写**

> [!NOTE]
> 本项目目前处在早期阶段。

[English](README.md) | **简体中文** | [在线示例](https://aurorainic.github.io/gh-starboard/)

## 功能特性

- **Markdown 笔记** — 在 `content/stars.md` 中按分类为 starred 仓库写个人笔记
- **AI 自动简介** — AI 为每个仓库生成指定语言的简介，增量缓存，不重复消耗 API
- **智能搜索** — 按名称、描述、笔记搜索；支持 `topic:` 前缀精确搜索标签
- **标签筛选** — 点击任意话题 badge 即可按标签过滤仓库
- **多语言支持** — 默认英文，可添加更多语言（如中文）。AI 自动翻译笔记
- **响应式布局** — 移动端单列、桌面端双列网格
- **D1 外置缓存** — Cloudflare D1 外置缓存（推荐），CI 工作区重置后仍保留 AI 缓存。未配置时降级到本地文件

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

> **前置条件**：Node.js 22+ 和 pnpm。

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
# 语言列表，逗号分隔。第一项为默认语言。"en" 是内置基础语言
SITE_LANGUAGES=en,zh-CN

# 自定义标题（JSON 格式，按语言代码索引），留空使用默认文案
SITE_TITLE={"en":"My Stars","zh-CN":"我的星标"}
SITE_SUBTITLE={"en":"Bookmark & Note","zh-CN":"收藏即笔记"}

# AI 开关
AI_ENABLED=on
```

### 内容语言机制

系统根据 `SITE_LANGUAGES` 自动确定语言。对于每种语言：
- **AI 简介** 会为每个仓库生成对应语言版本
- **用户笔记** 假设 `zh-CN` 为原始撰写语言；其他语言由 AI 自动翻译

## 部署

一键构建数据 + 前端：

```bash
pnpm run all      # 拉取 stars → AI 生成 → vite build → dist/
```

`dist/` 是纯静态站点，可部署到任意托管平台（GitHub Pages、Cloudflare Pages、Vercel、Netlify 等）。

项目内置 [GitHub Actions 工作流](.github/workflows/deploy.yml) 支持自动化构建（push to main、每日定时、手动触发）。在仓库设置中配置所需的 Secrets 即可。

## 配置参考

| 变量 | 必填 | 说明 |
|------|------|------|
| `GH_TOKEN` | 是 | GitHub personal access token |
| `GH_USERNAME` | 是 | 要抓取的 GitHub 用户名 |
| `AI_API_KEY` | 否 | AI API Key（OpenAI 兼容接口） |
| `AI_API_BASE_URL` | 否 | API 地址（默认 `https://api.openai.com/v1`） |
| `AI_MODEL` | 否 | 模型名（默认 `gpt-4o-mini`） |
| `SITE_LANGUAGES` | 否 | 语言列表，逗号分隔（默认 `en`） |
| `SITE_TITLE` | 否 | 自定义标题，JSON 格式，按语言代码索引 |
| `SITE_SUBTITLE` | 否 | 自定义副标题，JSON 格式，按语言代码索引 |
| `AI_ENABLED` | 否 | `on` / `off`（默认 `on`） |
| `CLOUDFLARE_API_TOKEN` | 推荐 | Cloudflare API Token（D1 外置缓存） |
| `CLOUDFLARE_ACCOUNT_ID` | 推荐 | Cloudflare 账号 ID |
| `D1_DATABASE_ID` | 推荐 | D1 数据库 ID |

## AI 配置

> [!TIP]
> AI 简介与用户笔记翻译需要消耗 API Token，请选择便宜的模型。

内置 AI 提供者调用任意 OpenAI 兼容 API。可编辑 `scripts/ai-provider.mjs` 自定义：

```js
export async function generateIntro(language, repoName, repoDescription) {
  // 根据 language 返回对应语言的 50-100 字简介
}

export async function translateText(text, targetLanguage) {
  // 将中文 Markdown 文本翻译为目标语言，保留格式
}
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

输出：

```
✅ Successfully created DB 'gh-starboard-cache'

[[d1_databases]]
binding = "DB"
database_name = "gh-starboard-cache"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

记下 `database_id`，后面要用。

**3. 获取 Account ID**

在 [Cloudflare Dashboard](https://dash.cloudflare.com) 任意域名概览页的右侧栏可以看到 Account ID，是一个 32 位十六进制字符串。

**4. 创建 API Token**

前往 [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens) → 创建 Token → 使用 "Edit zone DNS" 模板或自定义 Token：

- 权限：`D1:Edit`
- 账号：选择你的账号

复制 Token（仅显示一次）。

**5. 设置环境变量**

将 `CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`、`D1_DATABASE_ID` 添加到 `.env.local`（本地开发）或托管平台 Secrets（CI/CD）。见[配置参考](#配置参考)。

**6. 初始化并迁移**

```bash
pnpm run d1-migrate    # 创建表结构
pnpm run d1-seed       # 导入已有 summaries.json（如有）
```

完成。后续 `pnpm run all` 构建会自动使用 D1。

</details>

## 数据流

```
fetch-stars.mjs  ──►  public/data/stars.json
                           │
build-data.mjs            │
├── 解析 content/stars.md（分类 + 笔记）
├── 读取 AI 缓存 ← D1 外置 / summaries.json（降级）
├── 缺失仓库：调 AI 生成简介 + 翻译
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
| `pnpm run fetch-stars` | 从 GitHub API 拉取最新 stars |
| `pnpm run build-data` | 解析笔记 + AI 生成 + 合并数据 |
| `pnpm run all` | 一键执行全流程 |
| `pnpm run d1-migrate` | 初始化 D1 表结构 |
| `pnpm run d1-seed` | 从本地 summaries.json 迁移到 D1（一次性） |

## 技术栈

React 18 + TypeScript + Vite + Tailwind CSS v3 + shadcn/ui + react-markdown + remark-gfm

## License

MIT
