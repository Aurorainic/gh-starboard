const BASE_URL = process.env.AI_API_BASE_URL || "https://api.openai.com/v1";
const API_KEY = process.env.AI_API_KEY;
const MODEL = process.env.AI_MODEL || "gpt-4o-mini";

async function chat(systemPrompt, userMessage, maxTokens = 800) {
  if (!API_KEY) {
    throw new Error("AI_API_KEY not set");
  }

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
      temperature: 0.7,
      max_tokens: maxTokens,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API error ${res.status}: ${body}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (content == null) {
    throw new Error("API returned null content");
  }
  return content.trim();
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

export async function translateText(text, targetLanguage, sourceLanguage = "zh-CN") {
  const sourceName = LANG_NAMES[sourceLanguage] || sourceLanguage;
  const targetName = LANG_NAMES[targetLanguage] || targetLanguage;
  const systemPrompt = `Translate the following ${sourceName} Markdown text to ${targetName}. Preserve all Markdown formatting (links, bold, italic, code blocks, etc.) exactly. Return only the translated text, no explanations.`;
  return chat(systemPrompt, text);
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
