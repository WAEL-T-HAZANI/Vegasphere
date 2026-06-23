"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { messageClient } from "@/lib/clients";
import { formatApiError } from "@/lib/apiError";
import { showAppErrorToast } from "@/lib/appToast";
import ProtectedPageGate from "@/components/layout/ProtectedPageGate";
import DashboardPageLayout from "@/components/layout/DashboardPageLayout";
import { useAppSelector } from "@/store/hooks";
import type { Message } from "@/types";

export default function SavedMessagesPage() {
  const { t } = useTranslation();
  const status = useAppSelector((s) => s.auth.status);
  const user = useAppSelector((s) => s.auth.user);
  const [items, setItems] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const { data } = await messageClient.listSavedMessages();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setItems([]);
      const message = formatApiError(e, t, "errorOccurred");
      setErr(message);
      showAppErrorToast(message, "saved-load-failed");
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (user?._id) load();
  }, [user?._id, load]);

  return (
    <ProtectedPageGate titleKey="navSaved" status={status} user={user}>
      <DashboardPageLayout title={t("navSaved")} description={t("savedPageHint")} maxWidth="3xl">
        {err ? (
          <p className="mb-4 text-sm text-red-600 dark:text-red-400" role="alert">
            {err}
          </p>
        ) : null}
        {loading ? (
          <div className="h-24 animate-pulse rounded-2xl bg-subtle/80" />
        ) : items.length === 0 ? (
          <p className="text-sm text-muted">{t("savedMessagesEmpty")}</p>
        ) : (
          <ul className="space-y-3">
            {items.map((m) => {
              const cid = String(
                (m.conversationId as { _id?: string })?._id || m.conversationId || "",
              );
              return (
                <li
                  key={String(m._id)}
                  className="vs-settings-card p-4"
                >
                  <div className="text-xs font-semibold text-muted">
                    {(m.conversationId as { name?: string })?.name || cid}
                  </div>
                  <p className="mt-2 line-clamp-3 text-sm text-ink">
                    {m.text || m.messageType || "—"}
                  </p>
                  {cid ? (
                    <Link
                      href={`/chats/${cid}`}
                      className="mt-3 inline-block text-xs font-semibold text-brand-600 hover:underline"
                    >
                      {t("openChat")}
                    </Link>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </DashboardPageLayout>
    </ProtectedPageGate>
  );
}
