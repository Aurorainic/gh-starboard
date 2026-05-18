const BASE_URL = process.env.AI_API_BASE_URL || "https://api.openai.com/v1";
const API_KEY = process.env.AI_API_KEY;
const MODEL = process.env.AI_MODEL || "gpt-4o-mini";

async function chat(systemPrompt, userMessage) {
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
      max_tokens: 800,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API error ${res.status}: ${body}`);
  }

  const data = await res.json();
  return data.choices[0].message.content.trim();
}

export async function generateIntroZh(repoName, repoDescription, _readmePreview) {
  const prompt = `你是 GitHub 仓库简介生成器。用中文写一段 50-100 字的简介，概括仓库的用途和特点。直接返回简介文本，不要带前缀或引号。`;
  const msg = `仓库：${repoName}\n描述：${repoDescription || "无"}`;
  return chat(prompt, msg);
}

export async function translateToEn(text) {
  const prompt = `You are a translator. Translate the following Chinese Markdown text to English. Preserve all Markdown formatting (links, bold, italic, code blocks, etc.) exactly. Return only the translated text, no explanations.`;
  return chat(prompt, text);
}
