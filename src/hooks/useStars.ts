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
      const timeMap = new Map<string, number>();
      for (const e of sorted) {
        if (!timeMap.has(e.pushedAt)) timeMap.set(e.pushedAt, new Date(e.pushedAt).getTime() || 0);
      }
      sorted.sort((a, b) => (timeMap.get(b.pushedAt) ?? 0) - (timeMap.get(a.pushedAt) ?? 0));
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

  // Paginate by category groups. A category larger than perPage is split across pages.
  interface PageSlice { category: string; start: number; end: number; }
  const categoryPages: PageSlice[][] = useMemo(() => {
    const pages: PageSlice[][] = [];
    let current: PageSlice[] = [];
    let count = 0;

    for (const cat of categories) {
      const entries = groupedByCategory[cat] ?? [];
      const size = entries.length;

      if (count === 0 && size <= perPage) {
        // Empty page, small category — start a new group
        current.push({ category: cat, start: 0, end: size });
        count = size;
      } else if (count + size <= perPage) {
        // Fits on current page
        current.push({ category: cat, start: 0, end: size });
        count += size;
      } else if (size <= perPage) {
        // Doesn't fit, flush current page and start new one
        if (current.length > 0) pages.push(current);
        current = [{ category: cat, start: 0, end: size }];
        count = size;
      } else {
        // Category itself exceeds perPage — flush current page, then split this category
        if (current.length > 0) {
          pages.push(current);
          current = [];
          count = 0;
        }
        for (let offset = 0; offset < size; offset += perPage) {
          pages.push([{ category: cat, start: offset, end: Math.min(offset + perPage, size) }]);
        }
      }
    }

    if (current.length > 0) pages.push(current);
    return pages.length > 0 ? pages : [[]];
  }, [categories, groupedByCategory, perPage]);

  const totalPages = categoryPages.length;
  const currentPage = Math.min(page, totalPages);

  const paginatedCategories = useMemo(() => {
    const slices = categoryPages[currentPage - 1] ?? [];
    return slices.map(({ category, start, end }) => ({
      category,
      entries: (groupedByCategory[category] ?? []).slice(start, end),
    }));
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
    categoryPages,
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
