const { ApiError } = require("./http-error.js");
const { loadAiIndexes } = require("./ai/index-loader.js");
const { translateHybrid } = require("./ai/translate-hybrid.js");
const {
  getSupportedLanguages,
  getEngineStats,
} = require("./ai/lookup.js");
const { getNeuralStatus } = require("./ai/neural-translate.js");
const { getGroqStatus } = require("./ai/groq-llm.js");

const MAX_TRANSLATE_TEXT_CHARS = 5000;

async function translateTextHandler(req, res) {
  loadAiIndexes();

  const { text, targetLanguage, sourceLanguage, context, uiLanguage } =
    req.body || {};

  const trimmedText = String(text || "").trim();

  if (!trimmedText) {
    throw ApiError.badRequest("Text is required.");
  }

  if (trimmedText.length > MAX_TRANSLATE_TEXT_CHARS) {
    throw ApiError.badRequest(
      `Text must be ${MAX_TRANSLATE_TEXT_CHARS} characters or less.`,
    );
  }

  let src = sourceLanguage || "auto";
  let tgt = targetLanguage || "en";

  if (context === "chat") {
    src = "auto";
    const ui = String(uiLanguage || targetLanguage || "en")
      .split("-")[0]
      .toLowerCase();
    tgt = ui.startsWith("ar") ? "ar" : "en";
  }

  const result = await translateHybrid({
    text: trimmedText,
    sourceLanguage: src,
    targetLanguage: tgt,
    uiLanguage: context === "chat" ? tgt : uiLanguage,
  });

  return res.json({
    translatedText: result.translatedText,
    provider: result.provider,
    dataSource: result.dataSource,
    method: result.method,
    detectedSource: result.detectedSource || null,
    targetLanguage: result.targetLanguage || tgt,
    context: context === "chat" ? "chat" : "service",
    llm: getGroqStatus(),
  });
}

async function listTranslateLanguages(_req, res) {
  loadAiIndexes();
  const stats = getEngineStats();
  const neural = getNeuralStatus();
  const groq = getGroqStatus();
  return res.json({
    languages: getSupportedLanguages(),
    provider: groq.configured
      ? "groq+local-hybrid"
      : neural.ready
        ? "local-hybrid"
        : stats?.provider || "local-index",
    dataSource: groq.configured
      ? `${groq.model}+translate.json+opus-mt`
      : neural.ready
        ? "translate.json+opus-mt"
        : "translate.json",
    stats: { ...stats, neural, groq },
  });
}

module.exports = {
  translateText: translateTextHandler,
  listTranslateLanguages,
};
