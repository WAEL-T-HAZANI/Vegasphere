"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { I18nextProvider } from "react-i18next";
import i18n, {
  configureI18n,
  detectClientLanguage,
  persistI18nCookie,
} from "@/i18n/client";
import { I18NEXT_LS_KEY } from "@/i18n/language";
import LanguageDirectionSync from "@/components/providers/LanguageDirectionSync";

export default function TranslationProvider({ children, initialI18nLng = "en" }) {
  const router = useRouter();

  useMemo(() => configureI18n(initialI18nLng), [initialI18nLng]);

  useEffect(() => {
    const next = detectClientLanguage();
    if (next && i18n.language !== next) {
      void i18n.changeLanguage(next).then(() => router.refresh());
    }
  }, [router]);

  useEffect(() => {
    const onLanguageChanged = (lng: string) => {
      try {
        localStorage.setItem(I18NEXT_LS_KEY, lng);
      } catch {
        /* ignore localStorage failures */
      }
      persistI18nCookie(lng);
      // Cookie must be set before refresh so the server layout picks up dir/lang.
      requestAnimationFrame(() => {
        router.refresh();
      });
    };

    i18n.on("languageChanged", onLanguageChanged);
    return () => {
      i18n.off("languageChanged", onLanguageChanged);
    };
  }, [router]);

  return (
    <I18nextProvider i18n={i18n}>
      <LanguageDirectionSync />
      {children}
    </I18nextProvider>
  );
}
