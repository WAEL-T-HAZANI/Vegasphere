"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useAppSelector } from "@/store/hooks";
import type { Conversation } from "@/types/api";
import {
  History,
  Link2,
  PhoneCall,
  PhoneMissed,
  PhoneOutgoing,
  Video,
} from "lucide-react";
import { authClient, callsClient, conversationClient } from "@/lib/clients";
import { showAppErrorToast } from "@/lib/appToast";
import { getSocket } from "@/lib/socket";
import DashboardPageLayout from "@/components/layout/DashboardPageLayout";
import ProtectedPageGate from "@/components/layout/ProtectedPageGate";
import ShellSegmentTabs from "@/components/layout/ShellSegmentTabs";
import CallHistoryRow from "@/components/calls/CallHistoryRow";
import CallsHelpSection from "@/components/calls/CallsHelpSection";
import CallsLinksPanel, { type CallInviteItem } from "@/components/calls/CallsLinksPanel";
import CallsStartPanel from "@/components/calls/CallsStartPanel";
import { clearChatBackFrom } from "@/lib/callContext";
import { isCallableConversation } from "@/lib/callLaunch";

type CallHistoryItem = {
  sessionId: string;
  status?: string;
  mode?: string;
  durationSec?: number;
  endedAt?: string;
  createdAt?: string;
  groupCall?: boolean;
  conversationId?: { _id?: string; name?: string };
  peers?: Array<{ name?: string }>;
};

type CallsSection = "start" | "history" | "links";

type IceMeta = {
  count?: number;
  hasStun?: boolean;
  hasTurn?: boolean;
  hasSecureTurn?: boolean;
  hasTurnCredentials?: boolean;
  liveReady?: boolean;
};

export default function CallsPage() {
  const { t, i18n } = useTranslation();
  const searchParams = useSearchParams();
  const authUser = useAppSelector((s) => s.auth.user);
  const authStatus = useAppSelector((s) => s.auth.status);
  const storeConversations = useAppSelector((s) => s.chat.conversations);
  const [items, setItems] = useState<CallHistoryItem[]>([]);
  const [invites, setInvites] = useState<CallInviteItem[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [me, setMe] = useState(authUser);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState<CallsSection>("start");
  const [selectedConversationId, setSelectedConversationId] = useState("");
  const [loadError, setLoadError] = useState("");
  const [iceMeta, setIceMeta] = useState<IceMeta | null>(null);

  const meId = String(me?._id || authUser?._id || "");

  useEffect(() => {
    clearChatBackFrom();
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError("");
      if (authUser?._id) setMe(authUser);

      const requests: Promise<{ data: unknown }>[] = [
        callsClient.getCallHistory(),
        callsClient.getCallInvites(),
        conversationClient.listConversations(),
        callsClient.getIceServers(),
      ];
      if (!authUser?._id) requests.push(authClient.getMe());

      const results = await Promise.all(requests);
      const history = results[0].data;
      const inviteData = results[1].data;
      const convData = results[2].data;
      const iceData = results[3].data as { meta?: IceMeta };
      const meData = authUser?._id
        ? authUser
        : (results[4]?.data as typeof authUser);

      setItems(Array.isArray(history) ? history : []);
      setInvites(Array.isArray(inviteData) ? inviteData : []);
      setMe(meData || null);
      setConversations(Array.isArray(convData) ? convData : []);
      setIceMeta(iceData?.meta || null);
    } catch {
      setItems([]);
      setInvites([]);
      setConversations(Array.isArray(storeConversations) ? storeConversations : []);
      setIceMeta(null);
      const message = t("callsLoadFailed");
      setLoadError(message);
      showAppErrorToast(message, "calls-load-failed");
    } finally {
      setLoading(false);
    }
  }, [authUser?._id, storeConversations, t]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!storeConversations?.length) return;
    setConversations((current) => {
      if (storeConversations.length > current.length) return storeConversations;
      return current;
    });
  }, [storeConversations]);

  useEffect(() => {
    const preselected = String(searchParams.get("conversationId") || "").trim();
    if (!preselected) return;
    const exists = (conversations || []).some(
      (conv) => String(conv._id) === preselected && isCallableConversation(conv),
    );
    if (exists) setSelectedConversationId(preselected);
  }, [conversations, searchParams]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !meId) return undefined;
    const onCallsUpdated = () => {
      void loadData();
    };
    socket.on("calls-updated", onCallsUpdated);
    return () => {
      socket.off("calls-updated", onCallsUpdated);
    };
  }, [loadData, meId]);

  const stats = useMemo(() => {
    const completed = items.filter((item) => item.status === "completed").length;
    const missed = items.filter((item) => item.status === "missed").length;
    const video = items.filter((item) => item.mode === "video").length;
    return { completed, missed, video };
  }, [items]);

  const sectionTabs = [
    { id: "start", label: t("callsTabStart"), icon: PhoneOutgoing },
    { id: "history", label: t("callsTabHistory"), icon: History },
    { id: "links", label: t("callsTabLinks"), icon: Link2 },
  ];

  return (
    <ProtectedPageGate titleKey="navCalls" status={authStatus} user={authUser}>
      <div className="vs-calls-page">
        <DashboardPageLayout
          variant="simple"
          title={t("navCalls")}
          description={t("callsPageSubtitle")}
          maxWidth="6xl"
          headerExtra={
            <div className="space-y-3">
              <ShellSegmentTabs
                tabs={sectionTabs}
                active={section}
                onChange={(value) => setSection(value as CallsSection)}
              />
              {loadError ? <div className="vs-alert-error text-sm">{loadError}</div> : null}
            </div>
          }
        >
          <div className="mb-6 grid gap-3 sm:grid-cols-3">
            <div className="vs-stat-tile flex items-center gap-3 p-4">
              <div className="vs-icon-tile h-10 w-10 !rounded-xl">
                <PhoneCall className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted">
                  {t("callsHistoryCompleted")}
                </div>
                <div className="mt-1 text-2xl font-semibold text-ink">{stats.completed}</div>
              </div>
            </div>
            <div className="vs-stat-tile flex items-center gap-3 p-4">
              <div className="vs-icon-tile h-10 w-10 !rounded-xl">
                <PhoneMissed className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted">
                  {t("callsHistoryMissedLabel")}
                </div>
                <div className="mt-1 text-2xl font-semibold text-ink">{stats.missed}</div>
              </div>
            </div>
            <div className="vs-stat-tile flex items-center gap-3 p-4">
              <div className="vs-icon-tile h-10 w-10 !rounded-xl">
                <Video className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted">
                  {t("callsHistoryVideo")}
                </div>
                <div className="mt-1 text-2xl font-semibold text-ink">{stats.video}</div>
              </div>
            </div>
          </div>

          <div className="mb-6 rounded-3xl border border-brand-200/60 bg-white/85 p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
            <div>
              <div className="text-sm font-semibold text-ink">
                {iceMeta?.liveReady ? t("callsTurnReadyTitle") : t("callsTurnWarningTitle")}
              </div>
              <p className="mt-1 text-sm text-muted">
                {iceMeta?.liveReady
                  ? t("callsTurnReadyBody")
                  : t("callsTurnWarningBody")}
              </p>
            </div>
          </div>

          <section className="mx-auto w-full max-w-4xl space-y-4">
            {section === "start" ? (
              <CallsStartPanel
                conversations={conversations}
                myId={meId}
                selectedConversationId={selectedConversationId}
                onSelectConversation={setSelectedConversationId}
              />
            ) : null}

            {section === "history" ? (
              <div className="vs-settings-card p-4 md:p-5">
                <div className="mb-4 flex items-start gap-3">
                  <div className="vs-icon-tile h-10 w-10 rounded-2xl">
                    <History className="h-5 w-5" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold text-ink">{t("callsHistoryTitle")}</h2>
                    <p className="mt-1 text-sm text-muted">{t("callsHistoryHint")}</p>
                  </div>
                </div>

                {loading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, idx) => (
                      <div
                        key={idx}
                        className="h-20 animate-pulse rounded-2xl bg-subtle"
                      />
                    ))}
                  </div>
                ) : items.length ? (
                  <div className="space-y-3">
                    {items.map((item) => (
                      <CallHistoryRow
                        key={item.sessionId}
                        item={item}
                        meId={meId}
                        locale={i18n.language}
                        t={t}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="vs-brand-dashed-empty px-5 py-10 text-center">
                    <div className="vs-icon-tile mx-auto h-14 w-14 rounded-2xl">
                      <PhoneCall className="h-6 w-6" aria-hidden />
                    </div>
                    <div className="mt-4 text-base font-semibold text-ink">
                      {t("callsHistoryEmptyTitle")}
                    </div>
                    <p className="mt-2 text-sm text-muted">{t("callsHistoryEmptyHint")}</p>
                  </div>
                )}
              </div>
            ) : null}

            {section === "links" ? (
              <CallsLinksPanel
                conversations={conversations}
                invites={invites}
                myId={meId}
                locale={i18n.language}
                busy={loading}
                onRefresh={loadData}
              />
            ) : null}

            <CallsHelpSection />
          </section>
        </DashboardPageLayout>
      </div>
    </ProtectedPageGate>
  );
}
