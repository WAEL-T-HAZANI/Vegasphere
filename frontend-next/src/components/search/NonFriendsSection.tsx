"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { formatApiError } from "@/lib/apiError";
import { displayUserPrimaryLabel, userHandleLine, userInitials } from "@/lib/searchHub";
import { openOrRequestDirectChat } from "@/lib/directChat";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import type { User } from "@/types";

export default function NonFriendsSection() {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const me = useAppSelector((s) => s.auth.user);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<User[]>("/user/non-friends");
      setUsers(Array.isArray(data) ? data : []);
      setErr("");
    } catch (e) {
      setUsers([]);
      setErr(formatApiError(e, t, "errorOccurred"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const startChat = async (otherId: string) => {
    if (!me?._id) return;
    setBusyId(otherId);
    setErr("");
    try {
      const result = await openOrRequestDirectChat({
        myUserId: me._id,
        otherUserId: otherId,
        dispatch,
        t,
      });
      if (result.ok === false) {
        setErr(result.error);
      } else if (result.kind === "opened") {
        router.push(`/chats/${result.conversationId}`);
      }
    } finally {
      setBusyId("");
    }
  };

  if (loading) {
    return (
      <div className="h-40 animate-pulse rounded-2xl border border-brand-200/35 bg-subtle/80 dark:border-brand-800/30 dark:bg-brand-900/20" />
    );
  }

  return (
    <section className="vs-settings-card flex h-full flex-col space-y-4 !p-4 sm:!p-5">
      <div className="flex items-start gap-3">
        <div className="vs-icon-tile h-9 w-9 shrink-0 rounded-xl">
          <Sparkles className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-ink">{t("nonFriendsTitle")}</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            {users.length ? t("nonFriendsHint") : t("nonFriendsEmpty")}
          </p>
        </div>
      </div>

      {err ? <p className="text-sm text-red-600 dark:text-red-300">{err}</p> : null}

      {users.length > 0 ? (
        <ul className="space-y-2">
          {users.slice(0, 12).map((u) => {
            const userId = String(u._id);
            const label = displayUserPrimaryLabel(u);
            const handle = userHandleLine(u);
            const avatarUrl = String(u.profilePic || "").trim();
            return (
              <li
                key={userId}
                className="flex flex-col gap-2 rounded-2xl vs-brand-inset px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarUrl}
                      alt=""
                      className="h-10 w-10 rounded-xl object-cover ring-1 ring-brand-200/60 dark:ring-brand-800/50"
                    />
                  ) : (
                    <div className="vs-icon-tile h-10 w-10 rounded-xl text-xs font-bold">
                      {userInitials(label)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-ink">{label}</div>
                    {handle ? (
                      <div className="truncate text-xs text-muted">{handle}</div>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busyId === userId}
                    onClick={() => startChat(userId)}
                    className="vs-btn-primary-pill min-h-10 flex-1 px-4 py-2 sm:flex-none"
                  >
                    {t("startChat")}
                  </button>
                  <Link
                    href={`/user/${userId}`}
                    className="inline-flex min-h-10 flex-1 items-center justify-center rounded-full border border-brand-200/60 px-4 py-2 text-xs font-semibold text-brand-700 hover:bg-brand-50 dark:border-brand-800/40 dark:text-brand-200 dark:hover:bg-brand-900/20 sm:flex-none"
                  >
                    {t("viewProfile")}
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="vs-brand-dashed-empty px-4 py-5 text-sm">{t("nonFriendsEmpty")}</p>
      )}
    </section>
  );
}
