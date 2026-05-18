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

  return {
    loading,
    searchQuery,
    setSearchQuery,
    filteredEntries,
    groupedByCategory,
    categories,
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
