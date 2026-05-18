export const DEFAULT_LANGUAGE = "en";

export const translations: Record<string, Record<string, string>> = {
  "zh-CN": {
    "app.title": "GitHub Stars 笔记展",
    "app.subtitle": "我的 GitHub Stars 收藏与笔记",
    "search.placeholder": "搜索仓库名称、简介、笔记...",
    "stats.totalStars": "共 {count} 个项目",
    "stats.categories": "{count} 个分类",
    "sidebar.toc": "目录",
    "language.switch": "English",
    "entry.stars": "{count} 星",
    "entry.language": "语言",
    "entry.topics": "主题",
    "entry.aiIntro": "AI 简介",
    "entry.description": "项目简介",
    "entry.userNotes": "我的笔记",
    "entry.updated": "更新于",
    "time.justNow": "刚刚",
    "empty.title": "没有找到匹配的仓库",
    "empty.description": "试试调整搜索词或清空筛选条件",
  },
  en: {
    "app.title": "GitHub Stars Notes",
    "app.subtitle": "My GitHub Stars Collection & Notes",
    "search.placeholder": "Search repos, descriptions, notes...",
    "stats.totalStars": "{count} Stars",
    "stats.categories": "{count} Categories",
    "sidebar.toc": "Contents",
    "language.switch": "中文",
    "entry.stars": "{count} stars",
    "entry.language": "Language",
    "entry.topics": "Topics",
    "entry.aiIntro": "AI Intro",
    "entry.description": "Description",
    "entry.userNotes": "My Notes",
    "entry.updated": "Updated",
    "time.justNow": "just now",
    "empty.title": "No matching repositories",
    "empty.description": "Try adjusting your search terms or clearing filters",
  },
};

export const LANGUAGE_LABELS: Record<string, string> = {
  "zh-CN": "中文",
  en: "English",
};

export function getLanguageLabel(code: string): string {
  if (LANGUAGE_LABELS[code]) return LANGUAGE_LABELS[code];
  try {
    const names = new Intl.DisplayNames([code], { type: "language" });
    return names.of(code) || code;
  } catch {
    try {
      const names = new Intl.DisplayNames(["en"], { type: "language" });
      return names.of(code) || code;
    } catch {
      return code;
    }
  }
}
