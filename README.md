# RE-TAG-STARS

⚠️ ALL CODES BY AI

---
> 展示 GitHub Stars 的单页应用。支持 Markdown 笔记、AI 自动简介、中英文切换。部署在 GitHub Pages。

## 快速开始

```bash
cp .env.example .env.local
# 编辑 .env.local 填入 GH_TOKEN 和 GH_USERNAME
pnpm install
pnpm run fetch-stars
pnpm run build-data
pnpm dev
```

## 使用方法

日常只需编辑 `content/stars.md` 写笔记，推送后 GitHub Actions 自动拉取 stars、生成简介、翻译并部署。

### 笔记格式

```markdown
# 分类名称

## [owner/repo](https://github.com/owner/repo)
用户中文笔记。支持 **Markdown** 语法，可以多段落、代码块等。
```

- **H1** (`#`) → 分类名
- **H2** (`##`) → 仓库条目，必须包含 `[owner/repo](url)` 链接
- **正文** → 用户笔记，会被 AI 自动翻译为英文

### 常用命令

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 启动开发服务器 |
| `pnpm build` | TypeScript 检查 + 生产构建 |
| `pnpm run fetch-stars` | 手动拉取 stars 数据 |
| `pnpm run build-data` | 解析笔记 + AI 生成简介 |
| `pnpm run all` | 一键执行全流程 |

## 环境变量

| 变量 | 必填 | 说明 |
|------|------|------|
| `GH_TOKEN` | 是 | GitHub personal access token |
| `GH_USERNAME` | 是 | 要抓取的 GitHub 用户名 |
| `AI_API_KEY` | 否 | AI API Key，不提供则跳过 AI 功能 |
| `AI_API_BASE_URL` | 否 | API 地址 |
| `AI_MODEL` | 否 | 模型名 |

## AI 功能介绍

编辑 `scripts/ai-provider.mjs`，实现两个函数即可接入任意 AI 服务：

```js
export async function generateIntroZh(repoName, repoDescription, readmePreview) {
  // 返回 50-100 字中文简介
}

export async function translateToEn(text) {
  // 返回英文翻译
}
```

AI 结果缓存在 `content/summaries.json`，仅对新增仓库调用接口。

## 部署

GitHub Actions 每日自动运行，也可在 Actions 页面手动触发。部署前需在仓库 Settings 中：

1. **Secrets and variables / Actions** — 添加 `GH_TOKEN`、`GH_USERNAME`、`AI_API_KEY` 等
2. **Pages** — Source 选择 GitHub Actions

## 技术栈

React 18 + TypeScript + Vite + Tailwind CSS v3 + shadcn/ui
