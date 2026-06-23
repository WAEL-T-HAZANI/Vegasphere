import { cookies } from "next/headers";
import en from "./en.json";
import ar from "./ar.json";
import { I18NEXT_LS_KEY, normalizeLangTag } from "./language";

type Dictionary = Record<string, string>;

const dictionaries: Record<string, Dictionary> = {
  en: en as Dictionary,
  ar: ar as Dictionary,
};

export function resolveServerLanguage(): "en" | "ar" {
  const cookieLng = normalizeLangTag(cookies().get(I18NEXT_LS_KEY)?.value);
  return cookieLng === "ar" ? "ar" : "en";
}

export function getServerTranslator(lang?: "en" | "ar") {
  const lng = lang || resolveServerLanguage();
  const dict = dictionaries[lng] || dictionaries.en;
  return (key: string) => dict[key] ?? key;
}

export function getServerDir(lang?: "en" | "ar"): "ltr" | "rtl" {
  return (lang || resolveServerLanguage()) === "ar" ? "rtl" : "ltr";
}
