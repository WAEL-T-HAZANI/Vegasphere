// @ts-nocheck
import { readChatBackFrom } from "@/lib/callContext";
import { isConversationAdmin } from "@/lib/groupsHub";

export function dmPeerUserId(conv, myId) {
  if (!myId || conv.isGroup || conv.isChannel || conv.isSelfChat) return null;
  const other = conv.members?.find((m) => String(m._id || m) !== String(myId));
  const id = other?._id || other;
  return id ? String(id) : null;
}

export function dmPeerMember(conv, myId) {
  if (!conv?.members?.length || !myId) return null;
  if (conv.isGroup || conv.isChannel) return null;
  if (conv.isSelfChat) return null;
  return (
    conv.members.find((m) => String(m._id || m) !== String(myId)) ||
    conv.members[0]
  );
}

export function avatarProfileHref(conv, me) {
  if (!conv?._id) return null;
  if (conv.isSelfChat) return "/profile";
  if (conv.isGroup || conv.isChannel) {
    if (!isConversationAdmin(conv, me?._id)) return null;
    return `/chat/${conv._id}/info`;
  }
  const pid = dmPeerUserId(conv, me?._id);
  return pid ? `/user/${pid}` : null;
}

export function unreadTotal(conv, userId, localDelta) {
  if (!userId) return 0;
  const uid = String(userId);
  const row = conv.unreadCounts?.find(
    (u) => String(u.userId?._id || u.userId) === uid
  );
  const base = row?.count ?? 0;
  const extra = localDelta[String(conv._id)] || 0;
  return base + extra;
}

const PREVIEW_TOKEN_KEYS = {
  __image__: "chatPreviewImage",
  __video__: "chatPreviewVideo",
  __file__: "chatPreviewFile",
  __location__: "chatPreviewLocation",
  __audio__: "chatPreviewAudio",
  Poll: "chatPreviewPoll",
};

export function conversationLatestPreview(conv) {
  return String(conv?.latestmessage || conv?.latestMessage || "").trim();
}

export function formatConversationPreview(raw, t) {
  const s = String(raw || "").trim();
  if (!s) return t?.("chatPreviewEmpty") || "—";
  const tokenKey = PREVIEW_TOKEN_KEYS[s];
  if (tokenKey) return t?.(tokenKey) || s;
  if (s.includes("Encrypted message") || s.startsWith("🔒")) {
    return t?.("chatPreviewEncrypted") || s;
  }
  return s;
}

export function formatChatListStamp(date, t) {
  if (!date || Number.isNaN(date.getTime?.())) return "";
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (sameDay) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate();
  if (isYesterday) return t?.("yesterday") || "Yesterday";
  return date.toLocaleDateString([], { month: "short", day: "2-digit" });
}

export function formatLastSeenLine({ online, lastSeen, t, language }) {
  const caption = formatPresenceCaption({ online, lastSeen, t, language });
  return caption?.label || "";
}

/** Compact presence line for chat list rows (online pill or last-seen caption). */
export function formatPresenceCaption({ online, lastSeen, t, language }) {
  const isOnline =
    online === true || online === 1 || online === "1" || online === "true";
  if (isOnline) {
    return { kind: "online", label: t?.("presenceOnline") || "Online" };
  }
  if (!lastSeen) return null;
  const d = new Date(lastSeen);
  if (Number.isNaN(d.getTime())) return null;
  const shortStamp = formatChatListStamp(d, t);
  const fallback = d.toLocaleString(language || undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return {
    kind: "lastSeen",
    label: `${t?.("lastSeen") || "Last seen"} · ${shortStamp || fallback}`,
  };
}

export function displayUserPrimaryLabel(u) {
  const candidates = [u?.name, u?.username, u?.email]
    .map((x) => (x == null ? "" : String(x).trim()))
    .filter(Boolean);
  const best = candidates.find((s) => !/^\d+$/.test(s)) || candidates[0] || "";
  return best || String(u?._id || "").trim();
}

export function matchesChatFilter(conv, filter) {
  if (filter === "all") return true;
  if (filter === "dm") return (!conv.isGroup && !conv.isChannel) || Boolean(conv.isSelfChat);
  if (filter === "group") return Boolean(conv.isGroup) && !conv.isChannel;
  if (filter === "channel") return Boolean(conv.isChannel);
  return true;
}

export function passesInboxListFilters({
  conv,
  filter,
  userId,
  localDelta,
  draftsByConversation,
  presenceById,
  query = "",
}) {
  if (!matchesChatFilter(conv, filter)) return false;
  if (filter === "unread") return unreadTotal(conv, userId, localDelta) > 0;
  if (filter === "drafts") return Boolean(draftsByConversation[String(conv._id)]);
  if (filter === "muted") return Boolean(conv.isMutedForMe);
  if (filter === "online") {
    const pid = dmPeerUserId(conv, userId);
    if (!pid) return false;
    return Boolean(presenceById?.[String(pid)]?.online);
  }
  const q = String(query || "").trim().toLowerCase();
  if (!q) return true;
  const title = conversationTitle(conv);
  const preview = conversationLatestPreview(conv);
  return (
    String(title).toLowerCase().includes(q) ||
    String(preview).toLowerCase().includes(q)
  );
}

export function conversationTitle(conv) {
  return conv?.name || conv?.members?.[0]?.name || conv?.members?.[0]?.email || "Chat";
}

export function resolvePersonSearchHref(person, conversations, myUserId) {
  const personId = String(person?._id || "");
  if (!personId) return "/search";
  const existingDm = (conversations || []).find((conv) => {
    if (!conv || conv.isGroup || conv.isChannel) return false;
    return dmPeerUserId(conv, myUserId) === personId;
  });
  if (existingDm?._id) {
    return `/chats/${existingDm._id}`;
  }
  const querySeed =
    String(person?.username || "").trim() ||
    String(person?.name || "").trim() ||
    String(person?.email || "").trim();
  const params = new URLSearchParams();
  if (querySeed) params.set("q", querySeed);
  params.set("focusUserId", personId);
  return `/search?${params.toString()}`;
}

export function buildMessageResultHref(msg) {
  const params = new URLSearchParams();
  params.set("messageId", String(msg?._id || ""));
  const topicId = String(msg?.topicId || "").trim();
  if (topicId && topicId !== "general") params.set("topicId", topicId);
  return `/chats/${msg?.conversationId}?${params.toString()}`;
}

export function isChannelConversation(conv) {
  return Boolean(conv?.isChannel);
}

export function isGroupOnlyConversation(conv) {
  return Boolean(conv?.isGroup) && !conv?.isChannel;
}

export function buildChatHref(conversationId, conv, options = {}) {
  const id = String(conversationId || "").trim();
  if (!id) return "/chats";
  const from = String(options.from || "").trim();
  const filter = String(options.filter || "").trim();
  const params = new URLSearchParams();
  if (from) params.set("from", from);

  if (from === "chats" && filter && filter !== "all") {
    params.set("filter", filter);
  }

  const qs = params.toString();
  return `/chats/${id}${qs ? `?${qs}` : ""}`;
}

export function resolveChatBackTarget(conv, query = {}) {
  const from = String(query.from || readChatBackFrom() || "").trim();
  const filter = String(query.filter || "").trim();

  if (from === "groups") return { href: "/groups", labelKey: "navGroups" };
  if (from === "channels") return { href: "/channels", labelKey: "navChannels" };
  if (from === "calls") return { href: "/calls", labelKey: "navCalls" };

  if (from === "chats" && (filter === "channel" || filter === "group")) {
    return {
      href: `/chats?filter=${filter}`,
      labelKey: filter === "channel" ? "navChannels" : "navGroups",
    };
  }

  return { href: "/chats", labelKey: "navChats" };
}

export function groupChannelDisplayName(conv) {
  if (!conv) return "";
  return String(conv.chatName || conv.name || "").trim();
}

export function groupChannelInfoTitleKey(conv) {
  if (isChannelConversation(conv)) return "chatChannelInfo";
  if (isGroupOnlyConversation(conv)) return "chatGroupInfo";
  return "chatGroupInfo";
}

export const CHAT_KIND_BADGE = {
  channel:
    "bg-brand-100 text-brand-800 dark:bg-brand-900/50 dark:text-[rgb(var(--vega-ink))]",
  group:
    "bg-brand-50 text-brand-800 dark:bg-brand-900/40 dark:text-[rgb(var(--vega-ink))]",
};

export function conversationKindMeta(conv, t) {
  if (!conv) return { label: "", tone: "" };
  if (conv.isChannel) {
    return {
      label: t("channelBadge"),
      tone: CHAT_KIND_BADGE.channel,
    };
  }
  if (conv.isGroup) {
    return {
      label: t("groupBadge"),
      tone: CHAT_KIND_BADGE.group,
    };
  }
  return { label: "", tone: "" };
}

export function senderLabelForResult(msg, t) {
  const sender = msg?.senderId;
  if (!sender) return "";
  if (typeof sender === "object") {
    return String(sender.name || sender.username || sender.email || "").trim();
  }
  return String(sender || "").trim() || t("savedSelfBadge");
}
