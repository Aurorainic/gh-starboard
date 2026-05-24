import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("ai-provider", () => {
  const originalEnv = { ...process.env };
  let ai;

  beforeEach(async () => {
    vi.restoreAllMocks();
    process.env.AI_API_KEY = "test-key";
    process.env.AI_API_BASE_URL = "https://api.test.com/v1";
    process.env.AI_MODEL = "test-model";
    vi.resetModules();
    ai = await import("./ai-provider.mjs");
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  function mockChatResponse(content) {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({ choices: [{ message: { content } }] }),
      })
    );
  }

  describe("generateIntro", () => {
    it("calls API and returns trimmed content", async () => {
      mockChatResponse("A great repo for testing.");
      const result = await ai.generateIntro("en", "owner/repo", "desc");
      expect(result).toBe("A great repo for testing.");
    });

    it("throws on null content", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({ choices: [{ message: { content: null } }] }),
        })
      );
      await expect(
        ai.generateIntro("en", "owner/repo", "desc")
      ).rejects.toThrow("null content");
    });

    it("throws on API error", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          status: 429,
          text: () => Promise.resolve("rate limited"),
        })
      );
      await expect(
        ai.generateIntro("en", "owner/repo", "desc")
      ).rejects.toThrow("429");
    });
  });

  describe("generateIntroAndCategory", () => {
    it("parses valid two-line response", async () => {
      mockChatResponse(
        "This is a React UI library for modern web apps.\n|||CATEGORY: React UI Library"
      );
      const result = await ai.generateIntroAndCategory(
        "en",
        "owner/repo",
        "A React UI library",
        ["react", "ui"],
        "TypeScript"
      );
      expect(result.intro).toBe(
        "This is a React UI library for modern web apps."
      );
      expect(result.category).toBe("React UI Library");
    });

    it("strips quotes from intro and category", async () => {
      mockChatResponse(
        '"A testing framework."\n|||CATEGORY: "Testing Framework"'
      );
      const result = await ai.generateIntroAndCategory(
        "en",
        "owner/repo",
        "desc",
        [],
        "JS"
      );
      expect(result.intro).toBe("A testing framework.");
      expect(result.category).toBe("Testing Framework");
    });

    it("throws if intro is missing", async () => {
      mockChatResponse("|||CATEGORY: React UI Library");
      await expect(
        ai.generateIntroAndCategory("en", "owner/repo", "desc", [], "TS")
      ).rejects.toThrow("Invalid response format");
    });

    it("throws if category is missing", async () => {
      mockChatResponse("This is a React UI library.");
      await expect(
        ai.generateIntroAndCategory("en", "owner/repo", "desc", [], "TS")
      ).rejects.toThrow("Invalid response format");
    });

    it("throws if both are empty", async () => {
      mockChatResponse("");
      await expect(
        ai.generateIntroAndCategory("en", "owner/repo", "desc", [], "TS")
      ).rejects.toThrow("Invalid response format");
    });
  });

  describe("translateText", () => {
    it("translates text", async () => {
      mockChatResponse("这是一个测试仓库。");
      const result = await ai.translateText(
        "This is a test repo.",
        "zh-CN",
        "en"
      );
      expect(result).toBe("这是一个测试仓库。");
    });
  });

  describe("suggestCategory", () => {
    it("returns category name", async () => {
      mockChatResponse("Machine Learning");
      const result = await ai.suggestCategory(
        "owner/repo",
        "ML framework",
        ["ml", "python"],
        "Python"
      );
      expect(result).toBe("Machine Learning");
    });
  });

  describe("translateUITexts", () => {
    it("parses valid JSON response", async () => {
      mockChatResponse(
        '{"app.title": "我的应用", "app.subtitle": "应用副标题"}'
      );
      const result = await ai.translateUITexts(
        { "app.title": "My App", "app.subtitle": "App Subtitle" },
        "zh-CN"
      );
      expect(result["app.title"]).toBe("我的应用");
      expect(result["app.subtitle"]).toBe("应用副标题");
    });

    it("extracts JSON wrapped in markdown code block", async () => {
      mockChatResponse(
        '```json\n{"app.title": "Mon App"}\n```'
      );
      const result = await ai.translateUITexts(
        { "app.title": "My App" },
        "fr"
      );
      expect(result["app.title"]).toBe("Mon App");
    });

    it("falls back to original texts when no JSON found", async () => {
      mockChatResponse("I cannot translate this");
      const original = { "app.title": "My App" };
      const result = await ai.translateUITexts(original, "fr");
      expect(result).toEqual(original);
    });

    it("falls back to original texts when extracted JSON is invalid", async () => {
      mockChatResponse("here is {not valid json at all} stuff");
      const original = { "app.title": "My App" };
      const result = await ai.translateUITexts(original, "fr");
      expect(result).toEqual(original);
    });
  });

  describe("healthCheck", () => {
    it("returns true on READY response", async () => {
      mockChatResponse("READY");
      const result = await ai.healthCheck(0);
      expect(result).toBe(true);
    });

    it("returns true on ready (lowercase)", async () => {
      mockChatResponse("ready");
      const result = await ai.healthCheck(0);
      expect(result).toBe(true);
    });

    it("retries on failure then succeeds", async () => {
      const fetchMock = vi.fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: () => Promise.resolve("server error"),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              choices: [{ message: { content: "READY" } }],
            }),
        });
      vi.stubGlobal("fetch", fetchMock);

      const result = await ai.healthCheck(1);
      expect(result).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("throws after all retries exhausted", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          status: 500,
          text: () => Promise.resolve("server error"),
        })
      );
      await expect(ai.healthCheck(0)).rejects.toThrow("health check failed");
    });
  });

  describe("missing API key", () => {
    it("throws if AI_API_KEY is not set", async () => {
      delete process.env.AI_API_KEY;
      vi.resetModules();
      const freshAi = await import("./ai-provider.mjs");
      await expect(
        freshAi.generateIntro("en", "owner/repo", "desc")
      ).rejects.toThrow("AI_API_KEY not set");
    });
  });
});
