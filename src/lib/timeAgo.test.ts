import { describe, it, expect } from "vitest";
import { timeAgo } from "./timeAgo";

describe("timeAgo", () => {
  it("returns justNowText for recent timestamps", () => {
    const now = new Date().toISOString();
    expect(timeAgo(now, "en", "just now")).toBe("just now");
  });

  it("returns minutes ago", () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const result = timeAgo(fiveMinAgo, "en", "just now");
    expect(result).toContain("5");
  });

  it("returns hours ago", () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 3600 * 1000).toISOString();
    const result = timeAgo(threeHoursAgo, "en", "just now");
    expect(result).toContain("3");
  });

  it("returns days ago", () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 86400000).toISOString();
    const result = timeAgo(tenDaysAgo, "en", "just now");
    expect(result).toContain("10");
  });

  it("returns months ago", () => {
    const twoMonthsAgo = new Date(Date.now() - 60 * 86400000).toISOString();
    const result = timeAgo(twoMonthsAgo, "en", "just now");
    expect(result).toContain("2");
  });

  it("returns years ago", () => {
    const twoYearsAgo = new Date(Date.now() - 730 * 86400000).toISOString();
    const result = timeAgo(twoYearsAgo, "en", "just now");
    expect(result).toContain("2");
  });

  it("works with different languages", () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const result = timeAgo(fiveMinAgo, "zh-CN", "刚刚");
    expect(result).toContain("5");
  });
});
