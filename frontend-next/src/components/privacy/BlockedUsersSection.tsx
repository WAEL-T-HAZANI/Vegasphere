"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import { formatApiError } from "@/lib/apiError";
import { showAuthErrorToast, showAuthSuccessToast } from "@/lib/authToast";
import { cn } from "@/lib/classNames";

export default function BlockedUsersSection({ embedded = false }) {
  const { t } = useTranslation();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [busyUnblockAll, setBusyUnblockAll] = useState(false);

  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const { data } = await api.get("/user/blocked");
      setList(Array.isArray(data) ? data : []);
    } catch (e) {
      setList([]);
      setErr(formatApiError(e, t, "errorOccurred"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const unblock = async (id) => {
    try {
      setBusyId(String(id));
      await api.post(`/user/unblock/${id}`);
      setList((prev) => prev.filter((u) => String(u._id) !== String(id)));
      showAuthSuccessToast(t("privacyUnblocked"), "auth-success");
    } catch (e) {
      showAuthErrorToast(formatApiError(e, t, "errorOccurred"), "auth-error");
    } finally {
      setBusyId("");
    }
  };

  const unblockAll = async () => {
    if (busyUnblockAll || !list.length) return;
    setBusyUnblockAll(true);
    try {
      await Promise.allSettled(list.map((u) => api.post(`/user/unblock/${u._id}`)));
      setList([]);
      showAuthSuccessToast(t("privacyUnblockedAll"), "auth-success");
    } catch (e) {
      showAuthErrorToast(formatApiError(e, t, "errorOccurred"), "auth-error");
    } finally {
      setBusyUnblockAll(false);
    }
  };

  const content = loading ? (
    <div className="space-y-2">
      <div className="h-14 animate-pulse rounded-2xl bg-brand-50/50 dark:bg-brand-900/20" />
      <div className="h-14 animate-pulse rounded-2xl bg-brand-50/50 dark:bg-brand-900/20" />
    </div>
  ) : list.length === 0 ? (
    <p className="vs-empty-state px-4 py-6 text-sm">
      {t("noBlockedUsers")}
    </p>
  ) : (
    <div className="space-y-2">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={unblockAll}
          disabled={busyUnblockAll}
          className="vs-btn-outline-sm shrink-0 px-4 py-2 text-muted disabled:opacity-50"
        >
          {busyUnblockAll ? "…" : t("unblockAll")}
        </button>
      </div>
      <ul className="space-y-2">
        {list.map((u) => (
          <li
            key={u._id}
            className="vs-stat-tile flex flex-wrap items-center justify-between gap-3 p-3"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-red-50 text-sm font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-300">
                {(u?.name || "?").slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-ink">{u.name}</div>
                <div className="truncate text-xs text-muted">
                  {u.username ? `@${u.username}` : u.email}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => unblock(u._id)}
              disabled={busyId === String(u._id)}
              className="vs-btn-outline-sm px-3 py-2 disabled:opacity-50"
            >
              {busyId === String(u._id) ? "…" : t("unblockUser")}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    embedded ? (
      <div>
        {content}
        {err ? (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">{err}</p>
        ) : null}
      </div>
    ) : (
      <section className={cn("vs-settings-card", "!p-4 md:!p-5")}>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-ink">{t("navBlocked")}</h2>
          <p className="mt-0.5 text-sm text-muted">{t("blockedPageHint")}</p>
        </div>
        {content}
        {err ? (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">{err}</p>
        ) : null}
      </section>
    )
  );
}
