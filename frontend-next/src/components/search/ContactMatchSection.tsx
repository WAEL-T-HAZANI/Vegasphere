"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Phone, UserRound } from "lucide-react";
import { api } from "@/lib/api";
import { formatApiError } from "@/lib/apiError";
import { phoneHashFromInput } from "@/lib/phoneHash";
import { displayUserPrimaryLabel, userInitials } from "@/lib/searchHub";
import { openOrRequestDirectChat } from "@/lib/directChat";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import type { User } from "@/types";

export default function ContactMatchSection() {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const me = useAppSelector((s) => s.auth.user);
  const [raw, setRaw] = useState("");
  const [matches, setMatches] = useState<User[]>([]);
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [err, setErr] = useState("");
  const [ran, setRan] = useState(false);

  const run = async () => {
    const lines = raw
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 50);
    if (!lines.length) return;
    setBusy(true);
    setErr("");
    setRan(true);
    try {
      const hashes = (
        await Promise.all(lines.map((line) => phoneHashFromInput(line)))
      ).filter(Boolean);
      if (!hashes.length) {
        setMatches([]);
        return;
      }
      const { data } = await api.post<User[]>("/user/contacts/match", { hashes });
      setMatches(Array.isArray(data) ? data : []);
    } catch (e) {
      setMatches([]);
      setErr(formatApiError(e, t, "errorOccurred"));
    } finally {
      setBusy(false);
    }
  };

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

  return (
    <section className="vs-settings-card flex h-full flex-col space-y-4 !p-4 sm:!p-5">
      <div className="flex items-start gap-3">
        <div className="vs-icon-tile h-9 w-9 shrink-0 rounded-xl">
          <Phone className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-ink">{t("contactMatchTitle")}</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted">{t("contactMatchHint")}</p>
        </div>
      </div>

      <textarea
        className="vs-textarea min-h-[96px] flex-1"
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        placeholder={t("contactMatchPlaceholder")}
        aria-label={t("contactMatchPlaceholder")}
      />

      <button
        type="button"
        disabled={busy || !raw.trim()}
        onClick={run}
        className="vs-btn-primary-sm min-h-10 w-full sm:w-auto"
      >
        {busy ? t("globalSearchLoading") : t("contactMatchAction")}
      </button>

      {err ? <p className="text-sm text-red-600 dark:text-red-300">{err}</p> : null}

      {ran && !busy && !err ? (
        <p className="text-xs font-semibold text-muted">
          {matches.length
            ? t("contactMatchCount", { count: matches.length })
            : t("contactMatchNoMatches")}
        </p>
      ) : null}

      {matches.length > 0 ? (
        <ul className="space-y-2">
          {matches.map((u) => {
            const userId = String(u._id);
            const label = displayUserPrimaryLabel(u);
            const avatarUrl = String(u.profilePic || "").trim();
            return (
              <li
                key={userId}
                className="flex flex-col gap-2 rounded-2xl vs-brand-inset px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarUrl}
                      alt=""
                      className="h-9 w-9 rounded-xl object-cover ring-1 ring-brand-200/60 dark:ring-brand-800/50"
                    />
                  ) : (
                    <div className="vs-icon-tile h-9 w-9 rounded-xl text-xs font-bold">
                      {userInitials(label)}
                    </div>
                  )}
                  <span className="truncate text-sm font-medium text-ink">{label}</span>
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
                    className="inline-flex min-h-10 flex-1 items-center justify-center gap-1 rounded-full border border-brand-200/60 px-4 py-2 text-xs font-semibold text-brand-700 hover:bg-brand-50 dark:border-brand-800/40 dark:text-brand-200 dark:hover:bg-brand-900/20 sm:flex-none"
                  >
                    <UserRound className="h-3.5 w-3.5" aria-hidden />
                    {t("viewProfile")}
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
