const { ApiError } = require("./http-error.js");
const {
  translateTextLocal,
  getSupportedLanguages,
  getEngineStats,
  loadEngine,
} = require("./ai-local-engine.js");

const MAX_TRANSLATE_TEXT_CHARS = 5000;

loadEngine();

async function translateText(req, res) {
  const { text, targetLanguage, sourceLanguage } = req.body || {};

  const trimmedText = String(text || "").trim();

  if (!trimmedText) {
    throw ApiError.badRequest("Text is required.");
  }

  if (trimmedText.length > MAX_TRANSLATE_TEXT_CHARS) {
    throw ApiError.badRequest(
      `Text must be ${MAX_TRANSLATE_TEXT_CHARS} characters or less.`,
    );
  }

  const result = translateTextLocal(
    trimmedText,
    sourceLanguage || "auto",
    targetLanguage || "en",
  );

  return res.json({
    translatedText: result.translatedText,
    provider: result.provider,
    dataSource: result.dataSource,
    method: result.method,
    detectedSource: result.detectedSource || null,
    targetLanguage: result.targetLanguage || targetLanguage || "en",
  });
}

async function listTranslateLanguages(_req, res) {
  const stats = getEngineStats();
  return res.json({
    languages: getSupportedLanguages(),
    provider: stats?.provider || "local",
    dataSource: stats?.provider === "premium-sqlite" ? "sqlite" : "json",
    stats,
  });
}

module.exports = {
  translateText,
  listTranslateLanguages,
};
