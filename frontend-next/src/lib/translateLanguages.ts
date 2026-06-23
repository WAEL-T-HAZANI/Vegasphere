// @ts-nocheck
import { aiClient } from "@/lib/clients";

const FALLBACK_LANGS = [
  { code: "auto", name: "Auto detect" },
  { code: "en", name: "English" },
  { code: "ar", name: "Arabic" },
];

let cachedPromise = null;
let cachedValue = null;
let cachedAt = 0;

export type LangOption = { code: string; name: string };

export function getLanguageLabel(
  code: string,
  langs: LangOption[],
  t: (_key: string) => string,
) {
  const c = String(code || "").trim();
  if (!c) return "";
  const i18nKey = `lang_${c}`;
  const localized = t(i18nKey);
  if (localized && localized !== i18nKey) return localized;
  const hit = langs.find((l) => l.code === c);
  return hit?.name || c.toUpperCase();
}

export async function getTranslateLanguages() {
  const now = Date.now();
  if (cachedValue && now - cachedAt < 10 * 60 * 1000) return cachedValue;
  if (cachedPromise) return cachedPromise;

  cachedPromise = aiClient
    .listTranslateLanguages()
    .then(({ data }) => {
      const langs = Array.isArray(data?.languages) ? data.languages : [];
      const normalized = langs
        .map((l) => ({
          code: String(l?.code || "").trim(),
          name: String(l?.name || "").trim(),
        }))
        .filter((l) => l.code && l.name);

      cachedValue = normalized.length ? normalized : FALLBACK_LANGS;
      cachedAt = Date.now();
      return cachedValue;
    })
    .catch(() => {
      cachedValue = FALLBACK_LANGS;
      cachedAt = Date.now();
      return cachedValue;
    })
    .finally(() => {
      cachedPromise = null;
    });

  return cachedPromise;
}

export function invalidateTranslateLanguageCache() {
  cachedPromise = null;
  cachedValue = null;
  cachedAt = 0;
}
