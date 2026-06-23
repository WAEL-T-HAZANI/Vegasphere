"use client";

import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeftRight, Copy, Trash2 } from "lucide-react";
import { aiClient } from "@/lib/clients";
import { formatApiError } from "@/lib/apiError";
import { showAppErrorToast } from "@/lib/appToast";
import { cn } from "@/lib/classNames";
import { getLanguageLabel, type LangOption } from "@/lib/translateLanguages";
import PrivacySelectField from "@/components/privacy/PrivacySelectField";

type TranslateState = {
  from: string;
  to: string;
  input: string;
  out: string;
  detectedSource: string;
  method: string;
  err: string;
  busy: boolean;
};

type Action =
  | { type: "set-from"; value: string }
  | { type: "set-to"; value: string }
  | { type: "set-input"; value: string }
  | { type: "swap"; pickSwapTo: (_exclude: string) => string }
  | { type: "reset-tab"; isArabic: boolean }
  | { type: "translate-start" }
  | { type: "translate-success"; out: string; detectedSource: string; method: string }
  | { type: "translate-error"; err: string }
  | { type: "clear-all" };

function reducer(state: TranslateState, action: Action): TranslateState {
  switch (action.type) {
    case "set-from":
      return {
        ...state,
        from: action.value,
        err: "",
        detectedSource: action.value === "auto" ? state.detectedSource : "",
      };
    case "set-to":
      return { ...state, to: action.value, err: "" };
    case "set-input":
      return { ...state, input: action.value, err: "", out: "", method: "" };
    case "reset-tab":
      return {
        ...state,
        from: "auto",
        to: action.isArabic ? "en" : "ar",
        err: "",
        detectedSource: "",
        method: "",
      };
    case "swap": {
      const prevFrom = state.from;
      const prevTo = state.to;
      const nextFrom = prevTo;
      let nextTo = prevFrom === "auto" ? action.pickSwapTo(nextFrom) : prevFrom;
      if (nextTo === nextFrom) nextTo = action.pickSwapTo(nextFrom);
      const hasSwapText = Boolean(state.out?.trim());
      return {
        ...state,
        from: nextFrom,
        to: nextTo,
        input: hasSwapText ? state.out : state.input,
        out: hasSwapText ? state.input : state.out,
        err: "",
        detectedSource: nextFrom === "auto" ? state.detectedSource : "",
      };
    }
    case "translate-start":
      return { ...state, busy: true, err: "", out: "", method: "" };
    case "translate-success":
      return {
        ...state,
        out: action.out,
        detectedSource: action.detectedSource,
        method: action.method,
        busy: false,
      };
    case "translate-error":
      return { ...state, err: action.err, busy: false };
    case "clear-all":
      return {
        ...state,
        input: "",
        out: "",
        err: "",
        detectedSource: "",
        method: "",
      };
    default:
      return state;
  }
}

const QUICK_PHRASES: Record<string, string[]> = {
  en: ["Good morning", "Thanks for your help!", "See you later", "How are you?", "Can we meet tomorrow?"],
  ar: ["صباح الخير", "شكراً على المساعدة!", "مع السلامة", "كيف حالك؟", "ممكن نتقابل بكرة؟"],
  fr: ["Bonjour", "Merci beaucoup", "À bientôt", "Comment allez-vous?", "On se voit demain?"],
  de: ["Guten Morgen", "Danke schön", "Auf Wiedersehen", "Wie geht es dir?", "Treffen wir uns morgen?"],
  es: ["Buenos días", "Muchas gracias", "Hasta luego", "¿Cómo estás?", "¿Nos vemos mañana?"],
  it: ["Buongiorno", "Grazie mille", "A presto", "Come stai?", "Ci vediamo domani?"],
  pt: ["Bom dia", "Muito obrigado", "Até logo", "Como você está?", "Nos vemos amanhã?"],
  tr: ["Günaydın", "Teşekkür ederim", "Görüşürüz", "Nasılsın?", "Yarın görüşelim mi?"],
  ru: ["Доброе утро", "Спасибо", "До свидания", "Как дела?", "Встретимся завтра?"],
  hi: ["नमस्ते", "धन्यवाद", "फिर मिलेंगे", "आप कैसे हैं?", "कल मिल सकते हैं?"],
  ja: ["おはよう", "ありがとう", "またね", "元気ですか", "明日会いましょうか"],
  ko: ["안녕하세요", "감사합니다", "나중에 봐요", "잘 지내세요?", "내일 만날까요?"],
};

type AiTranslatePanelProps = {
  langOptions: LangOption[];
  isArabic: boolean;
  rtl: boolean;
};

export default function AiTranslatePanel({
  langOptions,
  isArabic,
  rtl,
}: AiTranslatePanelProps) {
  const { t } = useTranslation();
  const [state, dispatch] = useReducer(reducer, {
    from: "auto",
    to: isArabic ? "en" : "ar",
    input: "",
    out: "",
    detectedSource: "",
    method: "",
    err: "",
    busy: false,
  });
  const [copiedFlash, setCopiedFlash] = useState(false);

  const pickSwapTo = useCallback(
    (excludeCode: string) => {
      const ui = isArabic ? "ar" : "en";
      const candidates = langOptions
        .map((l) => l.code)
        .filter((c) => c && c !== "auto" && c !== excludeCode);
      if (ui !== excludeCode && candidates.includes(ui)) return ui;
      return candidates.find((c) => c === "en") || candidates[0] || "en";
    },
    [isArabic, langOptions],
  );

  useEffect(() => {
    dispatch({ type: "reset-tab", isArabic });
  }, [isArabic]);

  const fromOptions = useMemo(
    () =>
      langOptions.map((l) => ({
        value: l.code,
        label: `${getLanguageLabel(l.code, langOptions, t)} (${l.code})`,
      })),
    [langOptions, t],
  );

  const toOptions = useMemo(
    () =>
      langOptions
        .filter((l) => l.code !== "auto")
        .map((l) => ({
          value: l.code,
          label: `${getLanguageLabel(l.code, langOptions, t)} (${l.code})`,
        })),
    [langOptions, t],
  );

  const quickPhrases = useMemo(() => {
    const src =
      state.from === "auto"
        ? state.detectedSource || (isArabic ? "ar" : "en")
        : state.from;
    return QUICK_PHRASES[src] || QUICK_PHRASES.en;
  }, [state.from, state.detectedSource, isArabic]);

  const runTranslate = async () => {
    const text = String(state.input || "").trim();
    if (!text) return;
    dispatch({ type: "translate-start" });
    try {
      const { data } = await aiClient.translateText({
        text,
        sourceLanguage: state.from,
        targetLanguage: state.to,
      });
      dispatch({
        type: "translate-success",
        out: String(data?.translatedText || ""),
        detectedSource: String(data?.detectedSource || ""),
        method: String(data?.method || ""),
      });
    } catch (e) {
      const message = formatApiError(e, t, "translationFailed");
      dispatch({
        type: "translate-error",
        err: message,
      });
      showAppErrorToast(message, "ai-translate-failed");
    }
  };

  return (
    <section className="vs-settings-card overflow-hidden !p-0" data-tour="ai-translate-panel">
      <div className="vs-brand-panel-head px-4 py-4 md:px-5">
        <div className="text-sm font-semibold text-ink">{t("aiFeatureTranslateTitle")}</div>
        <div className="mt-1 text-xs font-semibold leading-relaxed text-muted">
          {t("aiLocalTranslateHint")}
        </div>
      </div>

      <div className="grid gap-4 p-4 md:p-5">
        <div
          className={cn(
            "grid gap-3 md:items-end",
            rtl ? "md:grid-cols-[1fr_auto_1fr]" : "md:grid-cols-[1fr_auto_1fr]",
          )}
        >
          <div className="grid min-w-0 gap-1.5 text-xs font-semibold text-muted">
            <span className="flex flex-wrap items-center justify-between gap-2">
              {t("aiTranslateFrom")}
              {state.from === "auto" && state.detectedSource ? (
                <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-800 dark:bg-brand-900/40 dark:text-brand-200">
                  {t("aiDetectedSource", {
                    lang: getLanguageLabel(state.detectedSource, langOptions, t),
                  })}
                </span>
              ) : null}
            </span>
            <PrivacySelectField
              value={state.from}
              options={fromOptions}
              onChange={(value) => dispatch({ type: "set-from", value })}
              rtl={rtl}
              fullWidth
              ariaLabel={t("aiTranslateFrom")}
            />
          </div>

          <button
            type="button"
            className="vs-btn-outline mx-auto inline-flex h-10 w-full min-w-[7rem] items-center justify-center gap-2 px-3 text-sm md:w-auto"
            onClick={() => dispatch({ type: "swap", pickSwapTo })}
            title={t("aiTranslateSwap")}
            aria-label={t("aiTranslateSwap")}
            data-tour="ai-translate-swap"
          >
            <ArrowLeftRight className={cn("h-4 w-4", rtl && "scale-x-[-1]")} />
            <span className="hidden sm:inline">{t("aiTranslateSwap")}</span>
          </button>

          <div className="grid min-w-0 gap-1.5 text-xs font-semibold text-muted">
            {t("aiTranslateTo")}
            <PrivacySelectField
              value={state.to}
              options={toOptions}
              onChange={(value) => dispatch({ type: "set-to", value })}
              rtl={rtl}
              fullWidth
              ariaLabel={t("aiTranslateTo")}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {quickPhrases.map((phrase) => (
            <button
              key={phrase}
              type="button"
              onClick={() => dispatch({ type: "set-input", value: phrase })}
              className="vs-ai-quick-phrase-chip"
            >
              {phrase}
            </button>
          ))}
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <label className="grid min-w-0 gap-1.5 text-xs font-semibold text-muted">
            {t("aiTranslateInputLabel")}
            <textarea
              value={state.input}
              onChange={(e) => dispatch({ type: "set-input", value: e.target.value })}
              rows={6}
              dir="auto"
              className="vs-textarea min-h-[140px] w-full sm:min-h-[150px]"
              placeholder={t("aiTranslatePlaceholder")}
              data-tour="ai-translate-input"
            />
          </label>
          <label className="grid min-w-0 gap-1.5 text-xs font-semibold text-muted">
            {t("aiTranslateOutputLabel")}
            <textarea
              value={state.out}
              readOnly
              rows={6}
              dir="auto"
              className="vs-textarea min-h-[140px] w-full bg-canvas/60 dark:bg-black/20 sm:min-h-[150px]"
              placeholder={t("aiTranslateOutputPlaceholder")}
              data-tour="ai-translate-output"
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={state.busy || !String(state.input || "").trim()}
            onClick={runTranslate}
            className="vs-btn-primary-inline disabled:opacity-60"
            data-tour="ai-translate-run"
          >
            {state.busy ? t("translating") : t("aiTranslateButton")}
          </button>
          <button
            type="button"
            className="vs-btn-outline inline-flex items-center gap-2 px-3 py-2 text-sm"
            disabled={!state.out}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(String(state.out || ""));
                setCopiedFlash(true);
                window.setTimeout(() => setCopiedFlash(false), 1200);
              } catch {
                /* ignore */
              }
            }}
          >
            <Copy className="h-4 w-4" />
            {copiedFlash ? t("aiTranslateCopied") : t("aiTranslateCopy")}
          </button>
          <button
            type="button"
            className="vs-btn-outline inline-flex items-center gap-2 px-3 py-2 text-sm"
            onClick={() => dispatch({ type: "clear-all" })}
          >
            <Trash2 className="h-4 w-4" />
            {t("aiTranslateClear")}
          </button>
          {state.err ? (
            <span className="text-xs font-semibold text-red-600 dark:text-red-400">{state.err}</span>
          ) : null}
        </div>
      </div>
    </section>
  );
}
