import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { CategorySection } from "@/components/CategorySection";
import { LanguageProvider } from "@/i18n/context";
import type { StarEntry as StarEntryType } from "@/types";

interface CategorySectionProps {
  category: string;
  entries: StarEntryType[];
  language: string;
  isAiCategory?: boolean;
  onTopicClick?: (topic: string) => void;
}

function renderCategorySection(props: CategorySectionProps) {
  return render(
    <LanguageProvider>
      <CategorySection {...props} />
    </LanguageProvider>
  );
}

const mockEntries: StarEntryType[] = [
  {
    fullName: "owner/repo1",
    htmlUrl: "https://github.com/owner/repo1",
    description: "First repo",
    language: "TypeScript",
    topics: ["test"],
    stargazersCount: 100,
    pushedAt: "2026-01-01T00:00:00Z",
    archived: false,
    category: "Tools",
    aiIntro: {},
    userNotes: {},
  },
  {
    fullName: "owner/repo2",
    htmlUrl: "https://github.com/owner/repo2",
    description: "Second repo",
    language: "Python",
    topics: ["ml"],
    stargazersCount: 200,
    pushedAt: "2026-02-01T00:00:00Z",
    archived: true,
    category: "Tools",
    aiIntro: { en: "AI intro for repo2" },
    userNotes: {},
  },
];

describe("CategorySection", () => {
  it("renders category heading", () => {
    renderCategorySection({
      category: "Machine Learning",
      entries: mockEntries,
      language: "en",
    });
    expect(
      screen.getByRole("heading", { name: "Machine Learning" })
    ).toBeInTheDocument();
  });

  it("renders all entries", () => {
    renderCategorySection({
      category: "Tools",
      entries: mockEntries,
      language: "en",
    });
    expect(screen.getByText("owner/repo1")).toBeInTheDocument();
    expect(screen.getByText("owner/repo2")).toBeInTheDocument();
  });

  it("renders with correct section id", () => {
    const { container } = renderCategorySection({
      category: "My Category",
      entries: [],
      language: "en",
    });
    expect(container.querySelector('[id="category-My Category"]')).toBeTruthy();
  });

  it("shows AI category badge when isAiCategory is true", () => {
    const { container } = renderCategorySection({
      category: "AI Tools",
      entries: [],
      language: "en",
      isAiCategory: true,
    });
    // Bot icon is an SVG with class containing "lucide-bot"
    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
  });

  it("does not show AI category badge when isAiCategory is false", () => {
    renderCategorySection({
      category: "Manual Category",
      entries: [],
      language: "en",
      isAiCategory: false,
    });
    const heading = screen.getByRole("heading", {
      name: "Manual Category",
    });
    expect(heading.querySelector("svg")).toBeNull();
  });
});
