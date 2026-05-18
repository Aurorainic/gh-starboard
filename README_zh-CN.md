# GH-STARBOARD

> 将 GitHub Stars 转化为可浏览、可检索、带个人笔记的双语页面。

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

## 快速开始

```bash
cp .env.example .env.local
# 编辑 .env.local：填入 GH_TOKEN 和 GH_USERNAME
pnpm install
pnpm run all
pnpm dev
```

打开 `http://localhost:5173` 即可浏览你的 star 数据。

> **前置条件**：Node.js 22+ 和 pnpm。需要 [GitHub personal access token](https://github.com/settings/tokens)（无需特殊权限）。

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

构建为静态网站，可部署到任意平台：

```bash
pnpm build        # 输出到 dist/
```

项目内置 [GitHub Actions 工作流](.github/workflows/deploy.yml)，在 push 到 main 时自动拉取数据、构建并部署到 GitHub Pages（也支持每日定时和手动触发）。`dist/` 目录同样可部署到任何静态托管服务。

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

结果缓存在 `content/summaries.json`，仅对新增仓库调用 AI。取消 star 的仓库自动从缓存中清理。设置 `AI_ENABLED=off` 可完全跳过 AI，回退显示 GitHub 原始描述。

## 数据流

```
fetch-stars.mjs  ──►  public/data/stars.json
                           │
build-data.mjs            │
├── 解析 content/stars.md（分类 + 笔记）
├── 读取 content/summaries.json（AI 缓存）
├── 缺失仓库：调 AI 生成简介 + 翻译
├── 清理已取消 star 的缓存
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

## 技术栈

React 18 + TypeScript + Vite + Tailwind CSS v3 + shadcn/ui + react-markdown + remark-gfm

## License

MIT
