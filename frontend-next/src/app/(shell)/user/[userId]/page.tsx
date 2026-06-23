"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { useParams, useRouter } from "next/navigation";
import { useAppSelector, useAppDispatch } from "@/store/hooks";

import {
  AtSign,
  Calendar,
  ChevronLeft,
  MessageCircle,
  UserRound,
} from "lucide-react";
import {
  conversationClient,
  statusClient,
  userClient,
} from "@/lib/clients";
import { formatApiError } from "@/lib/apiError";
import { openOrRequestDirectChat } from "@/lib/directChat";
import { API_ORIGIN } from "@/lib/constants";
import { cn } from "@/lib/classNames";
import ProtectedPageGate from "@/components/layout/ProtectedPageGate";
import PresenceDot from "@/components/presence/PresenceDot";
import { setConversations } from "@/store/slices/chatSlice";
import { formatPresenceLine } from "@/lib/formatPresence";
import { isOnlinePresenceValue } from "@/lib/presence";

const DEFAULT_AVATAR = "/icon.svg";

function resolveAvatarUrl(raw) {
  const value = String(raw || "").trim();
  if (!value) return DEFAULT_AVATAR;
  if (/^https?:\/\//i.test(value) || /^data:/i.test(value)) return value;
  return `${API_ORIGIN}${value.startsWith("/") ? value : `/${value}`}`;
}

function formatDateTime(iso, locale) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  try {
    return new Intl.DateTimeFormat(locale || undefined, {
      dateStyle: "medium",
    }).format(d);
  } catch {
    return d.toLocaleDateString();
  }
}

function resolveStatusImageUrl(raw) {
  const value = String(raw || "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value) || /^data:/i.test(value)) return value;
  if (value.startsWith("/")) return `${API_ORIGIN}${value}`;
  return `${API_ORIGIN}/${value}`;
}

export default function PublicUserProfilePage() {
  const { t, i18n } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const status = useAppSelector((s) => s.auth.status);
  const me = useAppSelector((s) => s.auth.user);
  const conversations = useAppSelector((s) => s.chat.conversations);
  const userId = String(params?.userId || "").trim();
  const locale = i18n.resolvedLanguage || i18n.language;

  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState("");
  const [u, setU] = useState(null);
  const [actionBusy, setActionBusy] = useState(false);

  const [statusBusy, setStatusBusy] = useState(false);
  const [statuses, setStatuses] = useState([]);
  const [presence, setPresence] = useState(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setBusy(true);
    setErr("");
    try {
      const [profileRes, presenceRes] = await Promise.all([
        userClient.getPublicProfile(userId),
        userClient.getOnlineStatus(userId).catch(() => ({ data: null })),
      ]);
      setU(profileRes.data || null);
      setPresence(presenceRes.data || null);
    } catch (e) {
      setU(null);
      setPresence(null);
      setErr(formatApiError(e, t));
    } finally {
      setBusy(false);
    }
  }, [userId, t]);

  useEffect(() => {
    load();
  }, [load]);

  const isSelf = Boolean(me?._id && userId && String(me._id) === String(userId));

  const formatRelative = useCallback(
    (dateValue) => {
      if (!dateValue) return "";
      const date = new Date(dateValue);
      if (Number.isNaN(date.getTime())) return "";
      const diffMs = date.getTime() - Date.now();
      const formatter = new Intl.RelativeTimeFormat(
        String(i18n.language || "en").startsWith("ar") ? "ar" : "en",
        { numeric: "auto" }
      );
      const sec = Math.round(diffMs / 1000);
      const min = Math.round(sec / 60);
      const hour = Math.round(min / 60);
      const day = Math.round(hour / 24);
      if (Math.abs(sec) < 60) return formatter.format(sec, "second");
      if (Math.abs(min) < 60) return formatter.format(min, "minute");
      if (Math.abs(hour) < 24) return formatter.format(hour, "hour");
      return formatter.format(day, "day");
    },
    [i18n.language]
  );

  const initials = useMemo(() => {
    const base = String(u?.name || u?.username || "V")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((s) => String(s || "")[0] || "")
      .join("")
      .toUpperCase();
    return base || "V";
  }, [u?.name, u?.username]);

  const syncChats = useCallback(async () => {
    const { data } = await conversationClient.listConversations();
    dispatch(setConversations(data || []));
  }, [dispatch]);

  const startChat = useCallback(async () => {
    if (!me?._id || !userId || isSelf) return;
    setActionBusy(true);
    setErr("");
    try {
      const result = await openOrRequestDirectChat({
        myUserId: me._id,
        otherUserId: userId,
        conversations,
        dispatch,
        t,
      });
      if (result.ok === false) {
        setErr(result.error);
      } else if (result.kind === "opened") {
        router.push(`/chats/${result.conversationId}`);
      }
    } finally {
      setActionBusy(false);
    }
  }, [conversations, dispatch, isSelf, me?._id, router, t, userId]);

  const loadStatus = useCallback(async () => {
    if (!me?._id || !userId) return;
    setStatusBusy(true);
    try {
      const { data } = isSelf
        ? await statusClient.getMyStatus()
        : await statusClient.getStatusFeed();
      const list = Array.isArray(data) ? data : [];
      const filtered = list.filter((row) => {
        const owner = row?.userId;
        const uid =
          owner && typeof owner === "object" && owner._id
            ? String(owner._id)
            : String(owner || "");
        return uid && uid === String(userId);
      });
      setStatuses(filtered.slice(0, 8));
    } catch {
      setStatuses([]);
    } finally {
      setStatusBusy(false);
    }
  }, [isSelf, me?._id, userId]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const memberSince = formatDateTime(u?.createdAt, locale);
  const hasPhoto = Boolean(String(u?.profilePic || "").trim());

  return (
    <ProtectedPageGate titleKey="navSearch" status={status} user={me}>
      <div className="flex min-h-0 w-full flex-1 flex-col">
        <header className="sticky top-0 z-10 border-b border-brand-200/50 bg-surface/95 backdrop-blur-md dark:border-brand-800/40 dark:bg-black/40">
          <div className="px-4 py-4 md:px-6">
            <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-brand-200/55 bg-surface text-ink shadow-sm transition hover:bg-subtle dark:border-brand-800/45 dark:bg-brand-900/25 dark:hover:bg-brand-900/40"
                  aria-label={t("back")}
                  title={t("back")}
                >
                  <ChevronLeft className="h-5 w-5" aria-hidden />
                </button>
                <div className="min-w-0">
                  <div className="truncate text-lg font-semibold text-ink">{t("viewProfile")}</div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 md:px-6">
          <div className="mx-auto max-w-5xl space-y-6">
            {err ? (
              <div className="rounded-2xl border border-red-200 bg-red-50/60 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
                {err}
              </div>
            ) : null}

            {busy ? (
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
                <div className="rounded-3xl border border-brand-200/45 bg-surface p-6 shadow-sm dark:border-brand-800/40 dark:bg-brand-900/15 md:p-8">
                  <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                    <div className="h-28 w-28 animate-pulse rounded-[1.35rem] bg-brand-100 dark:bg-brand-900/40" />
                    <div className="min-w-0 flex-1 space-y-3 text-center sm:text-start">
                      <div className="mx-auto h-6 w-48 animate-pulse rounded-lg bg-brand-100 dark:bg-brand-900/40 sm:mx-0" />
                      <div className="mx-auto h-4 w-32 animate-pulse rounded bg-brand-100 dark:bg-brand-900/40 sm:mx-0" />
                      <div className="mx-auto h-10 w-full max-w-xs animate-pulse rounded-2xl bg-brand-100 dark:bg-brand-900/40 sm:mx-0" />
                    </div>
                  </div>
                </div>
                <div className="h-40 animate-pulse rounded-2xl border border-brand-200/45 bg-brand-50/40 dark:border-brand-800/40 dark:bg-brand-900/15" />
              </div>
            ) : u ? (
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
                <div className="min-w-0 space-y-6">
                  {isSelf ? (
                    <div className="flex flex-col gap-3 rounded-2xl border border-brand-200/80 bg-brand-50/80 px-4 py-3 text-sm text-brand-900 dark:border-brand-800/45 dark:bg-brand-900/30 dark:text-brand-100 sm:flex-row sm:items-center sm:justify-between">
                      <span className="flex items-start gap-2">
                        <UserRound className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                        {t("publicProfileYourselfHint")}
                      </span>
                      <Link
                        href="/profile"
                        className="vs-btn-primary-sm shrink-0 justify-center px-4 py-2 text-center"
                      >
                        {t("publicProfileOpenOwnProfile")}
                      </Link>
                    </div>
                  ) : null}

                  <section
                    className={cn(
                      "rounded-3xl border border-brand-200/50 bg-gradient-to-br from-brand-50/90 via-surface to-surface p-6 shadow-md ring-1 ring-brand-500/10 md:p-8",
                      "dark:border-brand-800/40 dark:bg-brand-900/20 dark:[background-image:none] dark:shadow-black/30 dark:ring-brand-800/30",
                    )}
                  >
                    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
                      <div className="relative shrink-0">
                        {hasPhoto ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={resolveAvatarUrl(u.profilePic)}
                            alt=""
                            className="h-28 w-28 rounded-[1.35rem] border-2 border-white object-cover shadow-lg ring-1 ring-brand-200/80 dark:border-brand-700/60 dark:ring-brand-800/50"
                          />
                        ) : (
                          <div className="grid h-28 w-28 place-items-center rounded-[1.35rem] bg-brand-100 text-3xl font-extrabold text-brand-800 ring-2 ring-white/80 dark:bg-brand-800/50 dark:text-brand-100 dark:ring-brand-700/50">
                            {initials}
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1 text-center sm:pt-1 sm:text-start">
                        <h1 className="truncate text-2xl font-bold tracking-tight text-ink">
                          {u.name}
                        </h1>
                        {u.username ? (
                          <p className="mt-1 flex items-center justify-center gap-1.5 truncate text-sm font-medium text-muted sm:justify-start">
                            <AtSign className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                            <span className="truncate">{u.username}</span>
                          </p>
                        ) : (
                          <p className="mt-1 text-sm text-muted">{t("publicProfileNoUsername")}</p>
                        )}

                        {!isSelf ? (
                          <button
                            type="button"
                            onClick={startChat}
                            disabled={actionBusy}
                            className="mx-auto mt-5 inline-flex w-full max-w-xs items-center justify-center gap-2 rounded-2xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 transition hover:bg-brand-700 disabled:opacity-60 sm:mx-0 sm:w-auto sm:max-w-none sm:px-6"
                          >
                            <MessageCircle className="h-4 w-4" aria-hidden />
                            {t("startChat")}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </section>

                  <section className={cn("vs-settings-card", "!p-5 md:!p-6")}>
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
                      <MessageCircle className="h-4 w-4 text-brand-600 dark:text-brand-300" aria-hidden />
                      {t("publicProfileBioTitle")}
                    </div>
                    <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink">
                      {u.about?.trim() ? u.about.trim() : t("profileAboutEmpty")}
                    </div>
                  </section>
                </div>

                <aside className="min-w-0 space-y-4 lg:sticky lg:top-24 lg:self-start">
                  {!isSelf && presence ? (
                    <div className={cn("vs-settings-card space-y-3", "!p-4 md:!p-5")}>
                      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
                        {t("publicProfilePresenceTitle")}
                      </h2>
                      <div className="flex items-center gap-2 text-sm font-medium text-ink">
                        <PresenceDot
                          state={
                            isOnlinePresenceValue(presence.isOnline)
                              ? "online"
                              : "offline"
                          }
                        />
                        {formatPresenceLine(presence, t, locale)}
                      </div>
                    </div>
                  ) : null}

                  <div className={cn("vs-settings-card space-y-4", "!p-4 md:!p-5")}>
                    <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
                      {t("publicProfileMemberSince")}
                    </h2>
                    <div className="flex items-center gap-2 text-sm font-medium text-ink">
                      <Calendar className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-300" aria-hidden />
                      {memberSince}
                    </div>
                  </div>

                  <div className={cn("vs-settings-card space-y-3", "!p-4 md:!p-5")}>
                    <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
                      {t("publicProfileStatusTitle")}
                    </h2>
                    {statusBusy ? (
                      <div className="space-y-2">
                        <div className="h-4 w-2/3 animate-pulse rounded bg-brand-100 dark:bg-brand-900/40" />
                        <div className="h-4 w-1/2 animate-pulse rounded bg-brand-100 dark:bg-brand-900/40" />
                      </div>
                    ) : statuses.length ? (
                      <ul className="space-y-3">
                        {statuses.map((s) => {
                          const text = String(s?.text || "").trim();
                          const image = resolveStatusImageUrl(s?.imageUrl);
                          const when = formatRelative(s?.createdAt);
                          return (
                            <li
                              key={String(s?._id || `${s?.createdAt || ""}:${image || text}`)}
                              className="rounded-2xl border border-brand-200/50 bg-surface px-3 py-3 text-sm shadow-sm dark:border-brand-800/40 dark:bg-brand-900/15"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="truncate text-xs font-semibold text-muted">
                                  {when || "—"}
                                </div>
                              </div>
                              {text ? (
                                <div className="mt-2 whitespace-pre-wrap text-sm text-ink">
                                  {text}
                                </div>
                              ) : null}
                              {image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={image}
                                  alt=""
                                  className="mt-3 max-h-56 w-full rounded-2xl border border-brand-200/50 object-cover dark:border-brand-800/40"
                                />
                              ) : null}
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted">{t("statusFeedEmpty")}</p>
                    )}
                  </div>

                </aside>
              </div>
            ) : (
              <div className="rounded-3xl border border-brand-200/45 bg-surface p-8 text-center text-sm text-muted shadow-sm dark:border-brand-800/40 dark:bg-brand-900/15">
                {t("noResults")}
              </div>
            )}
          </div>
        </main>
      </div>
    </ProtectedPageGate>
  );
}
