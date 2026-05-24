import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useStars, type SortKey } from "./useStars";
import type { MergedData } from "@/types";

const mockData: MergedData = {
  categories: ["Tools", "Libraries"],
  entries: [
    {
      fullName: "octocat/hello-world",
      htmlUrl: "https://github.com/octocat/hello-world",
      description: "My first repo",
      language: "JavaScript",
      topics: ["hello", "demo"],
      stargazersCount: 100,
      pushedAt: "2024-01-01T00:00:00Z",
      archived: false,
      category: "Tools",
      aiIntro: { en: "A hello world repo" },
      userNotes: {},
    },
    {
      fullName: "octocat/Spoon-Knife",
      htmlUrl: "https://github.com/octocat/Spoon-Knife",
      description: "This repo is for demonstration",
      language: "Python",
      topics: ["demo", "fork"],
      stargazersCount: 500,
      pushedAt: "2025-06-01T00:00:00Z",
      archived: false,
      category: "Libraries",
      aiIntro: { en: "A demo repo for forking" },
      userNotes: {},
    },
    {
      fullName: "user/archived-project",
      htmlUrl: "https://github.com/user/archived-project",
      description: "An old project",
      language: "JavaScript",
      topics: ["old"],
      stargazersCount: 10,
      pushedAt: "2023-01-01T00:00:00Z",
      archived: true,
      category: "Tools",
      aiIntro: {},
      userNotes: {},
    },
  ],
  totalStars: 610,
  lastUpdated: "2025-06-01T00:00:00Z",
  siteConfig: { title: {}, subtitle: {}, languages: ["en"], aiEnabled: false, projectUrl: "" },
  languages: ["en"],
};

function mockFetch(data: MergedData = mockData) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(data),
  }));
}

describe("useStars", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("loads data and returns entries", async () => {
    mockFetch();
    const { result } = renderHook(() => useStars("en"));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.totalEntries).toBe(3);
    expect(result.current.categories).toEqual(["Tools", "Libraries"]);
    expect(result.current.error).toBe(false);
  });

  it("handles fetch error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("fail")));
    const { result } = renderHook(() => useStars("en"));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe(true);
    expect(result.current.totalEntries).toBe(0);
  });

  it("filters by search query", async () => {
    mockFetch();
    const { result } = renderHook(() => useStars("en"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setSearchQuery("spoon"));

    await waitFor(() => expect(result.current.filteredEntries).toHaveLength(1));
    expect(result.current.filteredEntries[0].fullName).toBe("octocat/Spoon-Knife");
  });

  it("filters by topic: prefix", async () => {
    mockFetch();
    const { result } = renderHook(() => useStars("en"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setSearchQuery("topic:fork"));

    await waitFor(() => expect(result.current.filteredEntries).toHaveLength(1));
    expect(result.current.filteredEntries[0].fullName).toBe("octocat/Spoon-Knife");
  });

  it("sorts by stars descending", async () => {
    mockFetch();
    const { result } = renderHook(() => useStars("en"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setSortBy("stars" as SortKey));

    expect(result.current.filteredEntries[0].stargazersCount).toBe(500);
    expect(result.current.filteredEntries[1].stargazersCount).toBe(100);
    expect(result.current.filteredEntries[2].stargazersCount).toBe(10);
  });

  it("sorts by name", async () => {
    mockFetch();
    const { result } = renderHook(() => useStars("en"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setSortBy("name" as SortKey));

    expect(result.current.filteredEntries[0].fullName).toBe("octocat/hello-world");
    expect(result.current.filteredEntries[1].fullName).toBe("octocat/Spoon-Knife");
    expect(result.current.filteredEntries[2].fullName).toBe("user/archived-project");
  });

  it("filters by language", async () => {
    mockFetch();
    const { result } = renderHook(() => useStars("en"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setFilters({ ...result.current.filters, languages: ["Python"] }));

    expect(result.current.filteredEntries).toHaveLength(1);
    expect(result.current.filteredEntries[0].language).toBe("Python");
  });

  it("filters by star range", async () => {
    mockFetch();
    const { result } = renderHook(() => useStars("en"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setFilters({ ...result.current.filters, minStars: 50, maxStars: 200 }));

    expect(result.current.filteredEntries).toHaveLength(1);
    expect(result.current.filteredEntries[0].stargazersCount).toBe(100);
  });

  it("filters by category", async () => {
    mockFetch();
    const { result } = renderHook(() => useStars("en"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setFilters({ ...result.current.filters, category: "Libraries" }));

    expect(result.current.filteredEntries).toHaveLength(1);
    expect(result.current.filteredEntries[0].category).toBe("Libraries");
  });

  it("derives entry languages", async () => {
    mockFetch();
    const { result } = renderHook(() => useStars("en"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.entryLanguages).toEqual(["JavaScript", "Python"]);
  });

  it("paginates by category groups", async () => {
    // 3 entries: Tools(2), Libraries(1). With perPage=2, Tools fills page 1, Libraries is page 2
    mockFetch();
    const { result } = renderHook(() => useStars("en"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setPerPage(2));

    expect(result.current.totalPages).toBe(2);
    expect(result.current.paginatedCategories).toHaveLength(1);
    expect(result.current.paginatedCategories[0].category).toBe("Tools");
    expect(result.current.paginatedCategories[0].entries).toHaveLength(2);

    act(() => result.current.setPage(2));

    expect(result.current.paginatedCategories).toHaveLength(1);
    expect(result.current.paginatedCategories[0].category).toBe("Libraries");
  });
});
