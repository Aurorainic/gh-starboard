import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { Sidebar } from "@/components/Sidebar";
import { LanguageProvider } from "@/i18n/context";

interface SidebarProps {
  categories: string[];
  aiCategories: string[];
  activeCategory: string | null;
  onCategoryClick: (category: string) => void;
}

function renderSidebar(props: SidebarProps) {
  return render(
    <LanguageProvider>
      <Sidebar {...props} />
    </LanguageProvider>
  );
}

describe("Sidebar", () => {
  it("renders all categories", () => {
    renderSidebar({
      categories: ["Tools", "Libraries", "Frameworks"],
      aiCategories: [],
      activeCategory: null,
      onCategoryClick: vi.fn(),
    });
    expect(screen.getByText("Tools")).toBeInTheDocument();
    expect(screen.getByText("Libraries")).toBeInTheDocument();
    expect(screen.getByText("Frameworks")).toBeInTheDocument();
  });

  it("highlights the active category", () => {
    renderSidebar({
      categories: ["Tools", "Libraries"],
      aiCategories: [],
      activeCategory: "Libraries",
      onCategoryClick: vi.fn(),
    });
    const activeBtn = screen.getByText("Libraries").closest("button");
    expect(activeBtn?.className).toContain("bg-accent");
  });

  it("does not highlight inactive categories", () => {
    renderSidebar({
      categories: ["Tools", "Libraries"],
      aiCategories: [],
      activeCategory: "Libraries",
      onCategoryClick: vi.fn(),
    });
    const inactiveBtn = screen.getByText("Tools").closest("button");
    // hover:bg-accent is acceptable — only the active state adds bg-accent + font-medium as direct classes
    expect(inactiveBtn?.className).not.toContain("font-medium");
  });

  it("calls onCategoryClick when category clicked", async () => {
    const onCategoryClick = vi.fn();
    const user = userEvent.setup();
    renderSidebar({
      categories: ["Tools", "Libraries"],
      aiCategories: [],
      activeCategory: null,
      onCategoryClick,
    });

    await user.click(screen.getByText("Tools"));
    expect(onCategoryClick).toHaveBeenCalledWith("Tools");
  });

  it("shows Bot icon for AI categories", () => {
    const { container } = renderSidebar({
      categories: ["Tools", "AI Generated"],
      aiCategories: ["AI Generated"],
      activeCategory: null,
      onCategoryClick: vi.fn(),
    });
    // AI Generated button should have an SVG (Bot icon)
    const buttons = container.querySelectorAll("button");
    const aiButton = Array.from(buttons).find((b) =>
      b.textContent?.includes("AI Generated")
    );
    expect(aiButton?.querySelector("svg")).toBeTruthy();
  });

  it("does not show Bot icon for non-AI categories", () => {
    const { container } = renderSidebar({
      categories: ["Tools", "Manual"],
      aiCategories: ["AI Category"],
      activeCategory: null,
      onCategoryClick: vi.fn(),
    });
    const buttons = container.querySelectorAll("button");
    const manualButton = Array.from(buttons).find((b) =>
      b.textContent?.includes("Manual")
    );
    expect(manualButton?.querySelector("svg")).toBeNull();
  });

  it("renders heading text", () => {
    renderSidebar({
      categories: [],
      aiCategories: [],
      activeCategory: null,
      onCategoryClick: vi.fn(),
    });
    expect(screen.getByText("Contents")).toBeInTheDocument();
  });
});
