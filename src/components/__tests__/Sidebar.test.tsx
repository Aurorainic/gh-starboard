import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { Sidebar } from "@/components/Sidebar";
import { LanguageProvider } from "@/i18n/context";
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
  categoryTranslations: Record<string, Record<string, string>>;
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
    categoryTranslations: {},
    sortBy: "starred",
    onSortChange: vi.fn(),
    filters: { languages: [], minStars: 0, maxStars: Number.MAX_SAFE_INTEGER, categories: [] },
    onFiltersChange: vi.fn(),
    maxStarsValue: 1000,
    entryLanguages: ["JavaScript", "Python", "TypeScript"],
  };
  return render(
    <LanguageProvider>
      <Sidebar {...defaults} {...props} />
    </LanguageProvider>
  );
}

describe("Sidebar", () => {
  it("renders all categories", () => {
    renderSidebar();
    expect(screen.getByText("Tools")).toBeInTheDocument();
    expect(screen.getByText("Libraries")).toBeInTheDocument();
    expect(screen.getByText("AI Generated")).toBeInTheDocument();
  });

  it("shows entry counts", () => {
    renderSidebar();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("shows Bot icon for AI categories", () => {
    renderSidebar();
    const aiButton = screen.getByText("AI Generated").closest("button");
    expect(aiButton?.querySelector("svg")).toBeTruthy();
  });

  it("highlights selected category", () => {
    renderSidebar({ selectedCategories: ["Libraries"] });
    const btn = screen.getByText("Libraries").closest("button");
    expect(btn?.className).toContain("bg-accent");
  });

  it("calls onCategoriesChange when category clicked", async () => {
    const onCategoriesChange = vi.fn();
    const user = userEvent.setup();
    renderSidebar({ onCategoriesChange });

    await user.click(screen.getByText("Tools"));
    expect(onCategoriesChange).toHaveBeenCalledWith(["Tools"]);
  });

  it("deselects category when clicked again", async () => {
    const onCategoriesChange = vi.fn();
    const user = userEvent.setup();
    renderSidebar({ selectedCategories: ["Tools"], onCategoriesChange });

    await user.click(screen.getByText("Tools"));
    expect(onCategoriesChange).toHaveBeenCalledWith([]);
  });

  it("renders sort options", () => {
    renderSidebar();
    expect(screen.getByRole("heading", { name: "Sort" })).toBeInTheDocument();
  });

  it("uses translated category names when available", () => {
    renderSidebar({
      categoryTranslations: { "zh-CN": { Tools: "工具" } },
    });
    expect(screen.getByText("Tools")).toBeInTheDocument();
  });
});
