"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import { formatApiError } from "@/lib/apiError";
import { showAuthErrorToast, showAuthSuccessToast } from "@/lib/authToast";

export default function ReportUserSection() {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [target, setTarget] = useState(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2 || target) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get(`/user/search?q=${encodeURIComponent(q)}`);
        setResults(Array.isArray(data) ? data : []);
      } catch {
        setResults([]);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query, target]);

  const submit = async (e) => {
    e.preventDefault();
    const id = String(target?._id || "");
    const text = reason.trim();
    if (!id) {
      showAuthErrorToast(t("privacyReportPickUser"), "auth-error");
      return;
    }
    if (text.length < 4) {
      showAuthErrorToast(t("privacyReportReasonShort"), "auth-error");
      return;
    }
    setBusy(true);
    try {
      await api.post(`/user/report/${id}`, { reason: text });
      setTarget(null);
      setQuery("");
      setReason("");
      setResults([]);
      showAuthSuccessToast(t("privacyReportSent"), "auth-success");
    } catch (err) {
      showAuthErrorToast(formatApiError(err, t), "auth-error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="text-xs leading-relaxed text-muted">{t("privacyReportHint")}</p>
      {target ? (
        <div className="flex items-center justify-between gap-2 rounded-2xl border border-brand-200/45 bg-brand-50/60 px-3 py-2 dark:border-brand-800/35 dark:bg-brand-900/15">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{target.name}</p>
            <p className="truncate text-xs text-muted">
              {target.username ? `@${target.username}` : target.email}
            </p>
          </div>
          <button
            type="button"
            className="vs-btn-outline-sm px-2 py-1 text-xs"
            onClick={() => setTarget(null)}
          >
            {t("privacyReportChangeUser")}
          </button>
        </div>
      ) : (
        <>
          <label className="grid gap-1.5 text-xs font-semibold text-muted">
            {t("privacyReportUserLabel")}
            <input
              className="vs-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("privacyReportSearchPlaceholder")}
            />
          </label>
          {results.length ? (
            <ul className="max-h-36 space-y-1 overflow-y-auto rounded-2xl border border-brand-200/40 p-2">
              {results.map((u) => (
                <li key={u._id}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-start text-sm hover:bg-brand-50 dark:hover:bg-brand-900/20"
                    onClick={() => {
                      setTarget(u);
                      setQuery("");
                      setResults([]);
                    }}
                  >
                    <span className="font-semibold text-ink">{u.name}</span>
                    <span className="text-xs text-muted">
                      {u.username ? `@${u.username}` : u.email}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      )}
      <label className="grid gap-1.5 text-xs font-semibold text-muted">
        {t("privacyReportReasonLabel")}
        <textarea
          className="vs-textarea min-h-[5rem]"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={500}
          placeholder={t("privacyReportReasonPlaceholder")}
        />
      </label>
      <button type="submit" disabled={busy} className="vs-btn-primary-sm px-5 py-2.5">
        {busy ? "…" : t("privacyReportSubmit")}
      </button>
    </form>
  );
}
