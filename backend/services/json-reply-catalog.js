/**
 * Curated smart-reply phrases from backend/data JSON files.
 * Primary reply source: smartReplies.json + ai-supplements.json
 */
const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");

let loaded = false;
/** @type {{ en: string[], ar: string[] }} */
let catalog = { en: [], ar: [] };

const GREETING_RE =
  /^(good morning|good evening|good night|goodbye|hello|hi there|hey there|مرحب|صباح|مساء)/i;

const WELLBEING_PREFIXES = {
  en: [
    "i am fine",
    "i am good",
    "i'm fine",
    "i'm good",
    "i'm doing well",
    "i'm doing fine",
    "pretty good",
    "not bad",
    "can't complain",
    "all good",
    "same here",
    "doing well",
    "doing fine",
    "good thanks",
    "great thanks",
  ],
  ar: ["بخير", "تمام", "الحمد لله", "أنا بخير", "منيح"],
};

function readJson(file) {
  const full = path.join(DATA_DIR, file);
  if (!fs.existsSync(full)) return null;
  try {
    return JSON.parse(fs.readFileSync(full, "utf8"));
  } catch {
    return null;
  }
}

function normalizeKey(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}\s']/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function addPhrase(map, text) {
  const display = normalizeText(text);
  const key = normalizeKey(display);
  if (!key || key.length < 2 || key.length > 72) return;
  if (!map.has(key)) map.set(key, display);
}

function collectSupplementPhrases(json, lang, map) {
  if (!json?.phrases) return;
  for (const [pair, entries] of Object.entries(json.phrases)) {
    if (!pair.startsWith(`${lang}_to_`) || typeof entries !== "object") continue;
    for (const phrase of Object.keys(entries)) addPhrase(map, phrase);
  }
}

function collectIntentReplies(json, mapEn, mapAr) {
  for (const intent of json?.intents || []) {
    for (const lang of ["en", "ar"]) {
      const replies = intent?.replies?.[lang];
      if (!replies || typeof replies !== "object") continue;
      const map = lang === "ar" ? mapAr : mapEn;
      for (const pool of Object.values(replies)) {
        if (!Array.isArray(pool)) continue;
        for (const line of pool) addPhrase(map, line);
      }
    }
  }
}

function loadCatalog() {
  if (loaded) return catalog;

  const enMap = new Map();
  const arMap = new Map();

  const smart = readJson("smartReplies.json");
  const supplements = readJson("ai-supplements.json");

  collectIntentReplies(smart, enMap, arMap);
  collectIntentReplies(supplements, enMap, arMap);
  collectSupplementPhrases(supplements, "en", enMap);
  collectSupplementPhrases(supplements, "ar", arMap);

  catalog = {
    en: [...enMap.values()],
    ar: [...arMap.values()],
  };
  loaded = true;
  return catalog;
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

function scorePhrase(phrase, ctx, lang) {
  const key = normalizeKey(phrase);
  if (!key) return -999;

  let score = 0;
  const tokens = key.split(/\s+/).filter(Boolean);
  const incoming = normalizeKey(ctx.lastIncoming || "");
  const incomingTokens = incoming.split(/\s+/).filter(Boolean);

  if (incoming && (key.includes(incoming) || incoming.includes(key))) score += 40;

  for (const token of tokens) {
    if (incomingTokens.includes(token)) score += 3;
    if (ctx.transcriptTokens?.has(token)) score += 2;
    if (ctx.topics?.includes(token)) score += 4;
  }

  if (ctx.isQuestion) {
    const prefixes = WELLBEING_PREFIXES[lang] || WELLBEING_PREFIXES.en;
    const matched = prefixes.find((prefix) => {
      const p = normalizeKey(prefix);
      return key === p || key.startsWith(`${p} `);
    });
    if (matched) score += 12;
    if (key.endsWith("?") || key.endsWith("؟")) score -= 3;
    if (tokens.length >= 3 && tokens.length <= 12) score += 3;
  }

  if (ctx.ongoing && GREETING_RE.test(key)) score -= 20;
  if (ctx.ongoing && tokens.length <= 2 && !ctx.isQuestion) score -= 2;

  if (ctx.tone === "funny") {
    if (/😄|😂|mostly|dream|surviving|honestly|ههه|تقريباً/i.test(phrase)) {
      score += 5;
    }
  }

  return score;
}

function isChatworthy(phrase, ctx, lang) {
  const key = normalizeKey(phrase);
  if (!key || key.length > 72) return false;
  if (ctx.ongoing && GREETING_RE.test(key)) return false;

  const specificTopics = (ctx.topics || []).filter((t) => t.length >= 5);
  if (specificTopics.some((topic) => key.includes(topic))) return true;

  if (ctx.isQuestion) {
    const prefixes = WELLBEING_PREFIXES[lang] || WELLBEING_PREFIXES.en;
    const key = normalizeKey(phrase);
    const matched = prefixes.find((prefix) => {
      const p = normalizeKey(prefix);
      return key === p || key.startsWith(`${p} `);
    });
    if (!matched) return false;
    const p = normalizeKey(matched);
    if (key === p) return true;
    const tail = key.slice(p.length + 1).trim();
    return tail.split(/\s+/).filter(Boolean).length <= 3;
  }

  return scorePhrase(phrase, ctx, lang) >= 6;
}

function retrieveJsonPhraseReplies({
  messages = [],
  language = "en",
  stats = {},
  variationSeed = 0,
  lastText = "",
}) {
  loadCatalog();

  const lang = String(language || "en").startsWith("ar") ? "ar" : "en";
  const pool = catalog[lang] || catalog.en;
  if (!pool.length) return [];

  const incoming = normalizeText(lastText || stats?.lastIncoming || "");
  const transcriptTokens = new Set();
  for (const item of messages.slice(-12)) {
    const text = normalizeKey(item?.text || item?.content);
    for (const token of text.split(/\s+/)) {
      if (token.length >= 3) transcriptTokens.add(token);
    }
  }

  const ctx = {
    lastIncoming: incoming,
    transcriptTokens,
    topics: stats?.topics || [],
    ongoing: Boolean(stats?.ongoing),
    isQuestion: /\?|؟/.test(incoming) || /how|what|why|when|where|كيف|شو|لماذا/i.test(incoming),
    tone: stats?.tone || "default",
  };

  const scored = [];
  for (const phrase of pool) {
    if (!isChatworthy(phrase, ctx, lang)) continue;
    const score = scorePhrase(phrase, ctx, lang);
    if (score >= 6) scored.push({ phrase, score });
  }

  scored.sort((a, b) => b.score - a.score);
  const seed = hashSeed(`${incoming}::${lang}::${variationSeed}`);
  const top = rotatePick(
    scored.slice(0, 24).map((row) => row.phrase),
    seed,
  );

  return top.slice(0, 3);
}

module.exports = {
  loadCatalog,
  retrieveJsonPhraseReplies,
};
