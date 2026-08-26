const {
  normalizeWhitespace,
  normalizeLookupKey,
  normalizeSmartReplyKey,
  smartReplyKeyVariants,
  prepareTranslateInput,
  detectScript,
  wordCount,
  isMeSender,
} = require("./normalize.js");
const {
  getSmartReplyEntries,
  getTranslateMaps,
  getAiIndexStats,
} = require("./index-loader.js");
const { applyToneToReplies } = require("./tone.js");

const MAX_REPLY_LEN = 280;
const MAX_LOOKUP_KEY_CHARS = 120;
const MAX_PHRASE_WINDOW = 12;
const MAX_TRANSLATE_WORDS = 50;

const STOPWORDS = new Set([
  "i", "a", "an", "the", "on", "in", "at", "to", "am", "is", "are", "was", "were",
  "it", "he", "she", "we", "they", "my", "your", "with", "for", "of", "and", "or",
  "but", "be", "been", "being", "have", "has", "had", "do", "does", "did", "will",
  "would", "could", "should", "may", "might", "must", "can", "me", "him", "her",
  "us", "them", "this", "that", "these", "those",
]);

const FILLERS = new Set(["ugh", "um", "uh", "hmm", "erm", "ah", "oh", "wow", "lol"]);

const translateCache = new Map();
const TRANSLATE_CACHE_MAX = 2000;

function getLastIncomingMessage(messages) {
  const list = Array.isArray(messages) ? messages : [];
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const item = list[i];
    if (isMeSender(item?.sender || item?.role)) continue;
    const text = normalizeWhitespace(item?.text || item?.content);
    if (text) return text;
  }
  return "";
}

function getRecentIncomingMessages(messages, limit = 3) {
  const list = Array.isArray(messages) ? messages : [];
  const out = [];
  for (let i = list.length - 1; i >= 0 && out.length < limit; i -= 1) {
    const item = list[i];
    if (isMeSender(item?.sender || item?.role)) continue;
    const text = normalizeWhitespace(item?.text || item?.content);
    if (text) out.push(text);
  }
  return out;
}

function levenshtein(a, b) {
  const left = String(a || "");
  const right = String(b || "");
  if (left === right) return 0;
  if (!left.length) return right.length;
  if (!right.length) return left.length;

  const rows = [];
  for (let i = 0; i <= right.length; i += 1) rows[i] = [i];
  for (let j = 0; j <= left.length; j += 1) rows[0][j] = j;

  for (let i = 1; i <= right.length; i += 1) {
    for (let j = 1; j <= left.length; j += 1) {
      const cost = right[i - 1] === left[j - 1] ? 0 : 1;
      rows[i][j] = Math.min(
        rows[i - 1][j] + 1,
        rows[i][j - 1] + 1,
        rows[i - 1][j - 1] + cost,
      );
    }
  }
  return rows[right.length][left.length];
}

function fuzzyPickRepliesFromKey(map, key, limit = 3) {
  if (!key || key.length < 4 || key.length > 28 || wordCount(key) > 5) return [];

  let bestKey = null;
  let bestDist = 3;

  for (const candidate of map.keys()) {
    if (candidate.length < 4 || candidate.length > 28) continue;
    if (Math.abs(candidate.length - key.length) > 2) continue;
    const dist = levenshtein(key, candidate);
    if (dist > 0 && dist < bestDist) {
      bestDist = dist;
      bestKey = candidate;
    }
  }

  if (!bestKey) return [];
  return (map.get(bestKey) || []).slice(0, limit);
}

function pickRepliesFromKey(map, key, limit = 3) {
  if (!key) return [];

  const exact = map.get(key);
  if (exact?.length) return exact.slice(0, limit);

  const words = key.split(/\s+/).filter(Boolean);
  let bestHit = null;
  let bestSize = 0;
  for (let size = Math.min(MAX_PHRASE_WINDOW, words.length); size >= 1; size -= 1) {
    for (let i = 0; i <= words.length - size; i += 1) {
      const phrase = words.slice(i, i + size).join(" ");
      const hit = map.get(phrase);
      if (hit?.length && size > bestSize) {
        bestHit = hit;
        bestSize = size;
      }
    }
  }
  if (bestHit?.length) return bestHit.slice(0, limit);

  let best = null;
  let bestLen = 0;
  for (const [candidate, replies] of map.entries()) {
    if (candidate.length < 3 || candidate.length > 80) continue;
    if (key.includes(candidate) && candidate.length > bestLen) {
      best = replies;
      bestLen = candidate.length;
    }
  }
  if (best?.length) return best.slice(0, limit);

  if (wordCount(key) <= 4) {
    for (const [candidate, replies] of map.entries()) {
      if (candidate.length <= 80 && candidate.includes(key) && key.length >= 3) {
        return replies.slice(0, limit);
      }
    }
  }

  return fuzzyPickRepliesFromKey(map, key, limit);
}

function pickReplies(map, key, limit = 3) {
  const clauses = [
    key,
    ...String(key)
      .split(/[.!?؟]+/)
      .map((part) => normalizeSmartReplyKey(part))
      .filter(Boolean),
  ];
  const seen = new Set();
  for (const clause of clauses) {
    if (seen.has(clause)) continue;
    seen.add(clause);
    const hit = pickRepliesFromKey(map, clause, limit);
    if (hit.length) return hit;
  }
  return [];
}

function pickRepliesWithVariants(map, text, limit = 3) {
  const variants = smartReplyKeyVariants(text);
  for (const key of variants) {
    const hit = pickReplies(map, key, limit);
    if (hit.length) return { hit, key };
  }
  return { hit: [], key: variants[0] || "" };
}

function lookupSmartReplies({
  messages = [],
  language = "en",
  tone = "default",
  variationSeed = 0,
} = {}) {
  const entries = getSmartReplyEntries();
  const recentIncoming = getRecentIncomingMessages(messages, 3);
  if (!recentIncoming.length || !entries.size) {
    return {
      replies: [],
      intent: null,
      contextPreview: "",
      provider: "local-index",
      dataSource: "smart-replies.json",
      lookupWeak: false,
    };
  }

  let hit = [];
  let key = "";
  let matchedText = recentIncoming[0];

  for (const incoming of recentIncoming) {
    const picked = pickRepliesWithVariants(entries, incoming, 3);
    if (picked.hit.length) {
      hit = picked.hit;
      key = picked.key;
      matchedText = incoming;
      break;
    }
  }

  const replies = applyToneToReplies(
    hit
      .map((line) => normalizeWhitespace(line).slice(0, MAX_REPLY_LEN))
      .filter(Boolean),
    tone,
    language,
    variationSeed,
  );

  const lookupWeak =
    replies.length > 0 &&
    (wordCount(key) >= 6 || wordCount(normalizeSmartReplyKey(matchedText)) >= 6);

  return {
    replies,
    intent: replies.length ? "lookup" : null,
    contextPreview: matchedText,
    provider: "local-index",
    dataSource: "smart-replies.json",
    lookupWeak,
  };
}

function resolveDirection(sourceLanguage, targetLanguage, text, uiLanguage) {
  let src = String(sourceLanguage || "auto").toLowerCase();
  let tgt = String(targetLanguage || "en").toLowerCase();

  if (src === "auto") {
    const script = detectScript(text);
    if (script === "ar") src = "ar";
    else if (script === "en") src = "en";
    else src = uiLanguage?.startsWith("ar") ? "en" : "ar";
  }

  if (!tgt || tgt === "auto") {
    tgt = uiLanguage?.startsWith("ar") ? "ar" : "en";
  }

  src = src.split("-")[0];
  tgt = tgt.split("-")[0];

  if (src !== "en" && src !== "ar") src = detectScript(text) === "ar" ? "ar" : "en";
  if (tgt !== "en" && tgt !== "ar") tgt = src === "ar" ? "en" : "ar";

  if (src === tgt) {
    tgt = src === "ar" ? "en" : "ar";
  }

  return { src, tgt };
}

function cacheTranslateKey(text, src, tgt) {
  return `${src}:${tgt}:${normalizeLookupKey(text)}`;
}

function tryWordLookup(wordMap, wordExtMap, key) {
  const curated = wordMap.get(key);
  if (curated) return curated;
  if (STOPWORDS.has(key) || FILLERS.has(key)) return null;
  if (key.length >= 4 && key.length <= 6) return wordExtMap.get(key) || null;
  return null;
}

function lookupChunk(maps, words, start, src) {
  const phraseMap = src === "ar" ? maps.phrasesArToEn : maps.phrasesEnToAr;
  const wordMap = src === "ar" ? maps.wordsArToEn : maps.wordsEnToAr;

  for (let size = Math.min(MAX_PHRASE_WINDOW, words.length - start); size >= 2; size -= 1) {
    const phrase = words.slice(start, start + size).join(" ");
    const key = normalizeLookupKey(phrase);
    const hit = phraseMap.get(key) || wordMap.get(key);
    if (hit) return { text: hit, size };
  }
  return null;
}

function translateGreedy(maps, text, src, tgt) {
  void tgt;
  const wordMap = src === "ar" ? maps.wordsArToEn : maps.wordsEnToAr;
  const wordExtMap = src === "ar" ? maps.wordsArToEnExt : maps.wordsEnToArExt;

  const raw = prepareTranslateInput(text);
  const words = raw.split(/\s+/).filter(Boolean);
  if (words.length < 2 || words.length > MAX_TRANSLATE_WORDS) return null;

  const out = [];
  let translatedAny = false;
  let i = 0;

  while (i < words.length) {
    const chunk = lookupChunk(maps, words, i, src);
    if (chunk) {
      out.push(chunk.text);
      i += chunk.size;
      translatedAny = true;
      continue;
    }

    const token = words[i];
    const stripped = token.replace(/^[.!?؟،؛:'"]+|[.!?؟،؛:'"]+$/g, "");
    const wordKey = normalizeLookupKey(stripped);
    if (FILLERS.has(wordKey)) {
      i += 1;
      continue;
    }
    const wordHit = wordKey ? tryWordLookup(wordMap, wordExtMap, wordKey) : null;
    if (wordHit) {
      out.push(wordHit);
      translatedAny = true;
    } else if (!STOPWORDS.has(wordKey)) {
      out.push(token);
    }
    i += 1;
  }

  if (!translatedAny) return null;
  return { text: out.join(" "), method: "segment" };
}

function lookupInMaps(maps, text, src, tgt) {
  const prepared = prepareTranslateInput(text);
  const keys = [
    normalizeLookupKey(prepared),
    normalizeLookupKey(prepared.replace(/[.!?؟،؛:]+$/g, "")),
    normalizeLookupKey(text),
  ].filter(Boolean);

  const phraseMap = src === "ar" ? maps.phrasesArToEn : maps.phrasesEnToAr;
  const wordMap = src === "ar" ? maps.wordsArToEn : maps.wordsEnToAr;
  const wordExtMap = src === "ar" ? maps.wordsArToEnExt : maps.wordsEnToArExt;

  for (const key of keys) {
    const phraseHit = phraseMap.get(key);
    if (phraseHit) return { text: phraseHit, method: "phrase" };
  }

  for (const key of keys) {
    if (wordCount(key) <= 3) {
      const wordHit = tryWordLookup(wordMap, wordExtMap, key);
      if (wordHit) return { text: wordHit, method: "word" };
    }
  }

  if (wordCount(keys[0] || "") === 1) {
    const wordHit = tryWordLookup(wordMap, wordExtMap, keys[0]);
    if (wordHit) return { text: wordHit, method: "word" };
  }

  const segmented = translateGreedy(maps, prepared, src, tgt);
  if (segmented) return segmented;

  const multi = lookupWordByWord(maps, prepared, src, tgt);
  if (multi) return multi;

  return null;
}

function lookupWordByWord(maps, text, src, tgt) {
  const raw = normalizeWhitespace(text);
  const tokens = raw.split(/\s+/).filter(Boolean);
  if (tokens.length < 2 || tokens.length > MAX_TRANSLATE_WORDS) return null;

  const wordMap = src === "ar" ? maps.wordsArToEn : maps.wordsEnToAr;
  const wordExtMap = src === "ar" ? maps.wordsArToEnExt : maps.wordsEnToArExt;

  let translatedAny = false;
  const parts = tokens.map((token) => {
    const stripped = token.replace(/^[.!?؟،؛:'"]+|[.!?؟،؛:'"]+$/g, "");
    const key = normalizeLookupKey(stripped);
    if (!key) return token;
    const hit = tryWordLookup(wordMap, wordExtMap, key);
    if (!hit) return token;
    translatedAny = true;
    const lead = token.slice(0, token.indexOf(stripped));
    const trail = token.slice(token.indexOf(stripped) + stripped.length);
    return `${lead}${hit}${trail}`;
  });

  if (!translatedAny) return null;
  return { text: parts.join(" "), method: "words" };
}

function translateText({ text, sourceLanguage, targetLanguage, uiLanguage }) {
  const trimmed = normalizeWhitespace(text);
  if (!trimmed) {
    return {
      translatedText: "",
      method: "empty",
      detectedSource: "auto",
      targetLanguage: targetLanguage || "en",
      provider: "local-index",
      dataSource: "translate.json",
    };
  }

  const { src, tgt } = resolveDirection(
    sourceLanguage,
    targetLanguage,
    trimmed,
    uiLanguage,
  );

  const cacheKey = cacheTranslateKey(trimmed, src, tgt);
  const cached = translateCache.get(cacheKey);
  if (cached) {
    return { ...cached, cached: true };
  }

  const maps = getTranslateMaps();
  const hit = lookupInMaps(maps, trimmed, src, tgt);

  const result = {
    translatedText: hit?.text || trimmed,
    method: hit?.method || "miss",
    detectedSource: src,
    targetLanguage: tgt,
    provider: "local-index",
    dataSource: "translate.json",
  };

  if (translateCache.size >= TRANSLATE_CACHE_MAX) {
    const first = translateCache.keys().next().value;
    if (first) translateCache.delete(first);
  }
  translateCache.set(cacheKey, result);

  return result;
}

function getSupportedLanguages() {
  return [
    { code: "auto", name: "Auto detect" },
    { code: "en", name: "English" },
    { code: "ar", name: "Arabic" },
  ];
}

function getEngineStats() {
  const s = getAiIndexStats();
  return {
    provider: "local-index",
    smartReplyKeys: s.smartReplyKeys,
    translatePhrases: s.translatePhrases,
    translateWords: s.translateWords,
    sources: s.sources,
  };
}

module.exports = {
  lookupSmartReplies,
  translateText,
  getSupportedLanguages,
  getEngineStats,
  getLastIncomingMessage,
  getRecentIncomingMessages,
};
