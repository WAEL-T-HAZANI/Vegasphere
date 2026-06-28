"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import DashboardPageLayout from "@/components/layout/DashboardPageLayout";
import ProtectedPageGate from "@/components/layout/ProtectedPageGate";
import ChannelCreateForm from "@/components/channels/ChannelCreateForm";
import ChannelsDiscoverSection from "@/components/channels/ChannelsDiscoverSection";
import ChannelsListSection from "@/components/channels/ChannelsListSection";
import { conversationClient } from "@/lib/clients";
import { formatApiError } from "@/lib/apiError";
import { showAppToast } from "@/lib/appToast";
import {
  buildChannelMemberSuggestions,
  filterMyChannels,
  normalizeChannelSlugInput,
  type ChannelDirectoryEntry,
  type ChannelVisibility,
} from "@/lib/channelsHub";
import { buildChatHref } from "@/lib/chatList";
import { syncConversations } from "@/lib/syncConversations";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import type { ConversationMember } from "@/types/api";

export default function ChannelsPage() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const status = useAppSelector((s) => s.auth.status);
  const conversations = useAppSelector((s) => s.chat.conversations);

  const discoverRef = useRef<HTMLDivElement | null>(null);
  const createRef = useRef<HTMLDivElement | null>(null);

  const [directory, setDirectory] = useState<ChannelDirectoryEntry[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [joinBusyId, setJoinBusyId] = useState("");
  const [msg, setMsg] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [slug, setSlug] = useState("");
  const [visibility, setVisibility] = useState<ChannelVisibility>("public");
  const [selectedMembers, setSelectedMembers] = useState<ConversationMember[]>([]);

  const myChannels = useMemo(() => filterMyChannels(conversations), [conversations]);
  const memberSuggestions = useMemo(
    () => buildChannelMemberSuggestions(conversations, user?._id),
    [conversations, user?._id],
  );

  const refreshInbox = useCallback(async () => {
    setListLoading(true);
    setMsg("");
    try {
      await syncConversations(dispatch);
    } catch (error) {
      setMsg(formatApiError(error, t, "errorOccurred"));
    } finally {
      setListLoading(false);
    }
  }, [dispatch, t]);

  const loadDirectory = useCallback(async () => {
    setDiscoverLoading(true);
    try {
      const { data } = await conversationClient.listPublicChannels<ChannelDirectoryEntry>();
      setDirectory(Array.isArray(data) ? data : []);
    } catch (error) {
      setDirectory([]);
      setMsg(formatApiError(error, t, "errorOccurred"));
    } finally {
      setDiscoverLoading(false);
    }
  }, [t]);

  const refreshAll = useCallback(async () => {
    await Promise.all([refreshInbox(), loadDirectory()]);
  }, [loadDirectory, refreshInbox]);

  useEffect(() => {
    if (!user?._id) return;
    void refreshAll();
  }, [refreshAll, user?._id]);

  const joinChannel = async (id: string) => {
    if (!id) return;
    setJoinBusyId(id);
    setBusy(true);
    setMsg("");
    try {
      await conversationClient.joinChannel(id);
      await refreshAll();
      showAppToast({ id: "channel-joined", body: t("channelJoined") });
      router.push(buildChatHref(id, { isChannel: true }, { from: "channels" }));
    } catch (error) {
      const body = formatApiError(error, t, "errorOccurred");
      setMsg(body);
      showAppToast({ id: "channel-join-err", body });
    } finally {
      setBusy(false);
      setJoinBusyId("");
    }
  };

  const createChannel = async (event: React.FormEvent) => {
    event.preventDefault();
    setMsg("");
    setBusy(true);
    try {
      const normalizedSlug = normalizeChannelSlugInput(slug);
      const { data } = await conversationClient.createChannel({
        name: name.trim(),
        description: description.trim(),
        channelSlug: normalizedSlug || undefined,
        visibility,
        memberIds: selectedMembers.map((member) => member._id).filter(Boolean),
      });
      await refreshAll();
      setName("");
      setDescription("");
      setSlug("");
      setVisibility("public");
      setSelectedMembers([]);
      showAppToast({ id: "channel-created", body: t("channelCreated") });
      if (data?._id) {
        router.push(buildChatHref(data._id, { isChannel: true }, { from: "channels" }));
      }
    } catch (error) {
      const body = formatApiError(error, t, "errorOccurred");
      showAppToast({ id: "channel-create-err", body });
    } finally {
      setBusy(false);
    }
  };

  const scrollToDiscover = () => {
    discoverRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const scrollToCreate = () => {
    createRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <ProtectedPageGate titleKey="navChannels" status={status} user={user}>
      <DashboardPageLayout
        variant="simple"
        title={t("navChannels")}
        description={t("channelsPageSubtitle")}
        maxWidth="5xl"
      >
        {msg ? (
          <div role="status" className="vs-muted-panel mb-5 text-start text-sm leading-relaxed">
            {msg}
          </div>
        ) : null}

        <div className="space-y-6" dir={i18n.dir()}>
          <ChannelsListSection
            channels={myChannels}
            loading={listLoading}
            currentUserId={user?._id}
            onScrollToDiscover={scrollToDiscover}
            onScrollToCreate={scrollToCreate}
          />

          <div ref={discoverRef}>
            <ChannelsDiscoverSection
              channels={directory}
              loading={discoverLoading}
              busy={busy}
              joinBusyId={joinBusyId}
              onRefresh={() => void refreshAll()}
              onJoin={(id) => void joinChannel(id)}
              onScrollToCreate={scrollToCreate}
            />
          </div>

          <div ref={createRef}>
            <ChannelCreateForm
              name={name}
              description={description}
              slug={slug}
              visibility={visibility}
              selectedMembers={selectedMembers}
              memberSuggestions={memberSuggestions}
              currentUserId={user?._id}
              busy={busy}
              onNameChange={setName}
              onDescriptionChange={setDescription}
              onSlugChange={setSlug}
              onVisibilityChange={setVisibility}
              onMembersChange={setSelectedMembers}
              onSubmit={(e) => void createChannel(e)}
            />
          </div>
        </div>
      </DashboardPageLayout>
    </ProtectedPageGate>
  );
}
