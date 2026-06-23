/** Language storage key and tag normalization (safe for server + client). */

export const I18NEXT_LS_KEY = "i18nextLng";

export const I18N_LANGUAGE_STORAGE_KEY = I18NEXT_LS_KEY;

export function normalizeLangTag(raw) {
  if (!raw) return null;

  const code = String(raw)
    .trim()
    .replace(/^"|"$/g, "")
    .toLowerCase()
    .split("-")[0];

  if (code === "en" || code === "ar") return code;

  return null;
}
