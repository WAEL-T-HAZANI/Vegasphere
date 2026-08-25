const { loadAiIndexes } = require("./ai/index-loader.js");
const {
  lookupSmartReplies,
  getEngineStats,
} = require("./ai/lookup.js");
const {
  generateSmartRepliesLlm,
  shouldUseGroqSmartReplies,
  getGroqStatus,
  normalizeReplyList,
} = require("./ai/groq-llm.js");

const AI_SMART_REPLY_CACHE_MS = Math.max(
  0,
  Number(process.env.AI_SMART_REPLY_CACHE_MS || 12000),
);

const smartReplyCache = new Map();

function cacheGet(key) {
  const hit = smartReplyCache.get(key);
  if (!hit) return null;
  if (hit.expiresAt <= Date.now()) {
    smartReplyCache.delete(key);
    return null;
  }
  return hit.value;
}

function cacheSet(key, value) {
  if (!AI_SMART_REPLY_CACHE_MS) return;
  smartReplyCache.set(key, {
    value,
    expiresAt: Date.now() + AI_SMART_REPLY_CACHE_MS,
  });
  if (smartReplyCache.size > 500) {
    const firstKey = smartReplyCache.keys().next().value;
    if (firstKey) smartReplyCache.delete(firstKey);
  }
}

function sanitizeLine(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 280);
}

function mapMessageEntry(item) {
  const role = String(item.role || item.sender || "").toLowerCase();
  return {
    sender: ["me", "user", "assistant"].includes(role) ? "me" : "them",
    text: sanitizeLine(item.content || item.text),
  };
}

function rotateReplies(replies, seed) {
  const list = normalizeReplyList(replies);
  if (list.length <= 1) return list.slice(0, 3);
  const offset = Number(seed) % list.length;
  return [...list.slice(offset), ...list.slice(0, offset)].slice(0, 3);
}

async function smartReplies(req, res) {
  loadAiIndexes();

  const body = req.body || {};
  const { language = "en" } = body;

  const toneRaw = String(body.tone || "")
    .trim()
    .toLowerCase();
  const tone = ["default", "friendly", "formal", "short", "funny"].includes(
    toneRaw,
  )
    ? toneRaw
    : "default";

  const regenerate = body.regenerate === true;
  const variationSeed = Math.max(
    0,
    Math.min(9999, Number(body.variationSeed) || 0),
  );

  let trimmedMessages = [];

  if (Array.isArray(body.messages) && body.messages.length) {
    trimmedMessages = body.messages
      .map(mapMessageEntry)
      .filter((item) => item.text);
  } else if (Array.isArray(body.recentMessages)) {
    trimmedMessages = body.recentMessages
      .map(mapMessageEntry)
      .filter((item) => item.text);
  }

  if (!trimmedMessages.length) {
    return res.json({
      replies: [],
      suggestions: [],
      provider: "local-index",
      dataSource: "smart-replies.json",
      contextPreview: "",
    });
  }

  const conversation = trimmedMessages
    .slice(-16)
    .map((item) => `${item.sender}: ${item.text}`)
    .join("\n");

  const cacheKey = [language, tone, conversation, variationSeed].join("::");

  if (!regenerate) {
    const cached = cacheGet(cacheKey);
    if (cached) {
      return res.json({
        replies: normalizeReplyList(cached.replies),
        suggestions: normalizeReplyList(cached.replies),
        intent: cached.intent,
        provider: cached.provider || "local-index",
        dataSource: cached.dataSource || "smart-replies.json",
        contextPreview: cached.contextPreview || "",
        cached: true,
      });
    }
  }

  try {
    const lookupResult = lookupSmartReplies({
      messages: trimmedMessages,
      language,
      tone,
    });

    let result = lookupResult;

    if (shouldUseGroqSmartReplies({ lookupHit: lookupResult.replies.length > 0 })) {
      const llmResult = await generateSmartRepliesLlm({
        messages: trimmedMessages,
        language,
        tone,
      });
      if (llmResult?.replies?.length) {
        result = {
          ...lookupResult,
          ...llmResult,
          contextPreview: lookupResult.contextPreview,
        };
      }
    }

    const replies = rotateReplies(result.replies, variationSeed);
    const payload = { ...result, replies: normalizeReplyList(replies) };

    cacheSet(cacheKey, payload);

    return res.json({
      replies: payload.replies,
      suggestions: payload.replies,
      intent: payload.intent,
      provider: payload.provider,
      dataSource: payload.dataSource,
      contextPreview: payload.contextPreview || "",
      llm: getGroqStatus(),
    });
  } catch (err) {
    console.warn("smartReplies failed:", err?.message || err);
    return res.json({
      replies: [],
      suggestions: [],
      provider: "local-index",
      dataSource: "smart-replies.json",
      contextPreview: "",
    });
  }
}

module.exports = {
  smartReplies,
  getEngineStats,
  getGroqStatus,
};
