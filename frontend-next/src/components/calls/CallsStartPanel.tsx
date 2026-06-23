"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ChevronRight, PhoneCall, Video } from "lucide-react";
import { cn } from "@/lib/classNames";
import CallsConversationSelect from "@/components/calls/CallsConversationSelect";
import {
  buildAutocallHref,
  conversationCallLabel,
  isCallableConversation,
} from "@/lib/callLaunch";

const videoBtnClass =
  "inline-flex items-center justify-center gap-2 rounded-2xl border border-brand-300/70 bg-brand-50/80 px-4 py-3 text-sm font-semibold text-brand-800 shadow-sm transition hover:border-brand-400 hover:bg-brand-100 dark:border-brand-800/40 dark:bg-brand-900/10 dark:text-brand-200 dark:hover:border-brand-700/60 dark:hover:bg-brand-900/20";

export default function CallsStartPanel({
  conversations = [],
  myId = "",
  selectedConversationId,
  onSelectConversation,
  statusMsg = "",
}) {
  const { t, i18n } = useTranslation();
  const rtl = i18n.dir() === "rtl";

  const callable = useMemo(
    () =>
      (conversations || [])
        .filter((conv) => isCallableConversation(conv))
        .sort((a, b) => {
          const aTime = new Date(a.updatedAt || 0).getTime();
          const bTime = new Date(b.updatedAt || 0).getTime();
          return bTime - aTime;
        }),
    [conversations],
  );

  const selected = useMemo(
    () => callable.find((conv) => String(conv._id) === String(selectedConversationId)),
    [callable, selectedConversationId],
  );

  const conversationOptions = useMemo(
    () =>
      callable.map((conv) => ({
        value: String(conv._id),
        label: `${conversationCallLabel(conv, t, myId)}${
          conv.isGroup ? ` · ${t("navGroups")}` : ""
        }`,
      })),
    [callable, t, myId],
  );

  const startDisabled = !selectedConversationId;

  return (
    <div className="space-y-4" dir={rtl ? "rtl" : "ltr"}>
      <div className="vs-settings-card p-4 md:p-5">
        <div className="mb-4 flex items-start gap-3">
          <div className="vs-icon-tile h-10 w-10 rounded-2xl">
            <PhoneCall className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-ink">{t("callsStartTitle")}</h2>
            <p className="mt-1 text-sm text-muted">{t("callsStartHint")}</p>
          </div>
        </div>

        {callable.length === 0 ? (
          <div className="vs-brand-dashed-empty px-5 py-10 text-center">
            <p className="text-sm text-muted">{t("callsQuickDialEmpty")}</p>
            <Link
              href="/chats"
              className="mt-4 inline-flex items-center gap-1 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 dark:bg-brand-700 dark:hover:bg-brand-800"
            >
              {t("navChats")}
              <ChevronRight className={cn("h-4 w-4", rtl && "rotate-180")} aria-hidden />
            </Link>
          </div>
        ) : (
          <div className="grid gap-3">
            <div className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                {t("callsStartSelectChat")}
              </span>
              <CallsConversationSelect
                value={selectedConversationId}
                options={conversationOptions}
                onChange={onSelectConversation}
                placeholder={t("callsStartSelectPlaceholder")}
                disabled={callable.length === 0}
                rtl={rtl}
                ariaLabel={t("callsStartSelectChat")}
              />
            </div>

            {selected ? (
              <div className="vs-brand-inset rounded-2xl px-4 py-3 text-sm">
                <div className="font-semibold">{conversationCallLabel(selected, t, myId)}</div>
                <div className="mt-1 text-xs text-muted">
                  {selected.isGroup ? t("callsStartGroupHint") : t("callsStartDirectHint")}
                </div>
              </div>
            ) : null}

            <div className="grid gap-2 sm:grid-cols-2">
              <Link
                href={
                  startDisabled
                    ? "#"
                    : buildAutocallHref(selectedConversationId, "audio", { from: "calls" })
                }
                aria-disabled={startDisabled}
                onClick={(e) => {
                  if (startDisabled) e.preventDefault();
                }}
                className={cn(
                  "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold shadow-sm transition",
                  startDisabled
                    ? "pointer-events-none bg-subtle text-muted opacity-60"
                    : "bg-brand-600 text-white shadow-brand-600/25 hover:bg-brand-700 dark:bg-brand-700 dark:shadow-brand-800/30 dark:hover:bg-brand-800",
                )}
              >
                <PhoneCall className="h-4 w-4" aria-hidden />
                {t("callStartVoice")}
              </Link>
              <Link
                href={
                  startDisabled
                    ? "#"
                    : buildAutocallHref(selectedConversationId, "video", { from: "calls" })
                }
                aria-disabled={startDisabled}
                onClick={(e) => {
                  if (startDisabled) e.preventDefault();
                }}
                className={cn(
                  videoBtnClass,
                  startDisabled &&
                    "pointer-events-none border-transparent bg-subtle text-muted opacity-60 dark:bg-subtle/20",
                )}
              >
                <Video className="h-4 w-4" aria-hidden />
                {t("callStartVideo")}
              </Link>
            </div>

            {statusMsg ? <div className="vs-muted-panel text-sm">{statusMsg}</div> : null}
          </div>
        )}
      </div>
    </div>
  );
}
