"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useAppSelector, useAppDispatch } from "@/store/hooks";

import { api } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { decryptMessageUtf8 } from "@/lib/e2eClient";
import {
  extractMediaItemsFromMessages,
  findMediaGalleryIndex,
} from "@/lib/chatMedia";
import { buildChatThreadRows } from "@/lib/chatThread";
import { firstHttpUrl, getMentionDraft, applyMentionSuggestion } from "@/lib/chatCompose";
import { resolveAssetUrl } from "@/lib/messageFormat";
import { buildSmartReplyContext } from "@/lib/smartReplyContext";
import { getEffectiveMemberRightsForPeer } from "@/lib/conversationMemberRights";
import { openMediaViewer } from "@/store/slices/uiSlice";
import ChatAssetsPanel from "@/components/chat/conversation/ChatAssetsPanel";
import ConversationHeader from "@/components/chat/conversation/ConversationHeader";
import ConversationMessageList from "@/components/chat/conversation/ConversationMessageList";
const MessageList = ConversationMessageList as any;
import ConversationComposer from "@/components/chat/conversation/ConversationComposer";
import ReplyToBanner from "@/components/chat/conversation/ReplyToBanner";
import LinkPreviewStrip from "@/components/chat/conversation/LinkPreviewStrip";
import PinnedMessagesBar from "@/components/chat/conversation/PinnedMessagesBar";
import LiveLocationBar from "@/components/chat/conversation/LiveLocationBar";
import ThreadPanel from "@/components/chat/conversation/ThreadPanel";
import { usePresenceBatch } from "@/hooks/usePresenceBatch";
import { useChatTyping } from "@/components/chat/conversation/hooks/useChatTyping";
import { useChatReceipts } from "@/components/chat/conversation/hooks/useChatReceipts";
import { useChatDraftAndPreview } from "@/components/chat/conversation/hooks/useChatDraftAndPreview";
import { useChatOutgoing } from "@/components/chat/conversation/hooks/useChatOutgoing";
import { useChatAttachments } from "@/components/chat/conversation/hooks/useChatAttachments";
import { useChatE2e } from "@/components/chat/conversation/hooks/useChatE2e";
import { useConversationMessages } from "@/components/chat/conversation/hooks/useConversationMessages";
import ChatInChatSearchBar from "@/components/chat/conversation/ChatInChatSearchBar";
import { useChatSearch } from "@/components/chat/conversation/hooks/useChatSearch";
import { useScheduledMessages } from "@/components/chat/conversation/hooks/useScheduledMessages";
import { useMessageComposer } from "@/components/chat/conversation/hooks/useMessageComposer";
import { useChatConversationMessageActions } from "@/components/chat/conversation/hooks/useChatConversationMessageActions";
import { formatPresenceTimestamp } from "@/lib/chatConversation";
import { pullMessageSync } from "@/lib/messageSync";
import ChatConversationDialogs from "@/components/chat/conversation/ChatConversationDialogs";
import MessageSelectionBar from "@/components/chat/conversation/MessageSelectionBar";
import { showAppToast } from "@/lib/appToast";

const EMPTY_ARRAY = [];
const EMPTY_OBJECT = {};

export default function ChatConversationScreen() {
  const params = useParams();
  const conversationId = String(params?.conversationId ?? "");
  const searchParams = useSearchParams();
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const conversations = useAppSelector((s) => s.chat.conversations);
  const cid = String(conversationId);
  const rtl = i18n.dir?.() === "rtl";
  const routeMessageId = String(searchParams.get("messageId") || "").trim();
  const routeTopicId = String(searchParams.get("topicId") || "").trim();
  const messages = useAppSelector(
    (s) => s.chat.messagesByConversation[cid] || EMPTY_ARRAY,
  );
  const searchResults = useAppSelector((s) => s.chat.searchResults || EMPTY_ARRAY);
  const globalSearchQuery = useAppSelector((s) => s.chat.searchQuery || "");
  const typingMap = useAppSelector(
    (s) => s.chat.typingByConversationId[cid] || EMPTY_OBJECT,
  );
  const typingNames = useAppSelector(
    (s) => s.chat.typingDisplayNames[cid] || EMPTY_OBJECT,
  );

  const {
    text,
    setText,
    pollOpen,
    setPollOpen,
    pollQuestion,
    setPollQuestion,
    pollOptions,
    setPollOptions,
    pollAllowsMultiple,
    setPollAllowsMultiple,
    pollClosesAt,
    setPollClosesAt,
    disappearAfterSec,
    setDisappearAfterSec,
    viewOnceNext,
    setViewOnceNext,
    emojiComposerOpen,
    setEmojiComposerOpen,
    voiceDraft,
    setVoiceDraft,
    voiceOpen,
    setVoiceOpen,
    voiceMsg,
    setVoiceMsg,
    shareContactOpen,
    setShareContactOpen,
    shareContactQuery,
    setShareContactQuery,
    shareContactBusy,
    setShareContactBusy,
    shareLocationOpen,
    setShareLocationOpen,
    mentionsOnly,
    setMentionsOnly,
    mentionIndex,
    setMentionIndex,
    uploading,
    setUploading,
    failedUpload,
    setFailedUpload,
  } = useMessageComposer();
  const [assetsOpen, setAssetsOpen] = useState(false);
  const [assetsTab, setAssetsTab] = useState("media");
  const [focusedMessageId, setFocusedMessageId] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [forwardOpen, setForwardOpen] = useState(false);
  const [forwardIds, setForwardIds] = useState([]);
  const [forwardStatus, setForwardStatus] = useState("");
  const [selectionMode, setSelectionMode] = useState(false);
  const [threadRootId, setThreadRootId] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [bulkDeleteIds, setBulkDeleteIds] = useState([]);
  const [deleteForEveryone, setDeleteForEveryone] = useState(false);
  const [liveLocationActive, setLiveLocationActive] = useState(false);
  const [liveLocationBusy, setLiveLocationBusy] = useState(false);
  const liveWatchIdRef = useRef<number | null>(null);
  const {
    scheduleOpen,
    setScheduleOpen,
    scheduledFor,
    setScheduledFor,
  } = useScheduledMessages();
  const [activeTopicId, setActiveTopicId] = useState("general");
  const targetPagingRef = useRef(false);
  const fileRef = useRef(null);
  const textInputRef = useRef(null);
  const searchInputRef = useRef(null);
  const messageRefs = useRef({});
  const messageListRef = useRef(null);
  const [visibleMessageIds, setVisibleMessageIds] = useState([]);

  useChatReceipts({
    messages,
    conversationId,
    userId: user?._id,
    messageRefs,
    visibleMessageIds,
  });

  const { linkPreview } = useChatDraftAndPreview({ cid, text, setText });
  const forwardStatusTimerRef = useRef(null);

  const activeConv = useMemo(
    () => conversations.find((c) => String(c._id) === cid),
    [conversations, cid],
  );

  const canPostInConv = useMemo(() => {
    if (!activeConv?.isGroup && !activeConv?.isChannel) return true;
    if (!user?._id) return false;
    if (activeConv?.effectiveMemberRights) {
      return activeConv.effectiveMemberRights.canPostMessages !== false;
    }
    const rights = getEffectiveMemberRightsForPeer(activeConv, user._id);
    return rights.canPostMessages !== false;
  }, [activeConv, user?._id]);

  const cannotPostHint = useMemo(() => {
    if (activeConv?.isChannel && !canPostInConv) return t("channelCannotPostHint");
    return t("chatCannotPostHint");
  }, [activeConv?.isChannel, canPostInConv, t]);

  const peerUserId = useMemo(() => {
    const conv = activeConv;
    if (
      !conv?.members?.length ||
      conv.isGroup ||
      conv.isChannel ||
      conv.isSelfChat
    ) {
      return null;
    }
    const other = conv.members.find(
      (m) => String(m._id || m) !== String(user?._id),
    );
    return other?._id || other || null;
  }, [activeConv, user?._id]);

  const peerDisplayName = useMemo(() => {
    const conv = activeConv;
    if (conv?.isSelfChat) return t("navSaved");
    if (!conv?.members?.length || !peerUserId) return "";
    const other = conv.members.find(
      (m) => String(m._id || m) === String(peerUserId),
    );
    return other?.name || other?.email || "";
  }, [activeConv, peerUserId, t]);

  const peerMember = useMemo(() => {
    if (!activeConv?.members?.length || !peerUserId) return null;
    return activeConv.members.find(
      (m) => String(m._id || m) === String(peerUserId),
    );
  }, [activeConv, peerUserId]);

  const canEnableE2e = Boolean(
    peerUserId &&
    activeConv &&
    !activeConv.isGroup &&
    !activeConv.isChannel &&
    !activeConv.e2eEnabled &&
    peerMember?.e2ePublicKey,
  );

  const dmE2eActive = Boolean(
    activeConv &&
    !activeConv.isGroup &&
    !activeConv.isChannel &&
    activeConv.e2eEnabled,
  );

  const { e2eConvKey, e2eKeyResolved, enableE2e, disableE2e } = useChatE2e({
    dmE2eActive,
    userId: user?._id,
    cid,
    activeConv,
    peerUserId,
    peerMember,
    canEnableE2e,
    dispatch,
  });

  const groupRecipientCount = useMemo(() => {
    if (!activeConv?.isGroup && !activeConv?.isChannel) return 0;
    const n = activeConv.members?.length || 0;
    return Math.max(0, n);
  }, [activeConv]);

  const groupPeerIds = useMemo(() => {
    const conv = activeConv;
    if (!conv || (!conv.isGroup && !conv.isChannel)) return [];
    return (conv.members || [])
      .map((m) => m._id || m)
      .filter((id) => String(id) !== String(user?._id))
      .map(String)
      .slice(0, 8);
  }, [activeConv, user?._id]);

  const groupParticipantLabels = useMemo(() => {
    const map = {};
    (activeConv?.members || []).forEach((m) => {
      const id = String(m._id || m);
      if (id !== String(user?._id)) {
        map[id] = m.name || m.email || id;
      }
    });
    return map;
  }, [activeConv, user?._id]);

  const { presenceById } = usePresenceBatch(
    peerUserId ? [String(peerUserId)] : [],
    { enabled: Boolean(user?._id && peerUserId) },
  );
  const peerPresence = peerUserId ? presenceById[String(peerUserId)] : null;

  const typingEnabled = user?.typingIndicatorsEnabled !== false;
  const { bumpTyping } = useChatTyping({
    conversationId,
    userId: user?._id,
    userName: user?.name,
    enabled: typingEnabled,
  });

  const pinnedMessages = useMemo(
    () => messages.filter((m) => m.isPinned),
    [messages],
  );

  const othersTyping = useMemo(() => {
    const uid = String(user?._id || "");
    return Object.keys(typingMap).filter((id) => id !== uid && typingMap[id]);
  }, [typingMap, user?._id]);

  const typingLine = useMemo(() => {
    if (user?.typingIndicatorsEnabled === false) return "";
    if (!othersTyping.length) return "";
    const parts = othersTyping.map(
      (id) => typingNames[id] || t("someoneTypingAnonymous"),
    );
    return `${parts.join(", ")} ${t("typingListSuffix")}`;
  }, [othersTyping, typingNames, t, user?.typingIndicatorsEnabled]);
  const peerPresenceLine = useMemo(() => {
    if (
      typingLine ||
      !peerUserId ||
      activeConv?.isGroup ||
      activeConv?.isChannel
    ) {
      return "";
    }
    if (peerPresence?.online) return t("presenceOnline");
    const stamp = formatPresenceTimestamp(
      peerPresence?.lastSeen,
      i18n.language,
    );
    if (stamp) return t("presenceLastSeenAt", { date: stamp });
    return t("presenceOffline");
  }, [
    typingLine,
    peerUserId,
    activeConv?.isGroup,
    activeConv?.isChannel,
    peerPresence?.online,
    peerPresence?.lastSeen,
    i18n.language,
    t,
  ]);

  const messagesById = useMemo(() => {
    const map = {};
    messages.forEach((m) => {
      if (m._id) map[String(m._id)] = m;
    });
    return map;
  }, [messages]);

  const mediaItems = useMemo(
    () => extractMediaItemsFromMessages(messages),
    [messages],
  );
  const assetMediaItems = useMemo(
    () =>
      mediaItems.map((item) => ({
        ...item,
        message: messagesById[String(item.messageId)] || null,
      })),
    [mediaItems, messagesById],
  );
  const assetFileItems = useMemo(
    () =>
      messages
        .filter(
          (m) =>
            m.messageType === "file" && (m.fileData || m.fileName || m.text),
        )
        .map((m) => ({
          messageId: String(m._id),
          fileName: m.fileName || m.text || t("fileAttachment"),
          url: resolveAssetUrl(m.fileData || ""),
          fileType: m.fileType || "",
          fileSize: m.fileSize || 0,
          createdAt: m.createdAt || "",
        })),
    [messages, t],
  );

  const { hasMoreOlder, loadOlder, reloadThread, loadingOlderRef, threadLoading } =
    useConversationMessages({
      cid,
      conversationId,
      userId: user?._id,
      activeConv,
      conversations,
    });



  useEffect(() => {
    const socket = getSocket();
    if (!socket || !user?._id || !conversationId) return;
    socket.emit("join-chat", { roomId: conversationId });
    return () => {
      socket.emit("leave-chat", conversationId);
    };
  }, [conversationId, user?._id]);

  const stopLiveLocation = useCallback(() => {
    if (typeof window !== "undefined" && liveWatchIdRef.current !== null) {
      window.navigator.geolocation.clearWatch(liveWatchIdRef.current);
      liveWatchIdRef.current = null;
    }
    setLiveLocationBusy(false);
    setLiveLocationActive(false);
    const socket = getSocket();
    socket?.emit("live-location:stop", { conversationId });
  }, [conversationId]);

  const startLiveLocation = useCallback(() => {
    if (!conversationId || !user?._id || liveLocationBusy) return;
    if (typeof window === "undefined" || !window.navigator.geolocation) {
      showAppToast({
        id: `live-location-unsupported-${Date.now()}`,
        conversationId,
        body: t("liveLocationUnsupported"),
      });
      return;
    }

    const socket = getSocket();
    if (!socket) {
      showAppToast({
        id: `live-location-socket-${Date.now()}`,
        conversationId,
        body: t("apiNetworkUnreachable"),
      });
      return;
    }

    setLiveLocationBusy(true);
    let started = false;
    const durationSec = 60 * 30;
    liveWatchIdRef.current = window.navigator.geolocation.watchPosition(
      (position) => {
        const payload = {
          conversationId,
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          label: user?.name || user?.email || t("liveLocationMe"),
          durationSec,
        };
        socket.emit(started ? "live-location:update" : "live-location:start", payload);
        started = true;
        setLiveLocationBusy(false);
        setLiveLocationActive(true);
      },
      () => {
        setLiveLocationBusy(false);
        setLiveLocationActive(false);
        showAppToast({
          id: `live-location-error-${Date.now()}`,
          conversationId,
          body: t("liveLocationPermissionError"),
        });
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10_000,
        timeout: 15_000,
      },
    );
  }, [conversationId, liveLocationBusy, t, user?._id, user?.email, user?.name]);

  useEffect(() => {
    return () => {
      if (liveWatchIdRef.current !== null && typeof window !== "undefined") {
        window.navigator.geolocation.clearWatch(liveWatchIdRef.current);
        liveWatchIdRef.current = null;
      }
      getSocket()?.emit("live-location:stop", { conversationId });
    };
  }, [conversationId]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !user?._id || !conversationId) return;
    const onConnect = () => {
      void pullMessageSync(dispatch);
    };
    socket.on("connect", onConnect);
    return () => {
      socket.off("connect", onConnect);
    };
  }, [conversationId, user?._id, dispatch]);



  const decryptedById = useMemo(() => {
    const map = {};
    if (!e2eConvKey) return map;
    for (const m of messages) {
      if (Number(m.e2eVersion) > 0 && m.e2eBox && m.e2eNonce && m._id) {
        try {
          map[String(m._id)] = decryptMessageUtf8(
            m.e2eBox,
            m.e2eNonce,
            e2eConvKey,
          );
        } catch {
          map[String(m._id)] = t("e2eDecryptFailed");
        }
      }
    }
    return map;
  }, [messages, e2eConvKey, t]);

  const assetLinkItems = useMemo(
    () =>
      messages
        .map((m) => {
          const raw =
            Number(m.e2eVersion) > 0
              ? decryptedById[String(m._id)] || ""
              : m.text || "";
          const url = firstHttpUrl(raw);
          if (!url) return null;
          return {
            messageId: String(m._id),
            url,
            preview: raw,
            createdAt: m.createdAt || "",
          };
        })
        .filter(Boolean),
    [messages, decryptedById],
  );

  const visibleMessages = useMemo(() => {
    let base = messages;
    if (activeConv?.isGroup || activeConv?.isChannel) {
      base = base.filter(
        (m) =>
          String(m.topicId || "general") === String(activeTopicId || "general"),
      );
    }
    if (!mentionsOnly || !user?._id) return base;
    return base.filter(
      (m) =>
        Array.isArray(m.mentionedUserIds) &&
        m.mentionedUserIds.some((id) => String(id) === String(user._id)),
    );
  }, [
    messages,
    mentionsOnly,
    user?._id,
    activeConv?.isGroup,
    activeConv?.isChannel,
    activeTopicId,
  ]);

  const smartReplyContext = useMemo(
    () =>
      buildSmartReplyContext({
        messages: visibleMessages,
        meId: String(user?._id || ""),
        decryptedById,
        t,
        activeConv,
        peerDisplayName,
        memberLabels: groupParticipantLabels,
      }),
    [
      visibleMessages,
      decryptedById,
      user?._id,
      peerDisplayName,
      activeConv,
      groupParticipantLabels,
      t,
    ],
  );

  const availableTopics = useMemo(() => {
    if (!activeConv?.isGroup && !activeConv?.isChannel) return [];
    const topics =
      Array.isArray(activeConv?.topics) && activeConv.topics.length
        ? activeConv.topics
        : [{ id: "general", name: t("topicGeneral"), archived: false }];
    return topics.filter((topic) => !topic.archived);
  }, [activeConv, t]);
  useEffect(() => {
    if (!availableTopics.length) return;
    if (
      !availableTopics.some(
        (topic) => String(topic.id) === String(activeTopicId),
      )
    ) {
      setActiveTopicId(String(availableTopics[0].id));
    }
  }, [availableTopics, activeTopicId]);
  useEffect(() => {
    if (!routeTopicId) return;
    if (!availableTopics.some((topic) => String(topic.id) === routeTopicId))
      return;
    if (String(activeTopicId) === routeTopicId) return;
    setActiveTopicId(routeTopicId);
  }, [availableTopics, activeTopicId, routeTopicId]);
  const visibleThreadRows = useMemo(
    () => buildChatThreadRows(visibleMessages),
    [visibleMessages],
  );
  const mentionDraft = useMemo(() => {
    const input = textInputRef.current;
    const caret = input?.selectionStart;
    return getMentionDraft(text, Number.isFinite(caret) ? caret : text.length);
  }, [text]);
  const mentionSuggestions = useMemo(() => {
    const draft = mentionDraft;
    if (!draft || (!activeConv?.isGroup && !activeConv?.isChannel)) return [];
    const q = draft.query.trim().toLowerCase();
    return (activeConv?.members || [])
      .filter((m) => String(m._id || m) !== String(user?._id))
      .map((m) => ({
        _id: String(m._id || m),
        label: (m.name || m.email || "").trim(),
        subtitle: m.email || "",
      }))
      .filter((m) => m.label)
      .filter((m) => {
        if (!q) return true;
        const lower = m.label.toLowerCase();
        const compact = lower.replace(/\s+/g, "");
        return (
          lower.includes(q) ||
          compact.includes(q) ||
          String(m.subtitle || "")
            .toLowerCase()
            .includes(q)
        );
      })
      .slice(0, 6);
  }, [mentionDraft, activeConv, user?._id]);

  const openGalleryForMessage = useCallback(
    (m) => {
      if (!mediaItems.length) return;
      const idx = findMediaGalleryIndex(mediaItems, m._id);
      dispatch(openMediaViewer({ items: mediaItems, index: idx }));
    },
    [mediaItems, dispatch],
  );

  const toggleSelect = useCallback((m) => {
    const id = String(m._id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const exitSelection = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  const openForwardSingle = useCallback((msg) => {
    setBulkDeleteIds([]);
    setForwardIds(msg?._id ? [String(msg._id)] : []);
    setForwardOpen(true);
  }, []);

  const selectedMessages = useMemo(() => {
    return [...selectedIds]
      .map((id) => messagesById[id])
      .filter(Boolean)
      .sort((a, b) => {
        const sa = Number(a.seq) || 0;
        const sb = Number(b.seq) || 0;
        if (sa && sb && sa !== sb) return sa - sb;
        return (
          new Date(a.createdAt || 0).getTime() -
          new Date(b.createdAt || 0).getTime()
        );
      });
  }, [selectedIds, messagesById]);

  const canCopySelected = useMemo(
    () =>
      selectedMessages.some((m) => {
        const text =
          Number(m.e2eVersion) > 0
            ? decryptedById[String(m._id)] || ""
            : m.text || "";
        return String(text).trim().length > 0;
      }),
    [selectedMessages, decryptedById],
  );

  const openForwardSelected = useCallback(() => {
    const ids = [...selectedIds];
    if (!ids.length) return;
    setBulkDeleteIds([]);
    setForwardIds(ids);
    setForwardOpen(true);
  }, [selectedIds]);

  const openDeleteSelected = useCallback(() => {
    const ids = [...selectedIds];
    if (!ids.length) return;
    setBulkDeleteIds(ids);
    setDeleteTarget(messagesById[ids[0]] || null);
    setDeleteForEveryone(false);
    setDeleteOpen(true);
  }, [selectedIds, messagesById]);

  const copySelectedMessages = useCallback(async () => {
    const chunks = selectedMessages
      .map((m) => {
        const text =
          Number(m.e2eVersion) > 0
            ? decryptedById[String(m._id)] || ""
            : m.text || "";
        return String(text).trim();
      })
      .filter(Boolean);
    if (!chunks.length) return;
    try {
      await navigator.clipboard.writeText(chunks.join("\n\n"));
      showAppToast({
        id: `copy-selected-${Date.now()}`,
        conversationId: cid,
        body: t("copyText"),
      });
    } catch {
      showAppToast({
        id: `copy-selected-fail-${Date.now()}`,
        conversationId: cid,
        body: t("copyFailed"),
      });
    }
  }, [selectedMessages, decryptedById, cid, t]);

  const sendBlocked =
    (dmE2eActive && e2eKeyResolved && !e2eConvKey) || !canPostInConv;

  const {
    deliverOutgoing,
    retryMessage,
    send,
    sendPoll,
    resetPollComposer,
  } = useChatOutgoing({
    conversationId,
    cid,
    user,
    t,
    activeConv,
    canPostInConv,
    dmE2eActive,
    e2eConvKey,
    text,
    setText,
    setEmojiComposerOpen,
    setReplyTo,
    replyTo,
    scheduledFor,
    setScheduledFor,
    setScheduleOpen,
    disappearAfterSec,
    viewOnceNext,
    setViewOnceNext,
    activeTopicId,
    pollQuestion,
    pollOptions,
    pollAllowsMultiple,
    pollClosesAt,
    setPollOpen,
    setPollQuestion,
    setPollOptions,
    setPollAllowsMultiple,
    setPollClosesAt,
    setForwardStatus,
    sendBlocked,
    onAfterSend: () => {
      requestAnimationFrame(() => {
        messageListRef.current?.scrollToBottom?.("auto");
      });
    },
  });

  const {
    uploadAttachmentDraft,
    onFileChange,
    attachAccept,
    shareMyLocation,
    sharePersonAsContact,
    clearFailedUpload,
  } = useChatAttachments({
    conversationId,
    cid,
    user,
    t,
    activeConv,
    activeTopicId,
    disappearAfterSec,
    viewOnceNext,
    setViewOnceNext,
    deliverOutgoing,
    setUploading,
    setFailedUpload,
    setVoiceMsg,
    failedUpload,
    setShareContactOpen,
    setShareContactQuery,
    setShareContactBusy,
  });

  const jumpToSearchResult = useCallback((result) => {
    const id = String(result?._id || "");
    if (!id) return;
    setFocusedMessageId(id);
    if (!messageListRef.current?.scrollToMessageId?.(id)) {
      const node = messageRefs.current[id];
      node?.scrollIntoView?.({ behavior: "smooth", block: "center" });
    }
  }, []);

  const {
    search,
    setSearch,
    searchBusy,
    activeSearchIndex,
    setActiveSearchIndex,
    runSearch,
    resetSearch,
    stepSearchResult,
  } = useChatSearch({
    conversationId,
    onResultSelect: jumpToSearchResult,
  });
  const activeSearchResult = searchResults[activeSearchIndex] || null;

  const jumpToMessage = useCallback((messageId) => {
    const id = String(messageId || "");
    if (!id) return;
    setFocusedMessageId(id);
    if (!messageListRef.current?.scrollToMessageId?.(id)) {
      const node = messageRefs.current[id];
      node?.scrollIntoView?.({ behavior: "smooth", block: "center" });
    }
  }, []);

  const handleReplyToMessage = useCallback(
    (msg) => {
      setReplyTo(msg);
      exitSelection();
    },
    [exitSelection],
  );
  const handleForwardMessage = useCallback(
    (msg) => {
      openForwardSingle(msg);
      exitSelection();
    },
    [openForwardSingle, exitSelection],
  );
  const handleEditMessage = useCallback((msg) => {
    setEditTarget(msg);
    setEditOpen(true);
  }, []);
  const handleDeleteMessage = useCallback((msg) => {
    setBulkDeleteIds([]);
    setDeleteTarget(msg);
    setDeleteOpen(true);
  }, []);
  const handleJumpToReply = useCallback(
    (msg) => jumpToMessage(msg?._id),
    [jumpToMessage],
  );

  useEffect(() => {
    if (!routeMessageId) return;
    const target = messagesById[routeMessageId];
    if (
      target &&
      (activeConv?.isGroup || activeConv?.isChannel) &&
      String(target.topicId || "general") !== String(activeTopicId || "general")
    ) {
      setActiveTopicId(String(target.topicId || "general"));
      return;
    }
    const node = messageRefs.current[routeMessageId];
    if (
      messageListRef.current?.scrollToMessageId?.(routeMessageId) ||
      node?.scrollIntoView
    ) {
      targetPagingRef.current = false;
      setFocusedMessageId(routeMessageId);
      if (!messageListRef.current?.scrollToMessageId?.(routeMessageId)) {
        node.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }
    if (!hasMoreOlder || loadingOlderRef.current || targetPagingRef.current)
      return;
    targetPagingRef.current = true;
    loadOlder()
      .catch(() => {})
      .finally(() => {
        targetPagingRef.current = false;
      });
  }, [
    messages,
    messagesById,
    routeMessageId,
    hasMoreOlder,
    loadOlder,
    loadingOlderRef,
    activeConv?.isGroup,
    activeConv?.isChannel,
    activeTopicId,
  ]);

  const replyPreview = useCallback(
    (msg) => {
      if (!msg) return "";
      const textValue =
        Number(msg.e2eVersion) > 0
          ? decryptedById[String(msg._id)] || ""
          : msg.text || "";
      if (String(textValue).trim()) {
        const s = String(textValue).trim();
        return s.length > 90 ? `${s.slice(0, 90)}…` : s;
      }
      if (msg.messageType === "audio" || msg.audioData)
        return t("voiceMessage");
      if (msg.messageType === "file")
        return msg.fileName || t("fileAttachment");
      if (msg.imageUrl) return t("replyBannerMedia");
      return "";
    },
    [decryptedById, t],
  );

  const {
    onReact,
    onPin,
    onStar,
    onVotePoll,
    onCancelSchedule,
    saveEdit: saveEditMessage,
    confirmDelete: confirmDeleteMessage,
    doForward: doForwardMessages,
  } = useChatConversationMessageActions({
    cid,
    conversationId,
    user,
    conversations,
    dispatch,
    t,
    reloadThread,
    setEditTarget,
    setDeleteTarget,
    setDeleteForEveryone,
    messagesById,
    decryptedById,
  });

  const saveEdit = (newText) => saveEditMessage(newText, editTarget);
  const confirmDelete = async (opts) => {
    if (bulkDeleteIds.length) {
      for (const id of bulkDeleteIds) {
        const msg = messagesById[id];
        if (msg) await confirmDeleteMessage(msg, opts);
      }
      setBulkDeleteIds([]);
      exitSelection();
      return;
    }
    await confirmDeleteMessage(deleteTarget, opts);
  };
  const doForward = (toConversationId) =>
    doForwardMessages(
      toConversationId,
      forwardIds,
      setForwardStatus,
      () => {
        setForwardIds([]);
        setBulkDeleteIds([]);
        exitSelection();
      },
      forwardStatusTimerRef,
    );

  const openMaybeViewOnceMedia = useCallback(
    async (msgOrMedia) => {
      if (msgOrMedia?._id) {
        openGalleryForMessage(msgOrMedia);
      } else {
        dispatch(openMediaViewer(msgOrMedia));
      }
    },
    [dispatch, openGalleryForMessage],
  );

  useEffect(() => {
    setMentionIndex(0);
  }, [mentionSuggestions.length, mentionDraft?.query, setMentionIndex]);

  const insertMention = useCallback(
    (member) => {
      if (!member?.label) return;
      const input = textInputRef.current;
      const caret = input?.selectionStart;
      const next = applyMentionSuggestion(
        text,
        Number.isFinite(caret) ? caret : text.length,
        member.label,
      );
      setText(next.text);
      requestAnimationFrame(() => {
        textInputRef.current?.focus();
        if (typeof next.caret === "number") {
          textInputRef.current?.setSelectionRange(next.caret, next.caret);
        }
      });
    },
    [text, setText],
  );

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      <ConversationHeader
        rtl={rtl}
        t={t}
        cid={cid}
        peerUserId={peerUserId}
        peerMember={peerMember}
        peerDisplayName={peerDisplayName}
        activeConv={activeConv}
        typingLine={typingLine}
        peerPresenceLine={peerPresenceLine}
        presenceById={presenceById}
        availableTopics={availableTopics}
        activeTopicId={activeTopicId}
        onTopicChange={setActiveTopicId}
        onOpenAssets={() => setAssetsOpen(true)}
        selectionMode={selectionMode}
        onEnterSelection={() => setSelectionMode(true)}
        onExitSelection={exitSelection}
        disappearAfterSec={disappearAfterSec}
        setDisappearAfterSec={setDisappearAfterSec}
        viewOnceNext={viewOnceNext}
        setViewOnceNext={setViewOnceNext}
      />

      <ChatInChatSearchBar
        rtl={rtl}
        t={t}
        search={search}
        onSearchChange={(e) => setSearch(e.target.value)}
        onSearchKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            void runSearch();
          }
          if (e.key === "Escape") {
            resetSearch();
          }
        }}
        searchInputRef={searchInputRef}
        searchBusy={searchBusy}
        globalSearchQuery={globalSearchQuery}
        searchResults={searchResults}
        activeSearchIndex={activeSearchIndex}
        stepSearchResult={stepSearchResult}
        resetSearch={resetSearch}
      />

      {assetsOpen ? (
        <ChatAssetsPanel
          assetsTab={assetsTab}
          onChangeTab={setAssetsTab}
          onClose={() => setAssetsOpen(false)}
          mediaTiles={assetMediaItems}
          fileItems={assetFileItems}
          linkItems={assetLinkItems}
          onOpenMedia={(messageId) =>
            dispatch(
              openMediaViewer({
                items: mediaItems,
                index: findMediaGalleryIndex(mediaItems, messageId),
              }),
            )
          }
          onJump={(messageId) => {
            jumpToMessage(messageId);
            setAssetsOpen(false);
          }}
          t={t}
        />
      ) : null}

      <LiveLocationBar conversationId={cid} />

      <PinnedMessagesBar
        pinnedMessages={pinnedMessages}
        decryptedById={decryptedById}
        t={t}
        rtl={rtl}
        onJump={jumpToMessage}
      />

      <MessageList
        ref={messageListRef}
        visibleThreadRows={visibleThreadRows}
        isEmpty={visibleMessages.length === 0}
        threadLoading={threadLoading}
        i18nLanguage={i18n.language}
        t={t}
        pinnedMessages={pinnedMessages}
        hasMoreOlder={hasMoreOlder}
        onLoadOlder={loadOlder}
        messageRefs={messageRefs}
        messagesById={messagesById}
        decryptedById={decryptedById}
        user={user}
        peerUserId={peerUserId}
        activeConv={activeConv}
        groupRecipientCount={groupRecipientCount}
        selectionMode={selectionMode}
        selectedIds={selectedIds}
        toggleSelect={toggleSelect}
        handleReplyToMessage={handleReplyToMessage}
        handleForwardMessage={handleForwardMessage}
        openMaybeViewOnceMedia={openMaybeViewOnceMedia}
        handleEditMessage={handleEditMessage}
        handleDeleteMessage={handleDeleteMessage}
        handleCancelSchedule={onCancelSchedule}
        onReact={onReact}
        onPin={onPin}
        onStar={onStar}
        retryMessage={retryMessage}
        globalSearchQuery={globalSearchQuery}
        focusedMessageId={focusedMessageId}
        activeSearchResult={activeSearchResult}
        handleJumpToReply={handleJumpToReply}
        onVotePoll={onVotePoll}
        onViewThread={(m) =>
          setThreadRootId(String(m.threadRootId || m._id || ""))
        }
        onVisibleMessageIds={setVisibleMessageIds}
      />

      {threadRootId ? (
        <ThreadPanel
          rootId={threadRootId}
          conversationId={conversationId}
          cid={cid}
          onClose={() => setThreadRootId("")}
          onSent={reloadThread}
        />
      ) : null}

      <ReplyToBanner
        replyTo={replyTo}
        replyPreview={replyPreview}
        t={t}
        rtl={rtl}
        currentUserId={user?._id}
        onJump={jumpToMessage}
        onClear={() => setReplyTo(null)}
      />

      <LinkPreviewStrip linkPreview={linkPreview} />

      {selectionMode ? (
        <MessageSelectionBar
          t={t}
          rtl={rtl}
          selectedCount={selectedIds.size}
          canCopy={canCopySelected}
          onForward={openForwardSelected}
          onDelete={openDeleteSelected}
          onCopy={() => {
            void copySelectedMessages();
          }}
          onCancel={exitSelection}
        />
      ) : (
        <ConversationComposer
        t={t}
        rtl={rtl}
        sendBlocked={sendBlocked}
        cannotPostHint={cannotPostHint}
        dmE2eActive={dmE2eActive}
        e2eConvKey={e2eConvKey}
        canEnableE2e={canEnableE2e}
        onEnableE2e={enableE2e}
        onDisableE2e={disableE2e}
        voiceMsg={voiceMsg}
        forwardStatus={forwardStatus}
        user={user}
        cid={cid}
        conversationId={conversationId}
        peerUserId={peerUserId}
        peerDisplayName={peerDisplayName}
        groupPeerIds={groupPeerIds}
        groupParticipantLabels={groupParticipantLabels}
        mentionsOnly={mentionsOnly}
        setMentionsOnly={setMentionsOnly}
        pollOpen={pollOpen}
        pollQuestion={pollQuestion}
        setPollQuestion={setPollQuestion}
        pollOptions={pollOptions}
        setPollOptions={setPollOptions}
        pollAllowsMultiple={pollAllowsMultiple}
        setPollAllowsMultiple={setPollAllowsMultiple}
        pollClosesAt={pollClosesAt}
        setPollClosesAt={setPollClosesAt}
        resetPollComposer={resetPollComposer}
        sendPoll={sendPoll}
        uploading={uploading}
        failedUpload={failedUpload}
        uploadAttachmentDraft={uploadAttachmentDraft}
        clearFailedUpload={clearFailedUpload}
        fileRef={fileRef}
        onFileChange={onFileChange}
        attachAccept={attachAccept}
        emojiComposerOpen={emojiComposerOpen}
        setEmojiComposerOpen={setEmojiComposerOpen}
        text={text}
        setText={setText}
        textInputRef={textInputRef}
        bumpTyping={bumpTyping}
        shareLocationOpen={shareLocationOpen}
        setShareLocationOpen={setShareLocationOpen}
        shareMyLocation={shareMyLocation}
        liveLocationActive={liveLocationActive}
        liveLocationBusy={liveLocationBusy}
        startLiveLocation={startLiveLocation}
        stopLiveLocation={stopLiveLocation}
        shareContactOpen={shareContactOpen}
        setShareContactOpen={setShareContactOpen}
        shareContactQuery={shareContactQuery}
        setShareContactQuery={setShareContactQuery}
        shareContactBusy={shareContactBusy}
        conversations={conversations}
        sharePersonAsContact={sharePersonAsContact}
        voiceDraft={voiceDraft}
        setVoiceDraft={setVoiceDraft}
        voiceOpen={voiceOpen}
        setVoiceOpen={setVoiceOpen}
        setVoiceMsg={setVoiceMsg}
        activeConv={activeConv}
        setPollOpen={setPollOpen}
        scheduleOpen={scheduleOpen}
        setScheduleOpen={setScheduleOpen}
        scheduledFor={scheduledFor}
        setScheduledFor={setScheduledFor}
        mentionSuggestions={mentionSuggestions}
        mentionIndex={mentionIndex}
        setMentionIndex={setMentionIndex}
        insertMention={insertMention}
        send={send}
        activeTopicId={activeTopicId}
        smartReplyMessages={smartReplyContext.recentMessages}
        smartReplyTriggerKey={smartReplyContext.triggerKey}
        smartReplySubject={smartReplyContext.subject}
        smartReplyConversationKind={smartReplyContext.conversationKind}
      />
      )}

      <ChatConversationDialogs
        cid={cid}
        user={user}
        forwardOpen={forwardOpen}
        setForwardOpen={setForwardOpen}
        forwardIds={forwardIds}
        doForward={doForward}
        editOpen={editOpen}
        setEditOpen={setEditOpen}
        editTarget={editTarget}
        setEditTarget={setEditTarget}
        saveEdit={saveEdit}
        deleteOpen={deleteOpen}
        setDeleteOpen={setDeleteOpen}
        deleteTarget={deleteTarget}
        setDeleteTarget={setDeleteTarget}
        bulkDeleteCount={bulkDeleteIds.length}
        onDeleteDialogClose={() => setBulkDeleteIds([])}
        deleteForEveryone={deleteForEveryone}
        setDeleteForEveryone={setDeleteForEveryone}
        confirmDelete={confirmDelete}
      />
    </div>
  );
}
