import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { StarEntry } from "@/components/StarEntry";
import { LanguageProvider } from "@/i18n/context";
import type { StarEntry as StarEntryType } from "@/types";

function renderStarEntry(entry: StarEntryType, props: Record<string, unknown> = {}) {
  return render(
    <LanguageProvider>
      <StarEntry entry={entry} language="en" {...props} />
    </LanguageProvider>
  );
}

const baseEntry = {
  fullName: "octocat/hello-world",
  htmlUrl: "https://github.com/octocat/hello-world",
  description: "My first repo",
  language: "JavaScript",
  topics: ["hello", "demo"],
  stargazersCount: 1234,
  pushedAt: "2026-01-15T00:00:00Z",
  archived: false,
  category: "Tools",
  aiIntro: {},
  userNotes: {},
};

describe("StarEntry", () => {
  it("renders repo name as a link", () => {
    renderStarEntry(baseEntry);
    const link = screen.getByText("octocat/hello-world").closest("a");
    expect(link).toHaveAttribute(
      "href",
      "https://github.com/octocat/hello-world"
    );
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("displays star count", () => {
    renderStarEntry(baseEntry);
    expect(screen.getByText("1,234")).toBeInTheDocument();
  });

  it("shows language badge", () => {
    renderStarEntry(baseEntry);
    expect(screen.getByText("JavaScript")).toBeInTheDocument();
  });

  it("shows topic badges", () => {
    renderStarEntry(baseEntry);
    expect(screen.getByText("hello")).toBeInTheDocument();
    expect(screen.getByText("demo")).toBeInTheDocument();
  });

  it("shows description when no AI intro", () => {
    renderStarEntry(baseEntry);
    expect(screen.getByText("My first repo")).toBeInTheDocument();
  });

  it("shows AI intro instead of description when available", () => {
    const entry = {
      ...baseEntry,
      aiIntro: { en: "An AI-generated intro for testing." },
    };
    renderStarEntry(entry);
    expect(
      screen.getByText("An AI-generated intro for testing.")
    ).toBeInTheDocument();
    expect(screen.queryByText("My first repo")).not.toBeInTheDocument();
  });

  it("shows archived badge when archived", () => {
    const entry = { ...baseEntry, archived: true };
    renderStarEntry(entry);
    expect(screen.getByText("Archived")).toBeInTheDocument();
  });

  it("does not show archived badge when not archived", () => {
    renderStarEntry(baseEntry);
    expect(screen.queryByText("Archived")).not.toBeInTheDocument();
  });

  it("renders user notes as markdown", () => {
    const entry = {
      ...baseEntry,
      userNotes: { en: "**Bold note** and `code`" },
    };
    renderStarEntry(entry);
    expect(screen.getByText("Bold note")).toBeInTheDocument();
    expect(screen.getByText("code")).toBeInTheDocument();
  });

  it("calls onTopicClick when topic badge clicked", async () => {
    const onTopicClick = vi.fn();
    const user = userEvent.setup();
    renderStarEntry(baseEntry, { onTopicClick });

    await user.click(screen.getByText("hello"));
    expect(onTopicClick).toHaveBeenCalledWith("hello");
  });

  it("shows expand button when more than 5 topics", () => {
    const entry = {
      ...baseEntry,
      topics: ["t1", "t2", "t3", "t4", "t5", "t6", "t7"],
    };
    renderStarEntry(entry);
    expect(screen.getByText("+2")).toBeInTheDocument();
    expect(screen.queryByText("t6")).not.toBeInTheDocument();
  });

  it("expands topics on click", async () => {
    const entry = {
      ...baseEntry,
      topics: ["t1", "t2", "t3", "t4", "t5", "t6"],
    };
    const user = userEvent.setup();
    renderStarEntry(entry);

    await user.click(screen.getByText("+1"));
    expect(screen.getByText("t6")).toBeInTheDocument();
  });
});
