/**
 * Optional LLM fallback for smart replies (Gemini or OpenAI).
 * Enable with AI_SMART_REPLY_LLM=gemini|openai and the matching API key.
 */
const https = require("https");

const LLM_PROVIDER = String(process.env.AI_SMART_REPLY_LLM || "off")
  .trim()
  .toLowerCase();
const GEMINI_API_KEY = String(process.env.GEMINI_API_KEY || "").trim();
const OPENAI_API_KEY = String(process.env.OPENAI_API_KEY || "").trim();
const LLM_TIMEOUT_MS = Math.min(
  12000,
  Math.max(2000, Number(process.env.AI_SMART_REPLY_LLM_TIMEOUT_MS || 4500)),
);

function isEnabled() {
  if (LLM_PROVIDER === "gemini" && GEMINI_API_KEY) return true;
  if (LLM_PROVIDER === "openai" && OPENAI_API_KEY) return true;
  if (LLM_PROVIDER === "auto") {
    return Boolean(GEMINI_API_KEY || OPENAI_API_KEY);
  }
  return false;
}

function postJson(url, headers, body) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const payload = JSON.stringify(body);
    const req = https.request(
      {
        hostname: parsed.hostname,
        path: `${parsed.pathname}${parsed.search}`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
          ...headers,
        },
        timeout: LLM_TIMEOUT_MS,
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => {
          raw += chunk;
        });
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, json: JSON.parse(raw || "{}") });
          } catch (err) {
            reject(err);
          }
        });
      },
    );
    req.on("timeout", () => req.destroy(new Error("LLM timeout")));
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

function buildPrompt({ messages, language, tone, subject }) {
  const lang = String(language || "en").startsWith("ar") ? "Arabic" : "English";
  const thread = (messages || [])
    .slice(-14)
    .map((m) => {
      const side = String(m.sender || "them").toLowerCase() === "me" ? "Me" : "Them";
      return `${side}: ${String(m.text || "").trim()}`;
    })
    .filter((line) => line.length > 4)
    .join("\n");

  return [
    "You suggest 3 short chat reply options the user can tap to send.",
    `Reply language: ${lang}. Tone: ${tone || "friendly"}.`,
    subject ? `Chat subject: ${subject}` : "",
    "Rules: each reply under 90 characters; natural messaging style; reference the conversation when possible; no quotes numbering or markdown; return ONLY a JSON array of 3 strings.",
    "Conversation:",
    thread || "(empty)",
  ]
    .filter(Boolean)
    .join("\n");
}

function parseReplyArray(text) {
  const raw = String(text || "").trim();
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];
  try {
    const arr = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(arr)) return [];
    return arr
      .map((s) => String(s || "").replace(/^["']|["']$/g, "").trim())
      .filter((s) => s.length >= 1 && s.length <= 120)
      .slice(0, 3);
  } catch {
    return [];
  }
}

async function callGemini(prompt) {
  const model = String(process.env.GEMINI_SMART_REPLY_MODEL || "gemini-2.0-flash").trim();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;
  const { status, json } = await postJson(url, {}, {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.85,
      maxOutputTokens: 256,
      responseMimeType: "application/json",
    },
  });
  if (status >= 400) {
    throw new Error(json?.error?.message || `Gemini HTTP ${status}`);
  }
  const text =
    json?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
  return parseReplyArray(text);
}

async function callOpenAI(prompt) {
  const model = String(process.env.OPENAI_SMART_REPLY_MODEL || "gpt-4o-mini").trim();
  const { status, json } = await postJson(
    "https://api.openai.com/v1/chat/completions",
    { Authorization: `Bearer ${OPENAI_API_KEY}` },
    {
      model,
      temperature: 0.85,
      max_tokens: 220,
      messages: [
        {
          role: "system",
          content:
            "Return only a JSON array of 3 short chat reply strings. No markdown.",
        },
        { role: "user", content: prompt },
      ],
    },
  );
  if (status >= 400) {
    throw new Error(json?.error?.message || `OpenAI HTTP ${status}`);
  }
  const text = json?.choices?.[0]?.message?.content || "";
  return parseReplyArray(text);
}

async function generateLlmSmartReplies(ctx) {
  if (!isEnabled()) return null;

  const prompt = buildPrompt(ctx);
  let replies = [];

  try {
    if (
      LLM_PROVIDER === "gemini" ||
      (LLM_PROVIDER === "auto" && GEMINI_API_KEY)
    ) {
      replies = await callGemini(prompt);
    } else if (LLM_PROVIDER === "openai" || OPENAI_API_KEY) {
      replies = await callOpenAI(prompt);
    }
  } catch (err) {
    console.warn("[ai] smart-reply LLM failed:", err?.message || err);
    return null;
  }

  if (replies.length < 2) return null;

  return {
    replies: replies.slice(0, 3),
    intent: "llm",
    provider: LLM_PROVIDER === "auto" ? (GEMINI_API_KEY ? "gemini" : "openai") : LLM_PROVIDER,
    dataSource: "llm",
    contextPreview: ctx.contextPreview || "",
  };
}

module.exports = {
  isEnabled,
  generateLlmSmartReplies,
};
