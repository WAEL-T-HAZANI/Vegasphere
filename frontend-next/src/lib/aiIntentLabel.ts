import type { TFunction } from "i18next";

export function getAiIntentLabel(intent: string, t: TFunction) {
  const slug = String(intent || "").trim();
  if (!slug) return "";
  const key = `aiIntent_${slug}`;
  const label = t(key, { defaultValue: "" });
  if (label && label !== key) return label;
  return slug.replace(/_/g, " ");
}

export function getAiDataSourceLabel(source: string, t: TFunction) {
  const value = String(source || "").trim().toLowerCase();
  if (value === "sqlite") return t("aiDataSourceSqlite");
  if (value === "json") return t("aiDataSourceJson");
  return "";
}
