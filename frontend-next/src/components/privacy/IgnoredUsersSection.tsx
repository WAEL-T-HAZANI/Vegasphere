"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import { formatApiError } from "@/lib/apiError";
import { showAuthErrorToast, showAuthSuccessToast } from "@/lib/authToast";

type IgnoredUsersSectionProps = {
  onBlockFromIgnored?: (id: string) => Promise<void>;
  refreshKey?: number;
};

export default function IgnoredUsersSection({
  onBlockFromIgnored,
  refreshKey = 0,
}: IgnoredUsersSectionProps) {
  const { t } = useTranslation();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyIgnore, setBusyIgnore] = useState("");
  const [busyBlock, setBusyBlock] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/user/ignored");
      setList(Array.isArray(data) ? data : []);
    } catch (e) {
      setList([]);
      showAuthErrorToast(formatApiError(e, t, "errorOccurred"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const unignore = async (id: string) => {
    setBusyIgnore(String(id));
    try {
      await api.post(`/user/unignore/${id}`);
      setList((prev) => prev.filter((u) => String(u._id) !== String(id)));
      showAuthSuccessToast(t("privacyUnignored"), "auth-success");
    } catch (e) {
      showAuthErrorToast(formatApiError(e, t, "errorOccurred"), "auth-error");
    } finally {
      setBusyIgnore("");
    }
  };

  const block = async (id: string) => {
    setBusyBlock(String(id));
    try {
      if (onBlockFromIgnored) {
        await onBlockFromIgnored(id);
      } else {
        await api.post(`/user/block/${id}`);
      }
      setList((prev) => prev.filter((u) => String(u._id) !== String(id)));
      showAuthSuccessToast(t("privacyBlockedFromIgnored"), "auth-success");
    } catch (e) {
      showAuthErrorToast(formatApiError(e, t), "auth-error");
    } finally {
      setBusyBlock("");
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="h-14 animate-pulse rounded-2xl bg-brand-50/50 dark:bg-brand-900/20" />
        <div className="h-14 animate-pulse rounded-2xl bg-brand-50/50 dark:bg-brand-900/20" />
      </div>
    );
  }

  if (list.length === 0) {
    return (
      <p className="vs-empty-state px-3 py-5 text-xs">
        {t("privacyIgnoredEmpty")}
      </p>
    );
  }

  return (
    <ul className="max-h-72 space-y-2 overflow-y-auto pr-0.5">
      {list.map((u) => (
        <li
          key={u._id}
          className="vs-stat-tile flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-xs font-semibold text-brand-800 dark:bg-brand-900/40 dark:text-[rgb(var(--vega-ink))]">
              {(u?.name || "?").slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{u.name}</p>
              <p className="truncate text-[11px] text-muted">
                {u.username ? `@${u.username}` : u.email}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 gap-1.5">
            <button
              type="button"
              className="vs-btn-outline-sm px-2.5 py-1.5 text-[11px]"
              disabled={busyIgnore === String(u._id)}
              onClick={() => unignore(u._id)}
            >
              {busyIgnore === String(u._id) ? "…" : t("privacyUnignore")}
            </button>
            <button
              type="button"
              className="rounded-xl border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] font-semibold text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300"
              disabled={busyBlock === String(u._id)}
              onClick={() => block(u._id)}
            >
              {busyBlock === String(u._id) ? "…" : t("privacyBlock")}
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
