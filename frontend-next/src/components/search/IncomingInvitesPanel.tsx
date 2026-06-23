"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Mail } from "lucide-react";
import { api } from "@/lib/api";
import { formatApiError } from "@/lib/apiError";
import { showAppToast } from "@/lib/appToast";
import { displayUserPrimaryLabel } from "@/lib/searchHub";
import { syncConversations } from "@/lib/syncConversations";
import { useAppDispatch } from "@/store/hooks";
import type { User } from "@/types";

type InviteRow = Pick<User, "_id" | "name" | "email" | "username">;
type InviteConversation = { _id?: string };

export default function IncomingInvitesPanel() {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [rows, setRows] = useState<InviteRow[]>([]);
  const [busyId, setBusyId] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<InviteRow[]>("/user/invites/incoming");
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const accept = async (fromUserId: string) => {
    setBusyId(fromUserId);
    try {
      const { data } = await api.post<InviteConversation>(`/user/invites/${fromUserId}/accept`);
      await syncConversations(dispatch);
      await load();
      showAppToast({ id: "invite-ok", body: t("incomingInvitesAccept") });
      if (data?._id) {
        router.push(`/chats/${data._id}`);
      }
    } catch (e) {
      showAppToast({
        id: "invite-err",
        body: formatApiError(e, t, "errorOccurred"),
      });
    } finally {
      setBusyId("");
    }
  };

  const decline = async (fromUserId: string) => {
    setBusyId(fromUserId);
    try {
      await api.post(`/user/invites/${fromUserId}/decline`);
      await load();
    } catch (e) {
      showAppToast({
        id: "invite-err",
        body: formatApiError(e, t, "errorOccurred"),
      });
    } finally {
      setBusyId("");
    }
  };

  if (loading) {
    return (
      <div className="h-20 animate-pulse rounded-2xl border border-brand-200/35 bg-subtle/80 dark:border-brand-800/30 dark:bg-brand-900/20" />
    );
  }

  return (
    <section className="vs-settings-card space-y-4 !p-4 sm:!p-5">
      <div className="flex items-center gap-2">
        <div className="vs-icon-tile h-9 w-9 rounded-xl">
          <Mail className="h-4 w-4" aria-hidden />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-ink">{t("incomingInvitesTitle")}</h2>
          <p className="text-xs text-muted">
            {rows.length
              ? t("incomingInvitesCount", { count: rows.length })
              : t("incomingInvitesEmpty")}
          </p>
        </div>
      </div>

      {!rows.length ? null : (
        <ul className="space-y-2">
          {rows.map((row) => {
            const fromId = String(row._id || "");
            const label = displayUserPrimaryLabel(row);
            return (
              <li
                key={fromId}
                className="flex flex-col gap-3 rounded-2xl vs-brand-inset px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-ink">{label}</div>
                  {fromId ? (
                    <Link href={`/user/${fromId}`} className="vs-brand-text-link text-xs">
                      {t("viewProfile")}
                    </Link>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busyId === fromId}
                    onClick={() => accept(fromId)}
                    className="vs-btn-primary-sm min-h-10 flex-1 sm:flex-none"
                  >
                    {t("incomingInvitesAccept")}
                  </button>
                  <button
                    type="button"
                    disabled={busyId === fromId}
                    onClick={() => decline(fromId)}
                    className="min-h-10 flex-1 rounded-full border border-brand-200/60 px-4 py-2 text-xs font-semibold text-muted hover:bg-brand-50 dark:border-brand-800/40 dark:hover:bg-brand-900/20 sm:flex-none"
                  >
                    {t("incomingInvitesDecline")}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
