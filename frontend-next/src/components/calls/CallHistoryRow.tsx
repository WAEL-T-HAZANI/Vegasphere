import { memo } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import {
  ChevronRight,
  PhoneCall,
  PhoneIncoming,
  PhoneMissed,
  PhoneOutgoing,
  Video,
} from "lucide-react";
import { cn } from "@/lib/classNames";
import { buildAutocallHref } from "@/lib/callLaunch";
import {
  deriveDirection,
  deriveOutcome,
  formatDuration,
  formatRelative,
} from "@/lib/callHistory";

function CallHistoryRow({ item, meId, locale, t }) {
  const { i18n } = useTranslation();
  const rtl = i18n.dir() === "rtl";
  const direction = deriveDirection(item, meId);
  const outcome = deriveOutcome(item);
  const peers = item.peers || [];
  const title =
    item.conversationId?.name ||
    peers.map((peer) => peer.name).join(", ") ||
    t("callsHistoryUnknown");
  const conversationId = item.conversationId?._id;
  const href = conversationId ? `/chat/${conversationId}` : "/chats";

  const DirectionIcon =
    direction === "missed"
      ? PhoneMissed
      : direction === "incoming"
        ? PhoneIncoming
        : PhoneOutgoing;

  const statusTone =
    outcome === "missed"
      ? "text-brand-800 dark:text-brand-200"
      : outcome === "declined" || outcome === "cancelled"
        ? "text-muted"
        : outcome === "ongoing"
          ? "text-brand-600 dark:text-brand-300"
          : "text-brand-700 dark:text-[rgb(var(--vega-ink))]/90";

  return (
    <div className="group flex items-center gap-3 rounded-3xl border border-brand-200/45 bg-surface/85 px-3 py-3 shadow-sm ring-1 ring-brand-700/[0.03] backdrop-blur transition hover:-translate-y-0.5 hover:border-brand-400/60 hover:bg-brand-50/35 hover:shadow-md dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-brand-700/60 dark:hover:bg-brand-900/20 sm:gap-4 sm:px-4 sm:py-4">
      <Link href={href} className="flex min-w-0 flex-1 items-center gap-4">
        <div
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
            item.mode === "video"
              ? "bg-brand-100 text-brand-700 ring-1 ring-brand-200/60 dark:bg-brand-900/30 dark:text-[rgb(var(--vega-ink))]/90 dark:ring-brand-800/50"
              : "bg-brand-50 text-brand-700 ring-1 ring-brand-200/60 dark:bg-white/[0.05] dark:text-[rgb(var(--vega-ink))]/90 dark:ring-white/10",
          )}
        >
          {item.mode === "video" ? (
            <Video className="h-5 w-5" aria-hidden />
          ) : (
            <PhoneCall className="h-5 w-5" aria-hidden />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="truncate text-sm font-semibold text-ink">{title}</div>
            {item.groupCall ? (
              <span className="rounded-full bg-subtle px-2 py-0.5 text-[11px] font-medium text-muted">
                {t("groupCallTitle")}
              </span>
            ) : null}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
            <span className="inline-flex items-center gap-1">
              <DirectionIcon className="h-3.5 w-3.5" aria-hidden />
              {t(
                direction === "incoming"
                  ? "callsHistoryIncoming"
                  : direction === "outgoing"
                    ? "callsHistoryOutgoing"
                    : "callsHistoryMissed",
              )}
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full bg-subtle px-2 py-0.5",
                statusTone,
              )}
            >
              {t(
                outcome === "completed"
                  ? "callsHistoryCompleted"
                  : outcome === "declined"
                    ? "callsHistoryDeclined"
                    : outcome === "cancelled"
                      ? "callsHistoryCancelled"
                      : outcome === "ongoing"
                        ? "callsHistoryOngoing"
                        : "callsHistoryMissedLabel",
              )}
            </span>
            <span>{t(item.mode === "video" ? "callStartVideo" : "callStartVoice")}</span>
            {item.durationSec > 0 ? <span>{formatDuration(item.durationSec)}</span> : null}
            <span>{formatRelative(item.endedAt || item.createdAt, locale)}</span>
          </div>
        </div>

        <ChevronRight
          className={cn(
            "hidden h-4 w-4 shrink-0 text-muted transition group-hover:text-ink sm:inline-flex",
            rtl && "rotate-180",
          )}
          aria-hidden
        />
      </Link>

      {conversationId ? (
        <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row">
          <Link
            href={buildAutocallHref(conversationId, "audio", { from: "calls" })}
            className="inline-flex items-center justify-center gap-1 rounded-xl border border-brand-200/50 bg-surface/85 px-2.5 py-2 text-xs font-semibold text-brand-700 transition hover:border-brand-400/60 hover:bg-brand-50/60 dark:border-white/10 dark:bg-white/[0.03] dark:text-[rgb(var(--vega-ink))]/90 dark:hover:bg-brand-900/20"
            title={t("callsHistoryRedialVoice")}
            aria-label={t("callsHistoryRedialVoice")}
          >
            <PhoneCall className="h-3.5 w-3.5" aria-hidden />
            <span className="hidden md:inline">{t("callStartVoice")}</span>
          </Link>
          <Link
            href={buildAutocallHref(conversationId, "video", { from: "calls" })}
            className="inline-flex items-center justify-center gap-1 rounded-xl border border-brand-200/50 bg-surface/85 px-2.5 py-2 text-xs font-semibold text-brand-700 transition hover:border-brand-400/60 hover:bg-brand-50/60 dark:border-white/10 dark:bg-white/[0.03] dark:text-[rgb(var(--vega-ink))]/90 dark:hover:bg-brand-900/20"
            title={t("callsHistoryRedialVideo")}
            aria-label={t("callsHistoryRedialVideo")}
          >
            <Video className="h-3.5 w-3.5" aria-hidden />
            <span className="hidden md:inline">{t("callStartVideo")}</span>
          </Link>
        </div>
      ) : null}
    </div>
  );
}

export default memo(CallHistoryRow);
