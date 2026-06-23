import i18next from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./en.json";
import ar from "./ar.json";

export {
  I18NEXT_LS_KEY,
  I18N_LANGUAGE_STORAGE_KEY,
  normalizeLangTag,
} from "./language";

import {
  I18N_LANGUAGE_STORAGE_KEY,
  normalizeLangTag,
} from "./language";

const translationResources = {
  en: { translation: en },
  ar: { translation: ar },
};

const i18n = i18next.createInstance();

export function configureI18n(language) {
  const resolvedLanguage = language === "ar" ? "ar" : "en";

  if (!i18n.isInitialized) {
    i18n.use(initReactI18next).init({
      resources: translationResources,
      lng: resolvedLanguage,
      fallbackLng: "en",
      supportedLngs: ["en", "ar"],
      interpolation: {
        escapeValue: false,
      },
      react: {
        useSuspense: false,
      },
    });
  } else if (i18n.language !== resolvedLanguage) {
    i18n.changeLanguage(resolvedLanguage);
  }

  return i18n;
}

export function detectClientLanguage() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const storedLanguage = normalizeLangTag(
      localStorage.getItem(I18N_LANGUAGE_STORAGE_KEY),
    );

    if (storedLanguage) {
      return storedLanguage;
    }
  } catch {
    /* ignore localStorage access failures */
  }

  const browserLanguage = (navigator.language || "")
    .split("-")[0]
    .toLowerCase();

  return browserLanguage === "ar" ? "ar" : null;
}

export function persistI18nCookie(language) {
  if (typeof document === "undefined") {
    return;
  }

  try {
    document.cookie = `${I18N_LANGUAGE_STORAGE_KEY}=${language};path=/;max-age=31536000;SameSite=Lax`;
  } catch {
    /* ignore cookie write failures */
  }
}

export default i18n;
