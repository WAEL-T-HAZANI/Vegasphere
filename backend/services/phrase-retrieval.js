/**
 * Retrieval-based smart replies from vega-dict phrases (Tatoeba/MUSE corpus).
 * Inspired by multi-turn response selection (IMN/DIM) but lightweight:
 * 1) candidate generation via indexed prefix search on phrases.src_key
 * 2) context-aware ranking against the full thread
 */
const dictStore = require("./dict-store.js");

const WELLBEING_PREFIXES = {
  en: [
    "i am fine",
    "i am good",
    "i am ok",
    "i am well",
    "i'm fine",
    "i'm good",
    "i'm ok",
    "i'm well",
    "i'm doing fine",
    "i'm doing well",
    "i'm doing ok",
    "pretty good",
    "not bad",
    "can't complain",
    "cant complain",
    "doing well",
    "doing fine",
    "doing ok",
    "doing okay",
    "all good",
    "same here",
    "me too",
    "thanks for asking",
    "good thanks",
    "great thanks",
    "well thanks",
    "yeah pretty good",
    "honestly pretty good",
    "can't complain really",
  ],
  ar: [
    "بخير",
    "تمام",
    "الحمد لله",
    "أنا بخير",
    "منيح",
    "تمام الحمد",
    "الحمد لله بخير",
    "بخير الحمد",
  ],
};

const REPLY_PREFIXES = WELLBEING_PREFIXES;

const GREETING_RE =
  /^(good morning|good evening|good night|goodbye|hello|hi there|hey there|مرحب|صباح|مساء)/i;

const SEARCH_STOPWORDS = new Set([
  "hello",
  "going",
  "how",
  "what",
  "when",
  "where",
  "there",
  "this",
  "that",
  "just",
  "really",
  "very",
  "with",
  "have",
  "from",
  "about",
  "your",
  "you",
  "are",
  "was",
  "were",
  "will",
  "would",
  "could",
  "should",
  "the",
  "and",
  "for",
  "not",
  "but",
  "hey",
  "sup",
  "happy",
  "mostly",
  "sound",
  "living",
  "dream",
  "good",
  "مرحب",
  "أهلا",
  "كيف",
  "شو",
]);

const NEGATIVE_RE =
  /costs|stress|isn't easy|isnt easy|die|death|hate|sad|depress|fail|wrong|bad day|unpleasant|tiring|expensive|misleading|isn't true|isnt true|well aware|doing the|i am not|i'm not|im not|can't you|cant you/i;

const ANSWER_SHAPE_RE = {
  en: /^(i am|i'm|im |yeah|pretty |not bad|can't |cant |same |well |honestly |all good|doing |me too|good |great |fine |thanks |surviving|living |same here|i hear|fair |true|right|haha|lol )/i,
  ar: /^(أنا |بخير|تمام|الحمد|فعلاً|ههه|صح|أكيد|ولا |عادي|نفس )/,
};

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

function isMeSender(sender) {
  const role = String(sender || "").toLowerCase();
  return ["me", "user", "assistant"].includes(role);
}

function isWellbeingQuestion(text) {
  const key = normalizeKey(text);
  return (
    /\b(how are you|how r u|how are u|how you doing|how s it going|how is it going|what s up|whats up)\b/.test(
      key,
    ) ||
    /\b(كيف حالك|كيفك|شلونك|شو أخبارك|كيف الحال)\b/.test(key) ||
    /\?/.test(String(text || ""))
  );
}

function tokenize(text) {
  return normalizeKey(text)
    .split(/\s+/)
    .filter((t) => t.length >= 3);
}

function buildSearchTokens(messages, stats) {
  const out = new Set(Array.isArray(stats?.topics) ? stats.topics : []);
  for (const item of (messages || []).slice(-14)) {
    for (const token of tokenize(item?.text || item?.content || "")) {
      if (token.length >= 4 && !SEARCH_STOPWORDS.has(token)) out.add(token);
    }
  }
  return [...out].slice(0, 8);
}

function buildContextProfile(messages, stats) {
  const transcriptTokens = new Set();
  const myRecent = new Set();
  for (const item of (messages || []).slice(-14)) {
    const text = normalizeText(item?.text || item?.content);
    if (!text) continue;
    const tokens = tokenize(text);
    if (isMeSender(item?.sender || item?.role)) {
      myRecent.add(normalizeKey(text));
      tokens.forEach((t) => transcriptTokens.add(t));
    } else {
      tokens.forEach((t) => transcriptTokens.add(t));
    }
  }
  return {
    transcriptTokens,
    topics: new Set(stats?.topics || []),
    lastIncoming: normalizeKey(stats?.lastIncoming || ""),
    lastIncomingTokens: tokenize(stats?.lastIncoming || ""),
    myRecent,
    ongoing: Boolean(stats?.ongoing),
    tone: stats?.tone || "default",
    isQuestion: isWellbeingQuestion(stats?.lastIncoming || ""),
  };
}

function scorePhrase(phrase, ctx, lang = "en") {
  const key = normalizeKey(phrase);
  if (!key || key.length < 3) return -999;

  if (ctx.myRecent.has(key)) return -999;
  if (key.length > 90) return -999;
  if (ctx.ongoing && GREETING_RE.test(key)) return -999;

  let score = 0;
  const phraseTokens = tokenize(phrase);
  const answerShape = ANSWER_SHAPE_RE[lang] || ANSWER_SHAPE_RE.en;

  for (const topic of ctx.topics) {
    if (key.includes(topic)) score += 8;
  }

  for (const token of phraseTokens) {
    if (ctx.lastIncomingTokens.includes(token)) score += 1;
    if (ctx.transcriptTokens.has(token)) score += 1;
  }

  if (ctx.isQuestion) {
    if (answerShape.test(key)) score += 8;
    if (key.endsWith("?") || key.endsWith("؟")) score -= 4;
    if (phraseTokens.length >= 3 && phraseTokens.length <= 10) score += 4;
    if (phraseTokens.length > 12) score -= 3;
  }

  if (ctx.tone === "funny") {
    if (/😄|😂|🤣|haha|lol|mostly|dream|surviving|honestly|ههه|تقريباً/i.test(phrase)) {
      score += 4;
    }
  }

  if (ctx.ongoing && phraseTokens.length <= 2) score -= 2;

  if (NEGATIVE_RE.test(key) && ctx.tone !== "formal") score -= 8;

  return score;
}

function isChatworthyPhrase(phrase, ctx, lang = "en") {
  const key = normalizeKey(phrase);
  if (!key || key.length > 72) return false;
  if (NEGATIVE_RE.test(key)) return false;
  if (ctx.ongoing && GREETING_RE.test(key)) return false;

  const specificTopics = [...(ctx.topics || [])].filter(
    (t) => t.length >= 5 && !SEARCH_STOPWORDS.has(t),
  );
  if (specificTopics.some((topic) => key.includes(topic))) return true;

  if (ctx.isQuestion) {
    const prefixes = WELLBEING_PREFIXES[lang] || WELLBEING_PREFIXES.en;
    const matched = prefixes.find((prefix) => {
      const p = normalizeKey(prefix);
      return key === p || key.startsWith(`${p} `);
    });
    if (!matched) return false;
    const p = normalizeKey(matched);
    if (key === p) return true;
    const tail = key.slice(p.length + 1).trim();
    const tailWords = tail.split(/\s+/).filter(Boolean);
    return tailWords.length <= 3;
  }

  return false;
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

function retrievePhraseReplies({
  messages = [],
  language = "en",
  stats = {},
  variationSeed = 0,
}) {
  if (!dictStore.isAvailable()) return [];

  const lang = String(language || "en").startsWith("ar") ? "ar" : "en";
  const ctx = buildContextProfile(messages, stats);
  const searchTokens = buildSearchTokens(messages, stats);
  const prefixes = REPLY_PREFIXES[lang] || REPLY_PREFIXES.en;

  const tokenCandidates =
    ctx.isQuestion && ctx.ongoing
      ? []
      : dictStore.searchReplyPhraseCandidates(lang, searchTokens, {
          limit: 80,
        });

  const prefixCandidates = dictStore.searchReplyPhraseCandidates(
    lang,
    prefixes,
    { limit: 100 },
  );

  const exact = normalizeKey(stats?.lastIncoming || "");
  const exactCandidates = exact
    ? dictStore.searchReplyPhraseCandidates(lang, [exact], { limit: 20 })
    : [];

  const seen = new Set();
  const merged = [];
  for (const phrase of [
    ...tokenCandidates,
    ...prefixCandidates,
    ...exactCandidates,
  ]) {
    const key = normalizeKey(phrase);
    if (!key || seen.has(key)) continue;
    if (!isChatworthyPhrase(phrase, ctx, lang)) continue;
    seen.add(key);
    merged.push(String(phrase).trim());
  }

  const ranked = merged
    .map((phrase) => ({ phrase, score: scorePhrase(phrase, ctx, lang) }))
    .filter((row) => row.score >= 6)
    .sort((a, b) => b.score - a.score);

  if (ranked.length < 2) return [];

  const seed = hashSeed(
    `${ctx.lastIncoming}::${[...ctx.topics].join(",")}::${variationSeed}`,
  );
  const topPool = ranked.slice(0, 12).map((row) => row.phrase);
  return rotatePick(topPool, seed).slice(0, 3);
}

module.exports = {
  retrievePhraseReplies,
  buildSearchTokens,
  scorePhrase,
};
