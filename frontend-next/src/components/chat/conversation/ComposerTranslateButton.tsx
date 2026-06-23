"use client";

import { useCallback, useState, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import { Languages, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { formatApiError } from "@/lib/apiError";
import { cn } from "@/lib/classNames";

type ComposerTranslateButtonProps = {
  text: string;
  setText: (_value: string) => void;
  textInputRef?: RefObject<HTMLTextAreaElement | null>;
  disabled?: boolean;
  rtl?: boolean;
  variant?: "composer" | "header";
};

export default function ComposerTranslateButton({
  text,
  setText,
  textInputRef,
  disabled = false,
  rtl = false,
  variant = "composer",
}: ComposerTranslateButtonProps) {
  const { t, i18n } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const readDraft = useCallback(() => {
    const fromRef = String(textInputRef?.current?.value || "").trim();
    if (fromRef) return fromRef;
    return String(text || "").trim();
  }, [text, textInputRef]);

  const runTranslate = useCallback(async () => {
    const input = readDraft();
    if (!input || busy || disabled) return;
    setBusy(true);
    setErr("");
    try {
      const ui = (i18n.language || "en").split("-")[0].toLowerCase();
      const targetLanguage = ui === "ar" ? "en" : "ar";
      const { data } = await api.post("/ai/translate", {
        text: input,
        sourceLanguage: "auto",
        targetLanguage,
      });
      const translated = String(data?.translatedText || "").trim();
      if (!translated) {
        setErr(t("translationFailed"));
        return;
      }
      setText(translated);
      if (textInputRef?.current) {
        textInputRef.current.value = translated;
        textInputRef.current.focus();
      }
    } catch (error) {
      setErr(formatApiError(error, t, "translationFailed"));
    } finally {
      setBusy(false);
    }
  }, [readDraft, busy, disabled, i18n.language, setText, textInputRef, t]);

  const hasText = Boolean(readDraft());
  const isHeader = variant === "header";

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        disabled={disabled || !hasText || busy}
        onClick={() => void runTranslate()}
        className={cn(
          isHeader
            ? "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-brand-200/50 bg-surface/90 text-brand-700 shadow-sm outline-none transition hover:border-brand-400/55 hover:bg-brand-50/75 hover:text-brand-800 focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-45 dark:border-white/10 dark:bg-white/[0.04] dark:text-brand-200 dark:hover:border-brand-700/50 dark:hover:bg-brand-900/30 dark:focus-visible:ring-offset-gray-950"
            : "vs-composer-icon-btn vs-composer-icon-btn-sm",
          busy && "pointer-events-none opacity-70",
        )}
        title={t("aiTranslateButton")}
        aria-label={t("aiTranslateButton")}
      >
        {busy ? (
          <Loader2
            className={cn("animate-spin", isHeader ? "h-4 w-4" : "h-5 w-5")}
            aria-hidden
          />
        ) : (
          <Languages
            className={cn(isHeader ? "h-4 w-4" : "h-5 w-5")}
            aria-hidden
          />
        )}
      </button>
      {err ? (
        <p
          className={cn(
            "pointer-events-none absolute bottom-full z-30 mb-1 w-48 rounded-xl border border-red-200/80 bg-surface px-2 py-1 text-[10px] font-medium text-red-700 shadow-md dark:border-red-900/50 dark:bg-black/90 dark:text-red-200",
            rtl ? "left-0" : "right-0",
          )}
          role="status"
        >
          {err}
        </p>
      ) : null}
    </div>
  );
}
