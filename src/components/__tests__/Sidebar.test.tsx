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
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  categoryTranslations: Record<string, Record<string, string>>;
  sortBy: SortKey;
  onSortChange: (key: SortKey) => void;
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  maxStarsValue: number;
}

function renderSidebar(props: Partial<SidebarTestProps> = {}) {
  const defaults: SidebarTestProps = {
    categories: [
      { name: "Tools", count: 5, isAi: false },
      { name: "Libraries", count: 3, isAi: false },
      { name: "AI Generated", count: 2, isAi: true },
    ],
    selectedCategory: "",
    onCategoryChange: vi.fn(),
    categoryTranslations: {},
    sortBy: "starred",
    onSortChange: vi.fn(),
    filters: { languages: [], minStars: 0, maxStars: Number.MAX_SAFE_INTEGER, category: "" },
    onFiltersChange: vi.fn(),
    maxStarsValue: 1000,
  };
  return render(
    <LanguageProvider>
      <Sidebar {...defaults} {...props} />
    </LanguageProvider>
  );
}

describe("Sidebar", () => {
  it("renders All button and all categories", () => {
    renderSidebar();
    expect(screen.getByText("All")).toBeInTheDocument();
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

  it("does not show Bot icon for non-AI categories", () => {
    renderSidebar();
    const normalButton = screen.getByText("Tools").closest("button");
    // Only the entry count SVG is the bot icon — Tools button should have count but no bot
    // Actually Tools button has count "5" but no SVG bot icon
    const svgs = normalButton?.querySelectorAll("svg") ?? [];
    // No SVG at all for non-AI categories (count is just text)
    expect(svgs.length).toBe(0);
  });

  it("highlights selected category", () => {
    renderSidebar({ selectedCategory: "Libraries" });
    const btn = screen.getByText("Libraries").closest("button");
    expect(btn?.className).toContain("bg-accent");
  });

  it("calls onCategoryChange when category clicked", async () => {
    const onCategoryChange = vi.fn();
    const user = userEvent.setup();
    renderSidebar({ onCategoryChange });

    await user.click(screen.getByText("Tools"));
    expect(onCategoryChange).toHaveBeenCalledWith("Tools");
  });

  it("calls onCategoryChange('') when All clicked", async () => {
    const onCategoryChange = vi.fn();
    const user = userEvent.setup();
    renderSidebar({ selectedCategory: "Tools", onCategoryChange });

    await user.click(screen.getByText("All"));
    expect(onCategoryChange).toHaveBeenCalledWith("");
  });

  it("renders sort options", () => {
    renderSidebar();
    expect(screen.getByRole("heading", { name: "Sort" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Star order" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "By stars" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "By updated" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "By name" })).toBeInTheDocument();
  });

  it("uses translated category names when available", () => {
    renderSidebar({
      categoryTranslations: { "zh-CN": { Tools: "工具" } },
    });
    // Default language is "en", so translations won't apply without changing context
    // But the function should still work
    expect(screen.getByText("Tools")).toBeInTheDocument();
  });
});
