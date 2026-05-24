import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { Sidebar } from "@/components/Sidebar";
import { LanguageContext } from "@/i18n/context";
import { type SortKey, type Filters } from "@/hooks/useStars";

interface CategoryCount {
  name: string;
  count: number;
  isAi: boolean;
}

interface SidebarTestProps {
  categories: CategoryCount[];
  selectedCategories: string[];
  onCategoriesChange: (categories: string[]) => void;
  sortBy: SortKey;
  onSortChange: (key: SortKey) => void;
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  maxStarsValue: number;
  entryLanguages: string[];
}

function renderSidebar(props: Partial<SidebarTestProps> = {}) {
  const defaults: SidebarTestProps = {
    categories: [
      { name: "Tools", count: 5, isAi: false },
      { name: "Libraries", count: 3, isAi: false },
      { name: "AI Generated", count: 2, isAi: true },
    ],
    selectedCategories: [],
    onCategoriesChange: vi.fn(),
    sortBy: "starred",
    onSortChange: vi.fn(),
    filters: { languages: [], minStars: 0, maxStars: Number.MAX_SAFE_INTEGER, categories: [] },
    onFiltersChange: vi.fn(),
    maxStarsValue: 1000,
    entryLanguages: ["JavaScript", "Python", "TypeScript"],
  };

  const mockI18nData = {
    "category.Tools": "Tools",
    "category.Libraries": "Libraries",
    "category.AI Generated": "AI Generated",
    "sidebar.all": "All",
    "sidebar.sort": "Sort",
    "sidebar.stars": "Stars",
    "sidebar.languages": "Languages",
    "sort.starred": "Star order",
    "sort.stars": "By stars",
    "sort.updated": "By updated",
    "sort.name": "By name",
  };

  return render(
    <LanguageContext.Provider
      value={{
        language: "en",
        setLanguage: vi.fn(),
        availableLanguages: ["en"],
        setAvailableLanguages: vi.fn(),
        i18nData: mockI18nData,
      }}
    >
      <Sidebar {...defaults} {...props} />
    </LanguageContext.Provider>
  );
}

describe("Sidebar", () => {
  it("renders category dropdown with All selected by default", () => {
    renderSidebar();
    expect(screen.getByText("All")).toBeInTheDocument();
  });

  it("shows selected category in dropdown trigger", () => {
    renderSidebar({ selectedCategories: ["Libraries"] });
    expect(screen.getByText("Libraries")).toBeInTheDocument();
  });

  it("calls onCategoriesChange when category selected from dropdown", async () => {
    const onCategoriesChange = vi.fn();
    const user = userEvent.setup();
    renderSidebar({ onCategoriesChange });

    await user.click(screen.getByRole("button", { name: /All/i }));
    await user.click(screen.getByText("Tools"));
    expect(onCategoriesChange).toHaveBeenCalledWith(["Tools"]);
  });

  it("renders sort options", () => {
    renderSidebar();
    expect(screen.getByRole("heading", { name: "Sort" })).toBeInTheDocument();
  });

  it("highlights selected sort option", () => {
    renderSidebar({ sortBy: "stars" });
    const btn = screen.getByText("By stars").closest("button");
    expect(btn?.className).toContain("bg-accent");
  });
});
