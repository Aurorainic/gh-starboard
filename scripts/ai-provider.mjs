const BASE_URL = process.env.AI_API_BASE_URL || "https://api.openai.com/v1";
const API_KEY = process.env.AI_API_KEY;
const MODEL = process.env.AI_MODEL || "gpt-4o-mini";

function maskSecret(text) {
  if (!text) return text;
  return text.replace(/Bearer\s+\S+/gi, "Bearer ***").replace(/sk-[a-zA-Z0-9]{8,}/g, (m) => m.slice(0, 6) + "***");
}

async function chat(systemPrompt, userMessage, maxTokens = 800, temperature = 0.7) {
  if (!API_KEY) {
    throw new Error("AI_API_KEY not set");
  }

  const TIMEOUT_MS = 30_000;
  const MAX_RETRIES = 2;
  let lastError;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = Math.min(2000 * Math.pow(2, attempt - 1), 10000);
      await new Promise((r) => setTimeout(r, delay));
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const res = await fetch(`${BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
          temperature,
          max_tokens: maxTokens,
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (res.status === 429 || res.status >= 500) {
        lastError = new Error(`API error ${res.status}`);
        continue;
      }

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`API error ${res.status}: ${maskSecret(body)}`);
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (content == null) {
        throw new Error("API returned null content");
      }
      return content.trim();
    } catch (e) {
      clearTimeout(timer);
      if (e.name === "AbortError") {
        lastError = new Error(`API request timed out after ${TIMEOUT_MS / 1000}s`);
        continue;
      }
      throw e;
    }
  }

  throw lastError || new Error("API request failed after retries");
}

const LANG_PROMPTS = {
  "zh-CN":
    "你是 GitHub 仓库简介生成器。用中文写一段 50-100 字的简介，概括仓库的用途和特点。直接返回简介文本，不要带前缀或引号。",
  en: "You are a GitHub repo intro generator. Write a 50-100 word English summary of the repository's purpose and features. Return only the summary text, no prefixes or quotes.",
};

const LANG_NAMES = {
  "zh-CN": "Chinese (Simplified)",
  "zh-TW": "Chinese (Traditional)",
  "zh-HK": "Chinese (Traditional, Hong Kong)",
  "zh-Hans": "Chinese (Simplified)",
  "zh-Hant": "Chinese (Traditional)",
  zh: "Chinese",
  en: "English",
  fr: "French",
  ja: "Japanese",
  de: "German",
  ko: "Korean",
  es: "Spanish",
  pt: "Portuguese",
  ru: "Russian",
  ar: "Arabic",
};

export async function generateIntro(language, repoName, repoDescription) {
  const systemPrompt =
    LANG_PROMPTS[language] ||
    `Write a 50-100 word summary of the repository in ${language} language. Describe its purpose and key features. Return only the summary text.`;
  const userMsg = `Repository: ${repoName}\nDescription: ${repoDescription || "None"}`;
  return chat(systemPrompt, userMsg);
}

export async function generateIntroAndCategory(
  language,
  repoName,
  repoDescription,
  repoTopics,
  repoLanguage
) {
  const langPrompt =
    LANG_PROMPTS[language] ||
    `Write a 50-100 word summary of the repository in ${language} language. Describe its purpose and key features.`;

  const systemPrompt = `You are a GitHub repository analyst. Do TWO tasks:

TASK 1 — Summary: ${langPrompt}

TASK 2 — Category: Based on the repo's name, description, language, and topics, assign it to ONE specific domain category.
Rules:
- Create a concise category name (1-3 words, Title Case)
- Be specific and descriptive (e.g. "React UI Library", "CLI Tool", "Machine Learning", "Game Engine", "Rust Web Framework")
- Do NOT use vague terms like "Software", "Tools", "Developer Tools", "Utilities"
- Use the repo's topics as strong hints for the category name
- Each repo should get the category that BEST describes ITS specific domain

OUTPUT FORMAT: Return exactly two lines.
Line 1: The summary text (50-100 words)
Line 2: Exactly: |||CATEGORY: <category name>
Nothing else. No markdown, no extra text.`;

  const userMsg = `Repository: ${repoName}\nDescription: ${repoDescription || "None"}\nLanguage: ${repoLanguage || "Unknown"}\nTopics: ${repoTopics?.join(", ") || "None"}`;

  const result = await chat(systemPrompt, userMsg, 800, 0.4);

  // Parse: first line = intro, second line = |||CATEGORY: xxx
  const lines = result.split("\n").filter((l) => l.trim());
  let intro = "";
  let category = "";

  for (const line of lines) {
    const catMatch = line.match(/\|\|\|CATEGORY:\s*(.+)/i);
    if (catMatch) {
      category = catMatch[1].trim().replace(/^["']|["']$/g, "");
    } else if (!intro) {
      intro = line.trim().replace(/^["']|["']$/g, "");
    }
  }

  // Validate: intro is required, category is best-effort
  if (!intro) {
    throw new Error(
      `Invalid response format from generateIntroAndCategory: intro is empty. ` +
      `Got: ${result.substring(0, 200)}`
    );
  }

  if (!category) {
    console.warn(`Missing category for ${repoName}, intro generated successfully`);
  }

  return { intro, category };
}

export async function translateText(text, targetLanguage, sourceLanguage = "zh-CN") {
  const sourceName = LANG_NAMES[sourceLanguage] || sourceLanguage;
  const targetName = LANG_NAMES[targetLanguage] || targetLanguage;
  const systemPrompt = `Translate the following ${sourceName} Markdown text to ${targetName}. Preserve all Markdown formatting (links, bold, italic, code blocks, etc.) exactly. Return only the translated text, no explanations.`;
  return chat(systemPrompt, text);
}

export async function suggestCategory(repoName, description, topics, language) {
  const systemPrompt = `You are a GitHub repository classifier. Based on the repo's name, description, language, and topics, assign it to ONE specific domain category.

Rules:
- Create a concise category name (1-3 words, Title Case)
- Be specific and descriptive (e.g. "React UI Library", "CLI Tool", "Machine Learning", "Game Engine")
- Do NOT use vague terms like "Software", "Tools", "Developer Tools", "Utilities"
- Use the repo's topics as strong hints for the category name
- Return ONLY the category name, nothing else. No quotes, no explanation.`;
  const userMsg = `Repository: ${repoName}\nDescription: ${description || "None"}\nLanguage: ${language || "Unknown"}\nTopics: ${topics?.join(", ") || "None"}`;
  return chat(systemPrompt, userMsg, 50, 0.3);
}

export async function translateUITexts(texts, targetLanguage) {
  const targetName = LANG_NAMES[targetLanguage] || targetLanguage;
  const entries = Object.entries(texts).map(([key, value]) => `"${key}": "${value}"`);
  const systemPrompt = `You are a UI text translator. Translate the following key-value pairs from English to ${targetName}. These are UI labels for a web application.

Rules:
- Preserve the exact key names
- Keep {variable} placeholders intact (e.g. {count}, {page}, {total}, {time}, {link})
- Translate only the values
- Return valid JSON format: {"key": "translated value", ...}
- Return ONLY the JSON, no explanations or markdown code blocks`;
  const userMsg = `{\n${entries.join(",\n")}\n}`;
  const result = await chat(systemPrompt, userMsg, 2000);
  try {
    return JSON.parse(result);
  } catch {
    // Try extracting JSON from response
    const match = result.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        console.warn(`UI translation for ${targetLanguage} failed to parse, using English fallback`);
        return texts;
      }
    }
    console.warn(`UI translation for ${targetLanguage} failed to parse, using English fallback`);
    return texts;
  }
}

export async function healthCheck(retries = 2) {
  const systemPrompt = "Reply with exactly the word READY and nothing else.";
  for (let i = 0; i <= retries; i++) {
    try {
      const response = await chat(systemPrompt, "ping", 50);
      if (response.toUpperCase().includes("READY")) {
        return true;
      }
      throw new Error(`expected "READY", got "${response}"`);
    } catch (e) {
      if (i < retries) {
        console.warn(`Health check attempt ${i + 1} failed: ${e.message}, retrying...`);
        continue;
      }
      throw new Error(`AI provider health check failed after ${retries + 1} attempts: ${e.message}`);
    }
  }
}
