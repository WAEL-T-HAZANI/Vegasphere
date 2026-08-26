const { translateText: lookupTranslate } = require("./lookup.js");
const { translateNeural } = require("./neural-translate.js");
const { detectScript, normalizeWhitespace, wordCount } = require("./normalize.js");
const { translationNeedsGroq } = require("./context.js");
const {
  shouldUseGroqTranslate,
  translateWithGroqLlm,
} = require("./groq-llm.js");

const ARABIC_RE = /[\u0600-\u06FF]/;
const HYBRID_CACHE_MS = Math.max(
  0,
  Number(process.env.AI_TRANSLATE_CACHE_MS || 60000),
);
const CHUNK_WORD_THRESHOLD = Math.max(
  18,
  Number(process.env.AI_TRANSLATE_CHUNK_WORDS || 22),
);

const hybridCache = new Map();

function hasSubstantialLatin(text) {
  return /\b[a-z]{4,}\b/i.test(String(text || ""));
}

function hasSubstantialArabic(text) {
  return ARABIC_RE.test(String(text || ""));
}

function lookupIsStrong(result) {
  return result.method === "phrase" || result.method === "word";
}

function needsNeuralFallback(result, originalText) {
  if (lookupIsStrong(result)) return false;
  if (result.method === "miss") return true;

  const wordLen = wordCount(originalText);
  const out = result.translatedText || "";
  const tgt = result.targetLanguage;

  if (result.method === "segment" && wordLen >= 7) return true;
  if (tgt === "ar" && hasSubstantialLatin(out)) return true;
  if (tgt === "en" && hasSubstantialArabic(out) && hasSubstantialLatin(originalText)) {
    return true;
  }
  return false;
}

function translationQualityBad(result, originalText) {
  const out = String(result?.translatedText || "").trim();
  const tgt = String(result?.targetLanguage || "en").split("-")[0].toLowerCase();
  if (!out) return true;

  if (tgt === "ar" && hasSubstantialLatin(out) && !hasSubstantialArabic(out)) {
    return true;
  }
  if (tgt === "en" && hasSubstantialArabic(out) && hasSubstantialLatin(originalText)) {
    return true;
  }
  if (out === String(originalText || "").trim() && result?.method === "miss") {
    return true;
  }
  return false;
}

function hybridCacheGet(key) {
  const hit = hybridCache.get(key);
  if (!hit) return null;
  if (hit.expiresAt <= Date.now()) {
    hybridCache.delete(key);
    return null;
  }
  return hit.value;
}

function hybridCacheSet(key, value) {
  if (!HYBRID_CACHE_MS) return;
  hybridCache.set(key, {
    value,
    expiresAt: Date.now() + HYBRID_CACHE_MS,
  });
  if (hybridCache.size > 1500) {
    const first = hybridCache.keys().next().value;
    if (first) hybridCache.delete(first);
  }
}

function splitIntoChunks(text) {
  const trimmed = normalizeWhitespace(text);
  const parts = trimmed
    .split(/(?<=[.!?؟…])\s+|\n+/)
    .map((part) => normalizeWhitespace(part))
    .filter(Boolean);

  if (parts.length <= 1) return [trimmed];

  const chunks = [];
  let current = "";

  for (const part of parts) {
    const candidate = current ? `${current} ${part}` : part;
    if (wordCount(candidate) > CHUNK_WORD_THRESHOLD && current) {
      chunks.push(current);
      current = part;
    } else {
      current = candidate;
    }
  }
  if (current) chunks.push(current);
  return chunks.length > 1 ? chunks : [trimmed];
}

async function translateHybridCore({
  text,
  sourceLanguage,
  targetLanguage,
  uiLanguage,
}) {
  const lookupResult = lookupTranslate({
    text,
    sourceLanguage,
    targetLanguage,
    uiLanguage,
  });

  const strongLookup = lookupIsStrong(lookupResult);
  const mixedLanguage = detectScript(text) === "mixed";
  const needsGroq = translationNeedsGroq({
    lookupStrong: strongLookup,
    text,
    method: lookupResult.method,
    translatedText: lookupResult.translatedText,
    targetLanguage: lookupResult.targetLanguage,
  });
  const useGroq = shouldUseGroqTranslate({ lookupStrong: strongLookup, needsGroq });

  if (strongLookup && !useGroq) {
    return lookupResult;
  }

  if (useGroq) {
    const groqResult = await translateWithGroqLlm({
      text,
      sourceLanguage: lookupResult.detectedSource,
      targetLanguage: lookupResult.targetLanguage,
      mixedLanguage,
    });
    if (groqResult?.translatedText && !translationQualityBad(groqResult, text)) {
      return groqResult;
    }
  }

  if (!needsNeuralFallback(lookupResult, text)) {
    if (translationQualityBad(lookupResult, text) && useGroq) {
      const groqRetry = await translateWithGroqLlm({
        text,
        sourceLanguage: lookupResult.detectedSource,
        targetLanguage: lookupResult.targetLanguage,
        mixedLanguage,
      });
      if (groqRetry?.translatedText) return groqRetry;
    }
    return lookupResult;
  }

  const neuralText = await translateNeural(
    text,
    lookupResult.detectedSource,
    lookupResult.targetLanguage,
  );

  if (!neuralText) {
    if (useGroq) {
      const groqFallback = await translateWithGroqLlm({
        text,
        sourceLanguage: lookupResult.detectedSource,
        targetLanguage: lookupResult.targetLanguage,
        mixedLanguage,
      });
      if (groqFallback?.translatedText) return groqFallback;
    }
    return lookupResult;
  }

  const neuralResult = {
    ...lookupResult,
    translatedText: neuralText,
    method: lookupResult.method === "miss" ? "neural" : "hybrid",
    provider: "local-hybrid",
    dataSource: "translate.json+opus-mt",
  };

  if (translationQualityBad(neuralResult, text) && useGroq) {
    const groqFallback = await translateWithGroqLlm({
      text,
      sourceLanguage: lookupResult.detectedSource,
      targetLanguage: lookupResult.targetLanguage,
      mixedLanguage,
    });
    if (groqFallback?.translatedText) return groqFallback;
  }

  return neuralResult;
}

async function translateHybrid({
  text,
  sourceLanguage,
  targetLanguage,
  uiLanguage,
}) {
  const trimmed = normalizeWhitespace(text);
  if (!trimmed) {
    return translateHybridCore({ text, sourceLanguage, targetLanguage, uiLanguage });
  }

  const cacheKey = [
    sourceLanguage || "auto",
    targetLanguage || "auto",
    uiLanguage || "",
    trimmed,
  ].join("::");
  const cached = hybridCacheGet(cacheKey);
  if (cached) return { ...cached, cached: true };

  let result;
  const chunks = splitIntoChunks(trimmed);
  if (chunks.length > 1 && wordCount(trimmed) >= CHUNK_WORD_THRESHOLD) {
    const direction = lookupTranslate({
      text: trimmed,
      sourceLanguage,
      targetLanguage,
      uiLanguage,
    });
    const translatedParts = [];
    let provider = "local-hybrid";
    let dataSource = "translate.json+opus-mt";

    for (const chunk of chunks) {
      const part = await translateHybridCore({
        text: chunk,
        sourceLanguage: direction.detectedSource,
        targetLanguage: direction.targetLanguage,
        uiLanguage,
      });
      translatedParts.push(part.translatedText || chunk);
      provider = part.provider || provider;
      dataSource = part.dataSource || dataSource;
    }

    result = {
      translatedText: translatedParts.join(" "),
      method: "chunked",
      detectedSource: direction.detectedSource,
      targetLanguage: direction.targetLanguage,
      provider,
      dataSource,
    };
  } else {
    result = await translateHybridCore({
      text: trimmed,
      sourceLanguage,
      targetLanguage,
      uiLanguage,
    });
  }

  hybridCacheSet(cacheKey, result);
  return result;
}

module.exports = {
  translateHybrid,
  needsNeuralFallback,
  translationQualityBad,
  splitIntoChunks,
};
