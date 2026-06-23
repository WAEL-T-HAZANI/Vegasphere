import type { TFunction } from "i18next";

/** Localize backend default topic label when still "General". */
export function displayTopicName(name: string, t: TFunction): string {
  const trimmed = String(name || "").trim();
  if (!trimmed || trimmed.toLowerCase() === "general") {
    return t("topicGeneral");
  }
  return trimmed;
}
