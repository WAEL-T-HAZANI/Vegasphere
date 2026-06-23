"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";
import { aiClient } from "@/lib/clients";
import { useAiReplyTone } from "@/lib/aiReplyTone";
import { cn } from "@/lib/classNames";

const EMPTY_ARR: Array<{ sender?: string; text?: string }> = [];

export type SmartReplyBarProps = {
  recentTexts?: string[];
  recentMessages?: Array<{ sender?: string; text?: string }>;
  subject?: string;
  conversationKind?: "dm" | "group" | "channel" | "self" | "preview";
  showControls?: boolean;
  autoGenerate?: boolean;
  triggerKey?: string;
  onPick: (_text: string) => void;
};

export default function SmartReplyBar({
  recentTexts,
  recentMessages,
  subject = "",
  conversationKind,
  showControls = false,
  autoGenerate = true,
  triggerKey = "",
  onPick,
}: SmartReplyBarProps) {
  const { t, i18n } = useTranslation();
  const rtl = i18n.dir() === "rtl";
  const { tone } = useAiReplyTone();
  const [items, setItems] = useState<string[]>([]);
  const [contextPreview, setContextPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [usedFallback, setUsedFallback] = useState(false);
  const [manualRun, setManualRun] = useState(0);
  const requestIdRef = useRef(0);

  const normalized = useMemo(() => {
    const safeRecentMessages = Array.isArray(recentMessages)
      ? recentMessages
      : EMPTY_ARR;
    const safeRecentTexts = Array.isArray(recentTexts)
      ? recentTexts
      : EMPTY_ARR;
    const messages = Array.isArray(recentMessages)
      ? safeRecentMessages
          .map((m) => ({
            sender: m?.sender === "me" ? "me" : "them",
            text: String(m?.text || "").trim(),
          }))
          .filter((m) => m.text)
      : [];
    const texts = Array.isArray(recentTexts)
      ? safeRecentTexts
          .map((x) =>
            (typeof x === "string" ? x : String(x?.text || "")).trim(),
          )
          .filter(Boolean)
      : [];
    return {
      messages,
      texts,
      subject: String(subject || "").trim(),
    };
  }, [recentMessages, recentTexts, subject]);

  const normalizedRef = useRef(normalized);
  normalizedRef.current = normalized;

  const localPreview = useMemo(() => {
    const lastIncoming = [...normalized.messages]
      .reverse()
      .find((m) => m.sender === "them");
    if (lastIncoming?.text) return lastIncoming.text;
    return normalized.texts[normalized.texts.length - 1] || "";
  }, [normalized.messages, normalized.texts]);

  const fetchKey = useMemo(() => {
    const lang = i18n.language || "en";
    if (!autoGenerate) {
      if (manualRun <= 0) return "";
      const ctx =
        triggerKey ||
        normalized.texts.join("|") ||
        normalized.messages.map((m) => m.text).join("|");
      return `manual:${manualRun}:${tone}:${lang}:${ctx}`;
    }
    if (triggerKey) return `${triggerKey}::${tone}::${lang}`;
    if (normalized.messages.length || normalized.texts.length) {
      return `auto::${tone}::${lang}::${normalized.subject}`;
    }
    return "";
  }, [autoGenerate, manualRun, triggerKey, tone, i18n.language, normalized]);

  useEffect(() => {
    if (!fetchKey) {
      setItems([]);
      setContextPreview("");
      setLoading(false);
      setUsedFallback(false);
      return;
    }

    const normalized = normalizedRef.current;
    const { messages, texts, subject: subj } = normalized;
    const hasContext = messages.length || texts.length;
    if (!hasContext) {
      setItems([]);
      setContextPreview("");
      setLoading(false);
      setUsedFallback(false);
      return;
    }

    let cancelled = false;
    const reqId = ++requestIdRef.current;

    (async () => {
      setLoading(true);
      setUsedFallback(false);
      if (!autoGenerate) {
        setItems([]);
      }
      try {
        const contextMessages = messages.length
          ? messages.slice(-12)
          : texts.slice(-6).map((text) => ({ text, sender: "them" }));
        const payload: Record<string, unknown> = {
          recentMessages: contextMessages,
          subject: subj,
          language: i18n.language || "en",
          tone,
          regenerate: manualRun > 1,
          variationSeed: manualRun,
        };
        if (conversationKind && conversationKind !== "preview") {
          payload.conversationKind = conversationKind;
        }
        const { data } = await aiClient.getSmartReplies(payload, {
          timeout: 5000,
        });
        if (cancelled || requestIdRef.current !== reqId) return;
        const next = data?.suggestions || data?.replies || [];
        setItems(
          Array.isArray(next)
            ? next.map((s) => String(s || "").trim()).filter(Boolean)
            : [],
        );
        setContextPreview(String(data?.contextPreview || localPreview || ""));
      } catch {
        if (cancelled || requestIdRef.current !== reqId) return;
        const fb = i18n.language?.startsWith("ar")
          ? ["👍", "تمام", "شكراً"]
          : ["👍", "OK", "Thanks!"];
        setItems(fb);
        setUsedFallback(true);
        setContextPreview(localPreview);
      } finally {
        if (requestIdRef.current === reqId) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    fetchKey,
    localPreview,
    tone,
    i18n.language,
    autoGenerate,
    conversationKind,
    manualRun,
  ]);

  const isPreview = showControls;

  if (!isPreview && !items.length && !loading) return null;

  if (isPreview) {
    const previewText = contextPreview || localPreview;

    const runGenerate = () => {
      setLoading(true);
      setItems([]);
      setUsedFallback(false);
      setManualRun((n) => n + 1);
    };

    return (
      <div
        className="vs-smart-reply-bar vs-smart-reply-bar-preview"
        dir={rtl ? "rtl" : "ltr"}
        data-tour="smart-reply-bar"
      >
        {previewText ? (
          <div className="rounded-xl border border-brand-200/45 bg-surface/70 px-3 py-2.5 dark:border-brand-800/40 dark:bg-brand-900/20">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-muted">
              {t("aiContextPreviewLabel")}
            </div>
            <p className="mt-1 text-sm leading-relaxed text-ink">
              {previewText}
            </p>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-100/80 dark:bg-brand-900/40"
              aria-hidden
            >
              <Sparkles className="vs-brand-icon-accent h-3.5 w-3.5" />
            </span>
            <span className="text-xs font-semibold text-ink">
              {t("smartReplies")}
            </span>
          </div>
          <button
            type="button"
            onClick={runGenerate}
            className="vs-btn-outline-sm shrink-0 disabled:opacity-60"
            disabled={loading}
          >
            {items.length || loading ? t("aiRegenerate") : t("aiGenerate")}
          </button>
        </div>

        {usedFallback && !loading ? (
          <span className="text-xs text-muted/80">
            {t("smartReplyUsingDefaults")}
          </span>
        ) : null}
        {loading ? (
          <div
            className="vs-smart-reply-bar-chips flex flex-wrap gap-2"
            aria-label={t("smartReplyLoading")}
          >
            {[0, 1, 2].map((k) => (
              <span
                key={k}
                className="h-8 w-28 animate-pulse rounded-full bg-black/10 dark:bg-white/10"
                aria-hidden
              />
            ))}
          </div>
        ) : (
          <div className="vs-smart-reply-bar-chips flex flex-wrap gap-2">
            {items.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onPick?.(s)}
                className={cn("vs-btn-primary-sm", "rounded-full !shadow-md")}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="vs-smart-reply-bar-compact"
      dir={rtl ? "rtl" : "ltr"}
      data-tour="smart-reply-bar"
      aria-label={t("smartReplies")}
    >
      <div className="vs-horizontal-scroll-strip flex min-h-8 flex-nowrap items-center gap-1.5">
        {loading && !items.length
          ? [0, 1, 2].map((k) => (
              <span
                key={k}
                className="h-6 min-w-[3.5rem] shrink-0 animate-pulse rounded-full bg-brand-100/70 dark:bg-white/10"
                aria-hidden
              />
            ))
          : null}
        {items.map((s, idx) => (
          <button
            key={`${idx}-${s}`}
            type="button"
            onClick={() => onPick?.(s)}
            className={cn("vs-smart-reply-chip-sm", loading && "opacity-70")}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
