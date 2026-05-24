import { useState, useEffect, useMemo, useRef } from "react";
import { type MergedData, type StarEntry, type Language } from "@/types";

const DATA_URL = "./data/merged.json";
const DEFAULT_PER_PAGE = 20;
const DEBOUNCE_MS = 300;

export type SortKey = "starred" | "stars" | "updated" | "name";

export function useStars(language: Language) {
  const [data, setData] = useState<MergedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("starred");
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
  }, [data, debouncedQuery, language, sortBy]);

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

  // Reset page when search, perPage, or sort changes
  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, perPage, sortBy]);

  // Paginate across all filtered entries, preserving category grouping
  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / perPage));
  const currentPage = Math.min(page, totalPages);

  const paginatedCategories = useMemo(() => {
    const start = (currentPage - 1) * perPage;
    const end = start + perPage;
    let skipped = 0;
    const result: { category: string; entries: StarEntry[] }[] = [];

    for (const cat of categories) {
      const catEntries = groupedByCategory[cat] ?? [];
      const pageEntries: StarEntry[] = [];

      for (const entry of catEntries) {
        if (skipped >= start && skipped < end) {
          pageEntries.push(entry);
        }
        skipped++;
      }

      if (pageEntries.length > 0) {
        result.push({ category: cat, entries: pageEntries });
      }
    }

    return result;
  }, [categories, groupedByCategory, currentPage, perPage]);

  return {
    loading,
    error,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
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
  };
}
