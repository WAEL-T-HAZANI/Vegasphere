/**
 * Chat translate: detect the message language, render in the reader's UI language.
 * Independent from Services → Translate from/to picker defaults.
 */
export function getChatTranslateTargetLanguage(uiLanguage: string): "ar" | "en" {
  const ui = String(uiLanguage || "en").split("-")[0].toLowerCase();
  return ui.startsWith("ar") ? "ar" : "en";
}

export function buildChatTranslatePayload(text: string, uiLanguage: string) {
  const targetLanguage = getChatTranslateTargetLanguage(uiLanguage);
  return {
    text: String(text || "").trim(),
    sourceLanguage: "auto" as const,
    targetLanguage,
    uiLanguage: targetLanguage,
    context: "chat" as const,
  };
}
