import { useState, useEffect, useMemo, useRef } from "react";
import { type MergedData, type StarEntry, type Language } from "@/types";

const DATA_URL = "./data/merged.json";
const DEFAULT_PER_PAGE = 20;
const DEBOUNCE_MS = 300;

export type SortKey = "starred" | "stars" | "updated" | "name";

export interface Filters {
  languages: string[];
  minStars: number;
  maxStars: number;
  category: string;
}

export function useStars(language: Language) {
  const [data, setData] = useState<MergedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("starred");
  const [filters, setFilters] = useState<Filters>({ languages: [], minStars: 0, maxStars: Infinity, category: "" });
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE);
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    fetch(DATA_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => setData(json))
      .catch(() => {
        setError(true);
        setData({
          categories: [],
          entries: [],
          totalStars: 0,
          lastUpdated: "",
          siteConfig: { title: {}, subtitle: {}, languages: ["en"], aiEnabled: false, projectUrl: "" },
          languages: ["en"],
          uiTranslations: {},
          aiCategories: [],
        });
      })
      .finally(() => setLoading(false));
  }, []);

  // Debounce search
  useEffect(() => {
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, DEBOUNCE_MS);
    return () => clearTimeout(debounceTimer.current);
  }, [searchQuery]);

  const filteredEntries = useMemo(() => {
    if (!data) return [];
    const q = debouncedQuery.toLowerCase().trim();
    let result = data.entries;

    // Search filter
    if (q) {
      if (q.startsWith("topic:")) {
        const topicQ = q.slice(6).trim();
        if (topicQ) {
          result = result.filter((entry) =>
            entry.topics.some((t) => t.toLowerCase().includes(topicQ))
          );
        }
      } else {
        result = result.filter((entry) => {
          const searchText = [
            entry.fullName,
            entry.description,
            entry.aiIntro?.[language] || "",
            entry.userNotes?.[language] || "",
            ...entry.topics,
          ]
            .join(" ")
            .toLowerCase();
          return searchText.includes(q);
        });
      }
    }

    // Advanced filters
    if (filters.category) {
      result = result.filter((e) => e.category === filters.category);
    }
    if (filters.languages.length > 0) {
      const langSet = new Set(filters.languages);
      result = result.filter((e) => langSet.has(e.language));
    }
    if (filters.minStars > 0 || filters.maxStars < Infinity) {
      result = result.filter(
        (e) => e.stargazersCount >= filters.minStars && e.stargazersCount <= filters.maxStars
      );
    }

    // Sort (starred = original API order, most recently starred first)
    const sorted = [...result];
    if (sortBy === "stars") {
      sorted.sort((a, b) => b.stargazersCount - a.stargazersCount);
    } else if (sortBy === "updated") {
      sorted.sort(
        (a, b) => new Date(b.pushedAt).getTime() - new Date(a.pushedAt).getTime()
      );
    } else if (sortBy === "name") {
      sorted.sort((a, b) => a.fullName.localeCompare(b.fullName));
    }
    // "starred" = no sort, keep original order

    return sorted;
  }, [data, debouncedQuery, language, sortBy, filters]);

  const groupedByCategory = useMemo(() => {
    const map: Record<string, StarEntry[]> = {};
    for (const entry of filteredEntries) {
      if (!map[entry.category]) map[entry.category] = [];
      map[entry.category].push(entry);
    }
    return map;
  }, [filteredEntries]);

  const categories = useMemo(
    () => data?.categories.filter((c) => groupedByCategory[c]) ?? [],
    [data, groupedByCategory]
  );

  // Reset page when search, perPage, sort, or filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, perPage, sortBy, filters]);

  // Paginate by category groups — never split a category across pages
  const categoryPages: string[][] = useMemo(() => {
    const pages: string[][] = [];
    let current: string[] = [];
    let count = 0;
    for (const cat of categories) {
      const size = (groupedByCategory[cat] ?? []).length;
      if (current.length > 0 && count + size > perPage) {
        pages.push(current);
        current = [];
        count = 0;
      }
      current.push(cat);
      count += size;
    }
    if (current.length > 0) pages.push(current);
    return pages.length > 0 ? pages : [[]];
  }, [categories, groupedByCategory, perPage]);

  const totalPages = categoryPages.length;
  const currentPage = Math.min(page, totalPages);

  const paginatedCategories = useMemo(() => {
    const cats = categoryPages[currentPage - 1] ?? [];
    return cats.map((category) => ({ category, entries: groupedByCategory[category] ?? [] }));
  }, [categoryPages, currentPage, groupedByCategory]);

  // Derive unique languages from entries for the filter UI
  const entryLanguages = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.entries.map((e) => e.language).filter(Boolean))].sort();
  }, [data]);

  const maxStarsValue = useMemo(() => {
    if (!data) return 0;
    return Math.max(...data.entries.map((e) => e.stargazersCount), 0);
  }, [data]);

  return {
    loading,
    error,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    filters,
    setFilters,
    entryLanguages,
    maxStarsValue,
    filteredEntries,
    groupedByCategory,
    categories,
    paginatedCategories,
    page: currentPage,
    totalPages,
    perPage,
    setPage,
    setPerPage,
    totalStars: data?.totalStars ?? 0,
    totalEntries: data?.entries.length ?? 0,
    siteConfig: data?.siteConfig ?? {
      title: {},
      subtitle: {},
      languages: ["en"],
      aiEnabled: false,
      projectUrl: "",
    },
    availableLanguages: data?.languages ?? ["en"],
    lastUpdated: data?.lastUpdated ?? "",
    uiTranslations: data?.uiTranslations ?? {},
    aiCategories: data?.aiCategories ?? [],
  };
}
