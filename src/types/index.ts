export interface StarEntry {
  fullName: string;
  htmlUrl: string;
  description: string;
  language: string;
  topics: string[];
  stargazersCount: number;
  pushedAt: string;
  category: string;
  aiIntroZh: string;
  aiIntroEn: string;
  userNotesZh: string;
  userNotesEn: string;
}

export interface SiteConfig {
  titleZh: string;
  titleEn: string;
  subtitleZh: string;
  subtitleEn: string;
}

export interface MergedData {
  categories: string[];
  entries: StarEntry[];
  totalStars: number;
  lastUpdated: string;
  siteConfig: SiteConfig;
}

export type Language = "zh" | "en";
