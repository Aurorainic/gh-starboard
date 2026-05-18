export interface StarEntry {
  fullName: string;
  htmlUrl: string;
  description: string;
  language: string;
  topics: string[];
  stargazersCount: number;
  pushedAt: string;
  category: string;
  aiIntro: Record<string, string>;
  userNotes: Record<string, string>;
}

export interface SiteConfig {
  title: Record<string, string>;
  subtitle: Record<string, string>;
  languages: string[];
  aiEnabled: boolean;
}

export interface MergedData {
  categories: string[];
  entries: StarEntry[];
  totalStars: number;
  lastUpdated: string;
  siteConfig: SiteConfig;
  languages: string[];
}

export type Language = string;
