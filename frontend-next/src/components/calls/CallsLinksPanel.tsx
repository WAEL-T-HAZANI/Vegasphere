"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { CalendarClock, Copy, Link2, Trash2, Video, PhoneCall } from "lucide-react";
import { callsClient } from "@/lib/clients";
import { formatApiError } from "@/lib/apiError";
import { showAppToast, showAppErrorToast } from "@/lib/appToast";
import { cn } from "@/lib/classNames";
import {
  conversationCallLabel,
  isCallableConversation,
} from "@/lib/callLaunch";
import CallsConversationSelect from "@/components/calls/CallsConversationSelect";

export type CallInviteItem = {
  _id: string;
  token: string;
  mode?: "audio" | "video";
  title?: string;
  scheduledFor?: string | null;
  conversationId?: {
    _id?: string;
    name?: string;
    isGroup?: boolean;
    isChannel?: boolean;
  } | null;
  creatorId?: { _id?: string; name?: string } | null;
};

type CallsLinksPanelProps = {
  conversations?: Array<Record<string, unknown>>;
  invites?: CallInviteItem[];
  myId?: string;
  locale?: string;
  busy?: boolean;
  onRefresh: () => Promise<void> | void;
};

function inviteHref(token: string) {
  if (typeof window === "undefined") return `/call/${token}`;
  return `${window.location.origin}/call/${token}`;
}

export default function CallsLinksPanel({
  conversations = [],
  invites = [],
  myId = "",
  locale = "en",
  busy = false,
  onRefresh,
}: CallsLinksPanelProps) {
  const { t, i18n } = useTranslation();
  const rtl = i18n.dir() === "rtl";
  const [conversationId, setConversationId] = useState("");
  const [mode, setMode] = useState<"audio" | "video">("audio");
  const [title, setTitle] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  const [saving, setSaving] = useState(false);
  const [cancellingId, setCancellingId] = useState("");

  const callable = useMemo(
    () => (conversations || []).filter((conv) => isCallableConversation(conv)),
    [conversations],
  );

  const conversationOptions = useMemo(
    () =>
      callable.map((conv) => ({
        value: String(conv._id),
        label: `${conversationCallLabel(conv, t, myId)}${
          conv.isGroup ? ` · ${t("navGroups")}` : ""
        }`,
      })),
    [callable, myId, t],
  );

  const scheduled = useMemo(
    () =>
      invites.filter((item) => item.scheduledFor && new Date(item.scheduledFor).getTime() > Date.now()),
    [invites],
  );

  const readyLinks = useMemo(
    () => invites.filter((item) => !item.scheduledFor),
    [invites],
  );

  const formatSchedule = (value?: string | null) => {
    if (!value) return t("callLinkReadyNow");
    try {
      return new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value));
    } catch {
      return value;
    }
  };

  const createLink = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!conversationId) return;
    setSaving(true);
    try {
      await callsClient.createCallInvite({
        conversationId,
        mode,
        title: title.trim(),
        scheduledFor: scheduledFor ? new Date(scheduledFor).toISOString() : null,
      });
      setTitle("");
      setScheduledFor("");
      showAppToast({ id: "call-link-created", body: t("callLinkCreated") });
      await onRefresh();
    } catch (error) {
      showAppErrorToast(formatApiError(error, t, "callLinkCreateFailed"), "call-link-create-failed");
    } finally {
      setSaving(false);
    }
  };

  const copyLink = async (token: string) => {
    try {
      await navigator.clipboard.writeText(inviteHref(token));
      showAppToast({ id: "call-link-copy", body: t("callLinkCopied") });
    } catch {
      showAppErrorToast(t("callLinkCopyFailed"), "call-link-copy-failed");
    }
  };

  const cancelLink = async (inviteId: string) => {
    setCancellingId(inviteId);
    try {
      await callsClient.cancelCallInvite(inviteId);
      showAppToast({ id: "call-link-cancelled", body: t("callLinkCancelled") });
      await onRefresh();
    } catch (error) {
      showAppErrorToast(formatApiError(error, t, "callLinkCancelFailed"), "call-link-cancel-failed");
    } finally {
      setCancellingId("");
    }
  };

  const renderInviteRow = (item: CallInviteItem) => {
    const conv = item.conversationId;
    const label =
      item.title?.trim() ||
      conv?.name ||
      conversationCallLabel(
        conv ? { ...conv, _id: conv._id, members: [] } : null,
        t,
        myId,
      );
    const canCancel = String(item.creatorId?._id || "") === String(myId);

    return (
      <div
        key={item._id}
        className="flex flex-col gap-3 rounded-2xl border border-brand-200/40 bg-canvas/40 px-3 py-3 dark:border-white/10 dark:bg-white/[0.02] sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-ink">{label}</div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
            <span className="inline-flex items-center gap-1">
              {item.mode === "video" ? (
                <Video className="h-3.5 w-3.5" aria-hidden />
              ) : (
                <PhoneCall className="h-3.5 w-3.5" aria-hidden />
              )}
              {t(item.mode === "video" ? "callStartVideo" : "callStartVoice")}
            </span>
            <span>
              {item.scheduledFor
                ? t("callScheduledForLabel", { date: formatSchedule(item.scheduledFor) })
                : t("callLinkReadyNow")}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Link
            href={`/call/${encodeURIComponent(item.token)}`}
            className="vs-btn-outline-sm inline-flex items-center gap-1 px-3 py-2"
          >
            {t("callLinkOpen")}
          </Link>
          <button
            type="button"
            onClick={() => void copyLink(item.token)}
            className="vs-btn-outline-sm inline-flex items-center gap-1 px-3 py-2"
          >
            <Copy className="h-3.5 w-3.5" aria-hidden />
            {t("callLinkCopy")}
          </button>
          {canCancel ? (
            <button
              type="button"
              disabled={cancellingId === item._id}
              onClick={() => void cancelLink(item._id)}
              className="vs-btn-outline-sm inline-flex items-center gap-1 px-3 py-2 text-brand-800 dark:text-[rgb(var(--vega-ink))]/90"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
              {cancellingId === item._id ? t("callLinkCancelling") : t("callLinkCancel")}
            </button>
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4" dir={rtl ? "rtl" : "ltr"}>
      <div className="vs-settings-card p-4 md:p-5">
        <div className="mb-4 flex items-start gap-3">
          <div className="vs-icon-tile h-10 w-10 rounded-2xl">
            <Link2 className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-ink">{t("callLinksTitle")}</h2>
            <p className="mt-1 text-sm text-muted">{t("callLinksHint")}</p>
          </div>
        </div>

        <form onSubmit={(e) => void createLink(e)} className="space-y-3">
          <div className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">
              {t("callLinksSelectConversation")}
            </span>
            <CallsConversationSelect
              value={conversationId}
              options={conversationOptions}
              onChange={setConversationId}
              placeholder={t("callsStartSelectPlaceholder")}
              disabled={busy || callable.length === 0}
              rtl={rtl}
              ariaLabel={t("callLinksSelectConversation")}
            />
          </div>

          <input
            className="vs-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("callLinksTitlePlaceholder")}
            maxLength={120}
            dir="auto"
          />

          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setMode("audio")}
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition",
                mode === "audio"
                  ? "border-brand-500 bg-brand-50 text-brand-800 dark:border-brand-700 dark:bg-brand-900/30 dark:text-[rgb(var(--vega-ink))]"
                  : "border-brand-200/50 bg-surface/80 text-muted dark:border-brand-800/40",
              )}
            >
              <PhoneCall className="h-4 w-4" aria-hidden />
              {t("callStartVoice")}
            </button>
            <button
              type="button"
              onClick={() => setMode("video")}
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition",
                mode === "video"
                  ? "border-brand-500 bg-brand-50 text-brand-800 dark:border-brand-700 dark:bg-brand-900/30 dark:text-[rgb(var(--vega-ink))]"
                  : "border-brand-200/50 bg-surface/80 text-muted dark:border-brand-800/40",
              )}
            >
              <Video className="h-4 w-4" aria-hidden />
              {t("callStartVideo")}
            </button>
          </div>

          <label className="grid gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">
              {t("callScheduleWhenLabel")}
            </span>
            <input
              type="datetime-local"
              className="vs-input"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
            />
          </label>

          <button
            type="submit"
            disabled={busy || saving || !conversationId}
            className="vs-btn-primary"
          >
            {saving
              ? t("callLinkCreating")
              : scheduledFor
                ? t("callScheduleCreate")
                : t("callLinkCreate")}
          </button>
        </form>
      </div>

      <div className="vs-settings-card p-4 md:p-5">
        <div className="mb-3 flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-brand-700 dark:text-[rgb(var(--vega-ink))]/90" aria-hidden />
          <h3 className="text-sm font-semibold text-ink">{t("callScheduledTitle")}</h3>
        </div>
        <p className="mb-3 text-xs text-muted">{t("callScheduledHint")}</p>
        {scheduled.length ? (
          <div className="space-y-2">{scheduled.map(renderInviteRow)}</div>
        ) : (
          <div className="vs-brand-dashed-empty px-4 py-8 text-center text-sm text-muted">
            <p className="font-semibold text-ink">{t("callScheduledEmptyTitle")}</p>
            <p className="mt-2">{t("callScheduledEmptyHint")}</p>
          </div>
        )}
      </div>

      {readyLinks.length ? (
        <div className="vs-settings-card p-4 md:p-5">
          <h3 className="text-sm font-semibold text-ink">{t("callLinksTitle")}</h3>
          <p className="mt-1 text-xs text-muted">{t("callLinkReadyNow")}</p>
          <div className="mt-3 space-y-2">{readyLinks.map(renderInviteRow)}</div>
        </div>
      ) : null}
    </div>
  );
}
