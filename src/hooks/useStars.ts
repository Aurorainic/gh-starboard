import { useState, useEffect, useMemo } from "react";
import { type MergedData, type StarEntry, type Language } from "@/types";

const DATA_URL = "./data/merged.json";
const DEFAULT_PER_PAGE = 20;

export function useStars(language: Language) {
  const [data, setData] = useState<MergedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE);

  useEffect(() => {
    fetch(DATA_URL)
      .then((res) => res.json())
      .then((json) => setData(json))
      .catch(() => {
        setData({
          categories: [],
          entries: [],
          totalStars: 0,
          lastUpdated: new Date().toISOString(),
          siteConfig: {
            title: {},
            subtitle: {},
            languages: ["en"],
            aiEnabled: false,
          },
          languages: ["en"],
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredEntries = useMemo(() => {
    if (!data) return [];
    const q = searchQuery.toLowerCase().trim();
    if (!q) return data.entries;

    if (q.startsWith("topic:")) {
      const topicQ = q.slice(6).trim();
      if (!topicQ) return data.entries;
      return data.entries.filter((entry) =>
        entry.topics.some((t) => t.toLowerCase().includes(topicQ))
      );
    }

    return data.entries.filter((entry) => {
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
  }, [data, searchQuery, language]);

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

  // Reset page when search or perPage changes
  useEffect(() => {
    setPage(1);
  }, [searchQuery, perPage]);

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
    searchQuery,
    setSearchQuery,
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
    },
    availableLanguages: data?.languages ?? ["en"],
    lastUpdated: data?.lastUpdated ?? "",
  };
}
