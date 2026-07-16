import { getAppLanguage } from "@/i18n/language";

/**
 * Chat translate: detect the message language, render in the reader's UI language.
 * Independent from Services → Translate from/to picker defaults.
 */
export function getChatTranslateTargetLanguage(uiLanguage: string): "ar" | "en" {
  return getAppLanguage(uiLanguage);
}

export function buildChatTranslatePayload(text: string, uiLanguage: string) {
  const appLanguage = getAppLanguage(uiLanguage);
  return {
    text: String(text || "").trim(),
    sourceLanguage: "auto" as const,
    targetLanguage: appLanguage,
    uiLanguage: appLanguage,
    context: "chat" as const,
  };
}
