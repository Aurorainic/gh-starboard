export interface StarEntry {
  fullName: string;
  htmlUrl: string;
  description: string;
  language: string;
  topics: string[];
  stargazersCount: number;
  pushedAt: string;
  archived: boolean;
  category: string;
  aiIntro: Record<string, string>;
  userNotes: Record<string, string>;
}

export interface SiteConfig {
  title: Record<string, string>;
  subtitle: Record<string, string>;
  languages: string[];
  aiEnabled: boolean;
  projectUrl: string;
}

export interface MergedData {
  categories: string[];
  entries: StarEntry[];
  totalStars: number;
  lastUpdated: string;
  siteConfig: SiteConfig;
  languages: string[];
  uiTranslations: Record<string, Record<string, string>>;
  categoryTranslations: Record<string, Record<string, string>>;
  aiCategories: string[];
}

export type Language = string;
