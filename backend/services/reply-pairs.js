/**
 * DailyDialog-style (context → reply) lookup from curated JSON.
 * Fast in-memory index; no SQLite required.
 */
const fs = require("fs");
const path = require("path");

const DATA_PATH = path.join(__dirname, "..", "data", "replyPairs.json");

let loaded = false;
/** @type {Array<object>} */
let pairs = [];

function normalizeText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeKey(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s']/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function readJson() {
  if (!fs.existsSync(DATA_PATH)) return null;
  try {
    return JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
  } catch {
    return null;
  }
}

function loadPairs() {
  if (loaded) return;
  const json = readJson();
  pairs = Array.isArray(json?.pairs) ? json.pairs : [];
  loaded = true;
}

function reloadPairs() {
  loaded = false;
  pairs = [];
  loadPairs();
}

function isMeSender(sender) {
  const role = String(sender || "").toLowerCase();
  return ["me", "user", "assistant"].includes(role);
}

function hashSeed(text) {
  let h = 0;
  const s = String(text || "");
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return h;
}

function rotatePick(items, seed) {
  if (!items.length) return [];
  const offset = Math.abs(seed) % items.length;
  const out = [];
  for (let i = 0; i < items.length; i += 1) {
    out.push(items[(offset + i) % items.length]);
  }
  return out;
}

function matchPattern(text, pattern) {
  const key = normalizeKey(text);
  const p = normalizeKey(pattern);
  if (!key || !p) return false;
  if (key === p) return true;
  if (key.includes(p) || p.includes(key)) return true;
  try {
    return new RegExp(pattern, "i").test(text);
  } catch {
    return false;
  }
}

function scorePair(entry, ctx) {
  let score = 0;
  const last = ctx.lastIncomingKey;
  if (!last) return -999;

  for (const pat of entry.lastPatterns || []) {
    if (matchPattern(ctx.lastIncoming, pat)) score += 12;
  }

  if (entry.lastExact && normalizeKey(entry.lastExact) === last) score += 20;

  const topics = entry.topicsAny || [];
  if (topics.length) {
    const hit = topics.some(
      (t) =>
        ctx.topicSet.has(normalizeKey(t)) ||
        last.includes(normalizeKey(t)) ||
        ctx.transcriptKey.includes(normalizeKey(t)),
    );
    if (!hit) return -999;
    score += 10;
  }

  for (const kw of entry.contextAny || []) {
    const k = normalizeKey(kw);
    if (k && ctx.transcriptKey.includes(k)) score += 4;
  }

  if (entry.minDepth && ctx.depth < entry.minDepth) return -999;
  if (entry.maxDepth && ctx.depth > entry.maxDepth) return -999;

  if (entry.requiresOngoing && !ctx.ongoing) score -= 6;
  if (entry.requiresQuestion && !ctx.isQuestion) return -999;

  return score;
}

function buildCtx(messages, stats, language) {
  const lang = String(language || "en").startsWith("ar") ? "ar" : "en";
  const lastIncoming = normalizeText(stats?.lastIncoming || "");
  const transcript = (messages || [])
    .slice(-12)
    .map((m) => normalizeText(m?.text || m?.content))
    .filter(Boolean)
    .join(" ");
  const topicSet = new Set(
    (stats?.topics || []).map((t) => normalizeKey(t)).filter(Boolean),
  );

  return {
    lang,
    depth: stats?.depth || 0,
    ongoing: Boolean(stats?.ongoing),
    isQuestion: /\?|؟/.test(lastIncoming),
    lastIncoming,
    lastIncomingKey: normalizeKey(lastIncoming),
    transcriptKey: normalizeKey(transcript),
    topicSet,
  };
}

function retrieveReplyPairs({
  messages = [],
  language = "en",
  stats = {},
  tone = "default",
  variationSeed = 0,
}) {
  loadPairs();
  if (!pairs.length) return [];

  const ctx = buildCtx(messages, stats, language);
  if (!ctx.lastIncomingKey) return [];

  const ranked = pairs
    .map((entry) => ({ entry, score: scorePair(entry, ctx) }))
    .filter((row) => row.score >= 10)
    .sort((a, b) => b.score - a.score);

  if (!ranked.length) return [];

  const best = ranked[0].entry;
  const pool =
    best.replies?.[ctx.lang]?.[tone] ||
    best.replies?.[ctx.lang]?.default ||
    best.replies?.[ctx.lang] ||
    best.replies?.en?.default ||
    best.replies?.en ||
    [];

  const list = Array.isArray(pool) ? pool.filter(Boolean) : [];
  if (list.length < 2) return list.slice(0, 3);

  const seed = hashSeed(
    `${ctx.lastIncomingKey}::${[...ctx.topicSet].join(",")}::${tone}::${variationSeed}`,
  );
  return rotatePick(list, seed).slice(0, 3);
}

function isWeakLocalResult(result, stats) {
  if (!result?.replies?.length) return true;
  if (result.replies.length < 2) return true;

  const weakIntents = new Set([
    "how_are_you",
    "greeting_general",
    "greeting_morning",
    "greeting_evening",
    null,
  ]);

  if (stats?.ongoing && weakIntents.has(result.intent)) {
    const genericRe = /^(doing well|all good|pretty good|sounds good|👍|تمام|بخير)/i;
    const genericCount = result.replies.filter((r) => genericRe.test(r)).length;
    if (genericCount >= 2) return true;
  }

  return false;
}

module.exports = {
  retrieveReplyPairs,
  reloadPairs,
  isWeakLocalResult,
};
