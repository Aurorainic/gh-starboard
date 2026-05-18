# GH-STARBOARD

> 将 GitHub Stars 转化为可浏览、可检索、带个人笔记的中英双语页面，部署在 GitHub Pages。

**⚠️ 所有代码由 生成式 AI 编写**

[English](README.md) | [在线示例](https://aurorainic.github.io/gh-starboard/)

## 功能特性

- **Markdown 笔记** — 在 `content/stars.md` 中按分类为 starred 仓库写个人笔记
- **AI 自动简介** — AI 为每个仓库生成 50-100 字中文简介，增量缓存
- **智能搜索** — 按名称、描述、笔记搜索；支持 `topic:` 前缀精确搜索标签
- **标签筛选** — 点击任意话题 badge 即可按标签过滤仓库
- **响应式布局** — 移动端单列、桌面端双列网格，长文本自动省略
- **自动部署** — GitHub Actions （或其他平台）在 main 分支推送 + 每日定时 + 手动触发时运行

## 快速开始

```bash
cp .env.example .env.local
# 编辑 .env.local 填入 GH_TOKEN 和 GH_USERNAME，AI_API_KEY 按需
pnpm install
pnpm run fetch-stars
pnpm run build-data
pnpm dev
```

## 使用方法

日常只需编辑 `content/stars.md` 写笔记：

```markdown
# 分类名称

## [owner/repo](https://github.com/owner/repo)
用户中文笔记。支持 **Markdown** 语法，可以多段落、代码块等。
```

- **H1** (`#`) — 分类名
- **H2** (`##`) — 仓库条目，必须包含 `[owner/repo](url)` 链接
- **正文** — 用户笔记（Markdown），AI 自动翻译为英文

### 自定义标题

编辑 `content/config.json`：

```json
{
  "titleZh": "我的收藏夹",
  "titleEn": "My Stars",
  "subtitleZh": "收藏即笔记",
  "subtitleEn": "Bookmark & Note"
}
```

字段留空则使用默认文案。

## 常用命令

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 启动开发服务器 |
| `pnpm build` | TypeScript 检查 + 生产构建 |
| `pnpm run fetch-stars` | 手动拉取最新 stars 数据 |
| `pnpm run build-data` | 解析笔记 + AI 生成简介 + 合并数据 |
| `pnpm run all` | 一键执行全流程 |

## 环境变量

| 变量 | 必填 | 说明 |
|------|------|------|
| `GH_TOKEN` | 是 | GitHub personal access token |
| `GH_USERNAME` | 是 | 要抓取的 GitHub 用户名 |
| `AI_API_KEY` | 否 | AI API Key（OpenAI 兼容接口） |
| `AI_API_BASE_URL` | 否 | API 地址（默认 `https://api.openai.com/v1`） |
| `AI_MODEL` | 否 | 模型名（默认 `gpt-4o-mini`） |

## AI 配置

编辑 `scripts/ai-provider.mjs`，实现两个函数即可接入任意 AI 服务：

```js
export async function generateIntroZh(repoName, repoDescription, readmePreview) {
  // 返回 50-100 字中文简介
}

export async function translateToEn(text) {
  // 返回英文翻译
}
```

默认实现通过 `AI_API_BASE_URL` + `AI_API_KEY` + `AI_MODEL` 调用任意 OpenAI 兼容 API。结果缓存在 `content/summaries.json`，仅对新增仓库调 AI。取消 star 的仓库会自动从缓存中清理。

## 数据流

```
fetch-stars.mjs ──► public/data/stars.json
                         │
build-data.mjs           │
├── 解析 content/stars.md（分类 + 笔记）
├── 读取 content/summaries.json（AI 缓存）
├── 缺失仓库：调 AI 生成简介 + 翻译
├── 清理已取消 star 的缓存
└── 合并 ──► public/data/merged.json
                         │
                   vite build ──► dist/
                         │
               GitHub Pages 部署
```

## 部署

通过 GitHub Actions（`.github/workflows/deploy.yml`）部署：

- **触发**：main 分支推送 / 每日定时 / 手动 workflow_dispatch
- **Secrets**：`GH_TOKEN`、`GH_USERNAME`、`AI_API_KEY`
- **Node.js**：22（pnpm latest 要求）

仓库 Settings 配置：
1. **Actions Secrets** — 添加 `GH_TOKEN`、`GH_USERNAME`、`AI_API_KEY` 等
2. **Pages** — Source 选择 GitHub Actions

## 技术栈

React 18 + TypeScript + Vite + Tailwind CSS v3 + shadcn/ui + react-markdown + remark-gfm

## License
CC0 1.0 Universal