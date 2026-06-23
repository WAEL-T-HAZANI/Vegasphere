"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { statusClient } from "@/lib/clients";
import { formatApiError } from "@/lib/apiError";
import { groupStatusByOwner } from "@/lib/statusGroups";
import { getSocket } from "@/lib/socket";
import { useAppSelector } from "@/store/hooks";
import DashboardPageLayout from "@/components/layout/DashboardPageLayout";
import ProtectedPageGate from "@/components/layout/ProtectedPageGate";
import ShellSegmentTabs from "@/components/layout/ShellSegmentTabs";
import StatusComposer from "@/components/status/StatusComposer";
import StatusDeleteDialog from "@/components/status/StatusDeleteDialog";
import StatusFeedCard from "@/components/status/StatusFeedCard";
import StatusVisibilityBanner from "@/components/status/StatusVisibilityBanner";
import type { StatusAudience, StatusItem } from "@/types/status";
import { notifyShellStatusViewed } from "@/hooks/useShellNavBadges";

type TabId = "feed" | "mine";

export default function StatusPage() {
  const { t, i18n } = useTranslation();
  const status = useAppSelector((s) => s.auth.status);
  const user = useAppSelector((s) => s.auth.user);

  const [feed, setFeed] = useState<StatusItem[]>([]);
  const [mine, setMine] = useState<StatusItem[]>([]);
  const [audience, setAudience] = useState<StatusAudience>({ peerCount: 0 });
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [view, setView] = useState<TabId>("feed");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const formatRelative = useCallback(
    (dateValue: string) => {
      if (!dateValue) return "";
      const date = new Date(dateValue);
      if (Number.isNaN(date.getTime())) return "";
      const diffMs = date.getTime() - Date.now();
      const formatter = new Intl.RelativeTimeFormat(
        String(i18n.language || "en").startsWith("ar") ? "ar" : "en",
        { numeric: "auto" },
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
    [i18n.language],
  );

  const refresh = useCallback(async () => {
    try {
      const [feedRes, mineRes, audienceRes] = await Promise.all([
        statusClient.getStatusFeed(),
        statusClient.getMyStatus(),
        statusClient.getStatusAudience(),
      ]);
      setFeed(Array.isArray(feedRes.data) ? feedRes.data : []);
      setMine(Array.isArray(mineRes.data) ? mineRes.data : []);
      setAudience(
        audienceRes.data && typeof audienceRes.data.peerCount === "number"
          ? audienceRes.data
          : { peerCount: 0 },
      );
    } catch (e) {
      setFeed([]);
      setMine([]);
      setAudience({ peerCount: 0 });
      setMsg(formatApiError(e, t, "errorOccurred"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (user?._id) refresh();
  }, [user?._id, view, refresh]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !user?._id) return undefined;
    const onStatusUpdated = () => {
      void refresh();
    };
    socket.on("status-updated", onStatusUpdated);
    return () => {
      socket.off("status-updated", onStatusUpdated);
    };
  }, [user?._id, refresh]);

  const postStatus = async ({
    text,
    imageFile,
  }: {
    text: string;
    imageFile: File | null;
  }) => {
    setBusy(true);
    setMsg("");
    try {
      const form = new FormData();
      form.append("text", text);
      if (imageFile) form.append("image", imageFile);
      await statusClient.createStatus(form);
      setMsg(t("statusPosted"));
      await refresh();
      setView("mine");
    } catch (err) {
      setMsg(formatApiError(err, t));
      throw err;
    } finally {
      setBusy(false);
    }
  };

  const recordView = useCallback(async (statusId: string) => {
    if (!statusId) return;
    try {
      await statusClient.viewStatus(statusId);
      notifyShellStatusViewed();
      await refresh();
    } catch {
      /* non-blocking */
    }
  }, [refresh]);

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await statusClient.deleteStatus(deleteId);
      await refresh();
    } catch (e) {
      setMsg(formatApiError(e, t, "errorOccurred"));
    } finally {
      setDeleteId(null);
    }
  };

  const segmentTabs = useMemo(
    () => [
      { id: "feed", label: t("statusFeedTitle") },
      { id: "mine", label: t("statusYourPost") },
    ],
    [t],
  );

  const activeList = view === "mine" ? mine : feed;
  const groupedList = useMemo(() => groupStatusByOwner(activeList), [activeList]);

  return (
    <ProtectedPageGate titleKey="navStatus" status={status} user={user}>
      <DashboardPageLayout
        title={t("navStatus")}
        description={t("statusPageHint")}
        maxWidth="3xl"
        headerExtra={
          <ShellSegmentTabs
            tabs={segmentTabs}
            active={view}
            onChange={(id) => setView(id as TabId)}
          />
        }
      >
        {msg ? (
          <div role="status" className="vs-muted-panel mb-5 text-sm leading-relaxed">
            {msg}
          </div>
        ) : null}

        <div className="space-y-5 sm:space-y-6" dir={i18n.dir()}>
          <StatusVisibilityBanner peerCount={audience.peerCount} />

          {view === "mine" ? (
            <>
              <StatusComposer busy={busy} onSubmit={postStatus} />
              {mine.length === 0 && !loading ? (
                <p className="text-center text-sm leading-relaxed text-muted">
                  {t("statusMineEmptyHint")}
                </p>
              ) : null}
            </>
          ) : null}

          {loading ? (
            <div className="space-y-4">
              {[0, 1].map((k) => (
                <div
                  key={k}
                  className="h-36 animate-pulse rounded-2xl border border-brand-200/35 bg-subtle/80 dark:border-brand-800/30 dark:bg-brand-900/20"
                />
              ))}
            </div>
          ) : activeList.length === 0 ? (
            view === "feed" ? (
              <div className="vs-settings-card p-6 text-center sm:p-8">
                <p className="text-sm font-semibold text-ink">{t("statusFeedEmpty")}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {t("statusFeedEmptyHint")}
                </p>
              </div>
            ) : null
          ) : (
            <ul className="space-y-4">
              {groupedList.map((group) => (
                <StatusFeedCard
                  key={group[0]?._id || group.map((g) => g._id).join("-")}
                  item={group[0]}
                  stackItems={group.length > 1 ? group : undefined}
                  currentUserId={user?._id}
                  isMine={view === "mine"}
                  formatRelative={formatRelative}
                  onView={recordView}
                  onDelete={view === "mine" ? (id) => setDeleteId(id) : undefined}
                  onUpdated={refresh}
                />
              ))}
            </ul>
          )}
        </div>
      </DashboardPageLayout>

      <StatusDeleteDialog
        open={Boolean(deleteId)}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
        onConfirm={() => void confirmDelete()}
      />
    </ProtectedPageGate>
  );
}
