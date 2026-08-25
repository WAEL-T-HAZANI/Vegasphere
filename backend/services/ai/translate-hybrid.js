const { translateText: lookupTranslate } = require("./lookup.js");
const { translateNeural } = require("./neural-translate.js");
const {
  shouldUseGroqTranslate,
  translateWithGroqLlm,
} = require("./groq-llm.js");

const ARABIC_RE = /[\u0600-\u06FF]/;

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

  const wordLen = String(originalText || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  const out = result.translatedText || "";
  const tgt = result.targetLanguage;

  if (result.method === "segment" && wordLen >= 7) return true;
  if (tgt === "ar" && hasSubstantialLatin(out)) return true;
  if (tgt === "en" && hasSubstantialArabic(out) && hasSubstantialLatin(originalText)) {
    return true;
  }
  return false;
}

async function translateHybrid({
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
  const useGroq = shouldUseGroqTranslate({ lookupStrong: strongLookup });

  if (strongLookup && !useGroq) {
    return lookupResult;
  }

  if (useGroq) {
    const groqResult = await translateWithGroqLlm({
      text,
      sourceLanguage: lookupResult.detectedSource,
      targetLanguage: lookupResult.targetLanguage,
    });
    if (groqResult?.translatedText) {
      return groqResult;
    }
  }

  if (!needsNeuralFallback(lookupResult, text)) {
    return lookupResult;
  }

  const neuralText = await translateNeural(
    text,
    lookupResult.detectedSource,
    lookupResult.targetLanguage,
  );

  if (!neuralText) {
    return lookupResult;
  }

  return {
    ...lookupResult,
    translatedText: neuralText,
    method: lookupResult.method === "miss" ? "neural" : "hybrid",
    provider: "local-hybrid",
    dataSource: "translate.json+opus-mt",
  };
}

module.exports = {
  translateHybrid,
  needsNeuralFallback,
};
