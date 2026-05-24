const BASE_URL = process.env.AI_API_BASE_URL || "https://api.openai.com/v1";
const API_KEY = process.env.AI_API_KEY;
const MODEL = process.env.AI_MODEL || "gpt-4o-mini";

async function chat(systemPrompt, userMessage, maxTokens = 800, temperature = 0.7) {
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
      temperature,
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

export async function generateIntroAndCategory(
  language,
  repoName,
  repoDescription,
  repoTopics,
  repoLanguage,
  existingCategories
) {
  const langPrompt =
    LANG_PROMPTS[language] ||
    `Write a 50-100 word summary of the repository in ${language} language. Describe its purpose and key features.`;
  const categoryList =
    existingCategories.length > 0
      ? existingCategories.join(", ")
      : "No existing categories yet";

  const systemPrompt = `You are a GitHub repository analyst. Do TWO tasks:

TASK 1 — Summary: ${langPrompt}

TASK 2 — Category: Classify the repository into a category.
Existing categories: ${categoryList}
Rules:
- Use an existing category ONLY if it is a genuinely specific match
- If none fit, create a NEW concise category (1-2 words, Title Case)
- Aim for granularity (e.g. "React UI Library" not "Software")
- Use the repo's topics as hints

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
  return { intro: intro || result.split("|||")[0].trim(), category };
}

export async function translateText(text, targetLanguage, sourceLanguage = "zh-CN") {
  const sourceName = LANG_NAMES[sourceLanguage] || sourceLanguage;
  const targetName = LANG_NAMES[targetLanguage] || targetLanguage;
  const systemPrompt = `Translate the following ${sourceName} Markdown text to ${targetName}. Preserve all Markdown formatting (links, bold, italic, code blocks, etc.) exactly. Return only the translated text, no explanations.`;
  return chat(systemPrompt, text);
}

export async function suggestCategory(repoName, description, topics, language, existingCategories) {
  const categoryList = existingCategories.length > 0
    ? existingCategories.join(", ")
    : "No existing categories yet";
  const systemPrompt = `You are a GitHub repository classifier. Given a repo's name, description, programming language, and topics, assign it to the most specific fitting category.

Existing categories: ${categoryList}

Rules:
- Use an existing category ONLY if it is a genuinely specific match (e.g. both are "Machine Learning" tools). Generic overlap is NOT enough.
- If no existing category is a specific match, create a NEW concise category (1-2 words, Title Case) that accurately describes this repo's domain.
- Aim for granularity: "React UI Library" is better than "Software". "CLI Tool" is better than "Developer Tools".
- Use the repo's topics as strong hints for the category name.
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
    if (match) return JSON.parse(match[0]);
    throw new Error("Failed to parse UI translation response as JSON");
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
