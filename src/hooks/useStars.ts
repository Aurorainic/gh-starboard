import { useState, useEffect, useMemo } from "react";
import { type MergedData, type StarEntry, type Language } from "@/types";

const DATA_URL = "./data/merged.json";

export function useStars(language: Language) {
  const [data, setData] = useState<MergedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetch(DATA_URL)
      .then((res) => res.json())
      .then((json) => setData(json))
      .catch(() => {
        // Fallback: empty data for demo
        setData({
          categories: [],
          entries: [],
          totalStars: 0,
          lastUpdated: new Date().toISOString(),
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredEntries = useMemo(() => {
    if (!data) return [];
    const q = searchQuery.toLowerCase().trim();
    if (!q) return data.entries;

    return data.entries.filter((entry) => {
      const searchText = [
        entry.fullName,
        entry.description,
        language === "zh" ? entry.aiIntroZh : entry.aiIntroEn,
        language === "zh" ? entry.userNotesZh : entry.userNotesEn,
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

  return {
    loading,
    searchQuery,
    setSearchQuery,
    filteredEntries,
    groupedByCategory,
    categories,
    totalStars: data?.totalStars ?? 0,
    lastUpdated: data?.lastUpdated ?? "",
  };
}
