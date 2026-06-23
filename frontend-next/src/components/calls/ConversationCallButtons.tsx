"use client";

import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { PhoneCall, Video } from "lucide-react";
import { cn } from "@/lib/classNames";
import { buildAutocallHref } from "@/lib/callLaunch";
import { primeCallRingtone } from "@/lib/callRingtone";

export default function ConversationCallButtons({
  conversationId,
  canCall = true,
  compact = false,
  className = "",
}) {
  const router = useRouter();
  const { t } = useTranslation();

  if (!canCall || !conversationId) return null;

  const start = (mode) => {
    primeCallRingtone();
    router.push(buildAutocallHref(conversationId, mode));
  };

  const btnClass = compact
    ? "inline-flex h-9 w-9 items-center justify-center rounded-full border border-brand-200/50 bg-surface/85 text-brand-700 shadow-sm outline-none transition hover:border-brand-400/60 hover:bg-brand-50/60 focus-visible:ring-2 focus-visible:ring-brand-400 dark:border-white/10 dark:bg-white/[0.03] dark:text-[rgb(var(--vega-ink))]/90 dark:hover:bg-brand-900/20"
    : "inline-flex items-center justify-center gap-1.5 rounded-full border border-brand-200/50 bg-surface/85 px-3 py-1.5 text-sm font-semibold text-brand-700 shadow-sm outline-none transition hover:border-brand-400/60 hover:bg-brand-50/60 focus-visible:ring-2 focus-visible:ring-brand-400 dark:border-white/10 dark:bg-white/[0.03] dark:text-[rgb(var(--vega-ink))]/90 dark:hover:bg-brand-900/20";

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <button
        type="button"
        onClick={() => start("audio")}
        className={btnClass}
        title={t("callStartVoice")}
        aria-label={t("callStartVoice")}
      >
        <PhoneCall className="h-4 w-4" aria-hidden />
        {!compact ? <span className="hidden sm:inline">{t("callStartVoice")}</span> : null}
      </button>
      <button
        type="button"
        onClick={() => start("video")}
        className={btnClass}
        title={t("callStartVideo")}
        aria-label={t("callStartVideo")}
      >
        <Video className="h-4 w-4" aria-hidden />
        {!compact ? <span className="hidden sm:inline">{t("callStartVideo")}</span> : null}
      </button>
    </div>
  );
}
