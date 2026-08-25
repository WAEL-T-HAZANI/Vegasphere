/**
 * Shared Groq client (free tier — Llama 3.x) for smart replies + translate.
 * Set GROQ_API_KEY in backend/.env to enable.
 */
const axios = require("axios");

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = String(process.env.GROQ_MODEL || "openai/gpt-oss-20b").trim();

const TONE_HINTS = {
  friendly: "warm and casual",
  formal: "polite and professional",
  short: "very brief, under 8 words each",
  funny: "light and playful",
  default: "natural and conversational",
};

function parseMode(envName, defaultMode = "fallback") {
  const raw = String(process.env[envName] || defaultMode).trim().toLowerCase();
  if (["0", "off", "false", "disabled", "none"].includes(raw)) return "off";
  if (raw === "always") return "always";
  return "fallback";
}

function isGroqConfigured() {
  return Boolean(String(process.env.GROQ_API_KEY || "").trim());
}

function getSmartReplyMode() {
  return parseMode("AI_LLM_SMART_REPLIES", "fallback");
}

function getTranslateMode() {
  return parseMode("AI_LLM_TRANSLATE", "fallback");
}

function shouldUseGroqSmartReplies({ lookupHit }) {
  const mode = getSmartReplyMode();
  if (mode === "off" || !isGroqConfigured()) return false;
  if (mode === "always") return true;
  return !lookupHit;
}

function shouldUseGroqTranslate({ lookupStrong }) {
  const mode = getTranslateMode();
  if (mode === "off" || !isGroqConfigured()) return false;
  if (mode === "always") return true;
  return !lookupStrong;
}

async function callGroqChat({
  system,
  user,
  maxTokens = 400,
  temperature = 0.4,
  jsonMode = false,
}) {
  const apiKey = String(process.env.GROQ_API_KEY || "").trim();
  if (!apiKey) return null;

  const body = {
    model: DEFAULT_MODEL,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature,
    max_tokens: maxTokens,
  };
  if (jsonMode) {
    body.response_format = { type: "json_object" };
  }

  const { data } = await axios.post(
    GROQ_URL,
    body,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: Math.max(5000, Number(process.env.AI_LLM_TIMEOUT_MS || 15000)),
    },
  );

  const choice = data?.choices?.[0];
  return extractAssistantText(choice);
}

function extractAssistantText(choice) {
  const msg = choice?.message || {};
  const content = String(msg.content || "").trim();
  if (content) return content;

  const reasoning = String(msg.reasoning || "").trim();
  if (!reasoning) return null;

  const quoted = extractQuotedStrings(reasoning).filter(
    (line) =>
      line.length >= 12 &&
      line.length <= 140 &&
      !looksLikeMetaLine(line) &&
      !looksLikeJsonLeak(line),
  );
  if (quoted.length) return quoted.slice(-3).join("\n");

  const lines = reasoning
    .split(/\n+/)
    .map((line) => line.replace(/^[\d\-*•.)]+\s*/, "").replace(/^[-–—]\s*/, "").trim())
    .filter((line) => line.length >= 4 && line.length <= 140 && !looksLikeMetaLine(line));
  if (lines.length) return lines.slice(-3).join("\n");

  return null;
}

function looksLikeMetaLine(line) {
  return /^(we need|let'?s|the user|they want|so |probably|maybe|but |i think|note:|important:)/i.test(
    String(line || "").trim(),
  );
}

const MAX_SMART_REPLY_CHARS = 80;

function sanitizeLine(value, maxLen = MAX_SMART_REPLY_CHARS) {
  if (value == null) return "";
  const text =
    typeof value === "string"
      ? value
      : typeof value === "number" || typeof value === "boolean"
        ? String(value)
        : "";
  return text
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLen);
}

function coerceReplyText(item, maxLen = MAX_SMART_REPLY_CHARS) {
  if (item == null) return "";
  if (typeof item === "string") {
    const line = sanitizeLine(item, maxLen);
    return line && !looksLikeJsonLeak(line) ? line : "";
  }
  if (typeof item === "number" || typeof item === "boolean") {
    return sanitizeLine(String(item), maxLen);
  }
  if (typeof item === "object") {
    const obj = item;
    const keys = ["text", "reply", "content", "message", "suggestion", "value", "label", "body"];
    for (const key of keys) {
      const hit = obj[key];
      if (typeof hit === "string" && hit.trim()) {
        return sanitizeLine(hit, maxLen);
      }
    }
    if (Array.isArray(obj.replies) && obj.replies.length) {
      return coerceReplyText(obj.replies[0], maxLen);
    }
  }
  return "";
}

function normalizeReplyList(replies, maxLen = MAX_SMART_REPLY_CHARS) {
  if (!Array.isArray(replies)) return [];
  return replies
    .map((item) => coerceReplyText(item, maxLen))
    .filter(Boolean)
    .slice(0, 3);
}

function looksLikeJsonLeak(value) {
  const s = String(value || "").trim();
  return (
    s.startsWith("{") ||
    s.startsWith("[") ||
    /"replies"\s*:/.test(s)
  );
}

function extractQuotedStrings(fragment) {
  const out = [];
  const re = /"((?:\\.|[^"\\])*)"/g;
  let match = re.exec(fragment);
  while (match) {
    try {
      const decoded = JSON.parse(`"${match[1]}"`);
      if (decoded.trim()) out.push(decoded.trim());
    } catch {
      const plain = match[1].replace(/\\"/g, '"').trim();
      if (plain) out.push(plain);
    }
    match = re.exec(fragment);
  }
  return out;
}

function parseRepliesFromContent(content) {
  const raw = String(content || "").trim();
  if (!raw) return [];

  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) {
      return normalizeReplyList(parsed);
    }
    const list = parsed?.replies || parsed?.suggestions || parsed?.options;
    if (Array.isArray(list)) {
      return normalizeReplyList(list);
    }
    if (list && typeof list === "object") {
      return normalizeReplyList([list]);
    }
  } catch {
    // fall through — model may return truncated JSON
  }

  const partial = cleaned.match(/"replies"\s*:\s*\[([\s\S]*)$/i);
  if (partial?.[1]) {
    const fromPartial = extractQuotedStrings(partial[1])
      .map((line) => sanitizeLine(line))
      .filter(Boolean)
      .slice(0, 3);
    if (fromPartial.length) return fromPartial;
  }

  const lines = cleaned
    .split(/\n+/)
    .map((line) => line.replace(/^[\d\-*•.)]+\s*/, "").trim())
    .map((line) => sanitizeLine(line))
    .filter((line) => line && !looksLikeJsonLeak(line))
    .slice(0, 3);
  if (lines.length) return lines;

  return [];
}

async function generateSmartRepliesLlm({ messages = [], language = "en", tone = "default" }) {
  const conversation = messages
    .slice(-16)
    .map((item) => `${item.sender}: ${item.text}`)
    .join("\n");

  if (!conversation.trim()) return null;

  const langHint = String(language || "en").toLowerCase().startsWith("ar")
    ? "Arabic"
    : "English";
  const toneHint = TONE_HINTS[tone] || TONE_HINTS.default;

  const system = [
    "You are a smart-reply assistant for a messaging app.",
    "Write exactly 3 very short reply options the user could send next.",
    `Language: ${langHint}. Tone: ${toneHint}.`,
    `Each reply MUST be under ${MAX_SMART_REPLY_CHARS} characters — short chat bubbles, not paragraphs.`,
    "Return exactly 3 lines. One reply per line. No numbering, bullets, labels, JSON, or reasoning.",
    "Put the 3 replies in your answer text only.",
  ].join(" ");

  try {
    const content = await callGroqChat({
      system,
      user: `Conversation:\n${conversation}\n\nSuggest 3 short replies.`,
      maxTokens: 1024,
      temperature: 0.55,
      jsonMode: false,
    });
    const replies = normalizeReplyList(parseRepliesFromContent(content));
    if (!replies.length) return null;

    return {
      replies,
      intent: "llm-generated",
      provider: "groq-llm",
      dataSource: DEFAULT_MODEL,
      model: DEFAULT_MODEL,
    };
  } catch (err) {
    const detail =
      err?.response?.data?.error?.message ||
      err?.response?.data?.message ||
      err?.message ||
      String(err);
    console.warn("[ai-llm] Groq smart-replies failed:", detail);
    return null;
  }
}

const LANG_NAMES = {
  en: "English",
  ar: "Arabic",
};

async function translateWithGroqLlm({ text, sourceLanguage, targetLanguage }) {
  const trimmed = String(text || "").trim();
  if (!trimmed) return null;

  const src = String(sourceLanguage || "en").split("-")[0].toLowerCase();
  const tgt = String(targetLanguage || "ar").split("-")[0].toLowerCase();
  if (src !== "en" && src !== "ar") return null;
  if (tgt !== "en" && tgt !== "ar") return null;
  if (src === tgt) return null;

  const srcName = LANG_NAMES[src] || src;
  const tgtName = LANG_NAMES[tgt] || tgt;

  const system = [
    "You are a professional translator for chat messages.",
    `Translate from ${srcName} to ${tgtName}.`,
    "Return ONLY the translation — no quotes, labels, or explanation.",
    "Keep emojis and names unchanged. Match natural chat tone.",
  ].join(" ");

  try {
    const content = await callGroqChat({
      system,
      user: trimmed.slice(0, 4000),
      maxTokens: 512,
      temperature: 0.2,
    });
    const translated = sanitizeLine(content, 5000);
    if (!translated) return null;

    return {
      translatedText: translated,
      method: "groq-llm",
      provider: "groq-llm",
      dataSource: DEFAULT_MODEL,
      model: DEFAULT_MODEL,
      detectedSource: src,
      targetLanguage: tgt,
    };
  } catch (err) {
    const detail =
      err?.response?.data?.error?.message ||
      err?.response?.data?.message ||
      err?.message ||
      String(err);
    console.warn("[ai-llm] Groq translate failed:", detail);
    return null;
  }
}

function getGroqStatus() {
  return {
    configured: isGroqConfigured(),
    model: DEFAULT_MODEL,
    provider: "groq",
    smartReplies: getSmartReplyMode(),
    translate: getTranslateMode(),
  };
}

module.exports = {
  DEFAULT_MODEL,
  isGroqConfigured,
  getSmartReplyMode,
  getTranslateMode,
  shouldUseGroqSmartReplies,
  shouldUseGroqTranslate,
  generateSmartRepliesLlm,
  translateWithGroqLlm,
  getGroqStatus,
  coerceReplyText,
  normalizeReplyList,
};
