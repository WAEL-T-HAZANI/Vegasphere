"use client";

import { useEffect } from "react";
import { useTranslation } from "react-i18next";

/** Keeps `<html dir>` and `lang` in sync with the active i18n language. */
export default function LanguageDirectionSync() {
  const { i18n } = useTranslation();

  useEffect(() => {
    const apply = (lng: string) => {
      const lang = String(lng || "en").split("-")[0];
      const dir = lang === "ar" ? "rtl" : "ltr";
      document.documentElement.lang = lang;
      document.documentElement.dir = dir;
    };

    apply(i18n.language);
    const onChange = (lng: string) => {
      apply(lng);
    };
    i18n.on("languageChanged", onChange);
    return () => {
      i18n.off("languageChanged", onChange);
    };
  }, [i18n]);

  return null;
}
