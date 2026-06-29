const {
  generateSmartReplies,
  getDataSource,
} = require("./ai-local-engine.js");

const AI_SMART_REPLY_CACHE_MS = Math.max(
  0,
  Number(process.env.AI_SMART_REPLY_CACHE_MS || 30000),
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

async function smartReplies(req, res) {
  const body = req.body || {};
  const { language = "en" } = body;

  const subject = sanitizeLine(body.subject || "");
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
  const conversationKind = String(body.conversationKind || "")
    .trim()
    .toLowerCase();

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
    const fallback = language.startsWith("ar")
      ? ["👍", "تمام", "شكراً"]
      : ["👍", "Sounds good", "Thanks!"];
    return res.json({
      replies: fallback,
      suggestions: fallback,
      provider: "local",
      dataSource: getDataSource(),
    });
  }

  const conversation = trimmedMessages
    .slice(-12)
    .map((item) => `${item.sender}: ${item.text}`)
    .join("\n");

  const cacheKey = [
    language,
    tone,
    subject,
    conversationKind,
    conversation,
  ].join("::");

  if (!regenerate) {
    const cached = cacheGet(cacheKey);
    if (cached) {
      return res.json({
        replies: cached.replies,
        suggestions: cached.replies,
        intent: cached.intent,
        provider: "local",
        dataSource: cached.dataSource || getDataSource(),
        contextPreview: cached.contextPreview || "",
        cached: true,
      });
    }
  }

  try {
    const result = generateSmartReplies({
      messages: trimmedMessages,
      language,
      tone,
      subject,
      conversationKind,
      variationSeed,
    });

    cacheSet(cacheKey, result);

    return res.json({
      replies: result.replies,
      suggestions: result.replies,
      intent: result.intent,
      provider: "local",
      dataSource: result.dataSource || getDataSource(),
      contextPreview: result.contextPreview || "",
    });
  } catch (err) {
    console.warn("smartReplies failed:", err?.message || err);
    const fallback = language.startsWith("ar")
      ? ["👍", "تمام", "شكراً"]
      : ["👍", "Sounds good", "Thanks!"];
    return res.json({
      replies: fallback,
      suggestions: fallback,
      provider: "local",
      dataSource: "json",
      contextPreview: "",
    });
  }
}

module.exports = {
  smartReplies,
};
