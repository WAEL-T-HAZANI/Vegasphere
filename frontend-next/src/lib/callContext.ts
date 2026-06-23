// @ts-nocheck

export function chatIdFromPathname(pathname) {
  const match = String(pathname || "").match(/^\/chat\/([^/?#]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export function resolveCallTargets(conversation, myUserId) {
  if (!conversation?._id) return null;
  const myId = String(myUserId || "");

  if (conversation.isGroup || conversation.isChannel) {
    const groupPeerIds = (conversation.members || [])
      .map((member) => String(member._id || member))
      .filter((id) => id && id !== myId)
      .slice(0, 8);
    const participantLabels = {};
    (conversation.members || []).forEach((member) => {
      const id = String(member._id || member);
      if (id !== myId) {
        participantLabels[id] = member.name || member.email || id;
      }
    });
    return {
      isGroup: true,
      groupPeerIds,
      participantLabels,
      peerUserId: null,
      peerDisplayName:
        conversation.name || conversation.chatName || "",
    };
  }

  const peer = (conversation.members || []).find(
    (member) => String(member._id || member) !== myId,
  );
  const peerUserId = peer ? String(peer._id || peer) : null;
  return {
    isGroup: false,
    groupPeerIds: [],
    participantLabels: {},
    peerUserId,
    peerDisplayName:
      peer?.name || peer?.email || conversation.name || conversation.chatName || "",
  };
}

export function resolveMemberDisplayName(userId, conversations, fallback = "") {
  const id = String(userId || "");
  if (!id) return fallback;
  for (const conv of conversations || []) {
    const member = (conv.members || []).find(
      (entry) => String(entry._id || entry) === id,
    );
    if (member?.name || member?.email) {
      return member.name || member.email;
    }
  }
  return fallback;
}

export function stripCallSearchParams(searchParams, options = {}) {
  const { stripFrom = false } = options;
  const params = new URLSearchParams(searchParams.toString());
  params.delete("autocall");
  params.delete("incomingCall");
  params.delete("invite");
  if (stripFrom) params.delete("from");
  return params;
}

const CHAT_BACK_FROM_KEY = "vega-chat-back-from";

/** Remember list/tab the user came from when entering chat (survives URL cleanup). */
export function rememberChatBackFrom(from) {
  if (typeof window === "undefined") return;
  const value = String(from || "").trim();
  if (value === "calls" || value === "groups" || value === "channels") {
    try {
      sessionStorage.setItem(CHAT_BACK_FROM_KEY, value);
    } catch {}
  }
}

export function readChatBackFrom() {
  if (typeof window === "undefined") return "";
  try {
    return sessionStorage.getItem(CHAT_BACK_FROM_KEY) || "";
  } catch {
    return "";
  }
}

export function clearChatBackFrom() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(CHAT_BACK_FROM_KEY);
  } catch {}
}
