// @ts-nocheck
import { dmPeerMember } from "@/lib/chatList";

/** Conversations where voice/video calls are supported. */
export function isCallableConversation(conv) {
  if (!conv?._id) return false;
  if (conv.isSelfChat || conv.isChannel) return false;
  if (conv.isGroup) return (conv.members?.length || 0) >= 2;
  // Direct chats — same set as Chats tab (exclude saved/self/channel only)
  return !conv.isGroup && !conv.isChannel;
}

export function conversationCallLabel(conv, t, myId) {
  if (!conv) return t?.("callsHistoryUnknown") || "Chat";
  if (conv.isSelfChat) return t?.("navSaved") || "Saved";
  if (conv.isGroup) return conv.name || t?.("navGroups") || "Group";
  const peer = dmPeerMember(conv, myId);
  return peer?.name || peer?.email || conv.name || conv.chatName || t?.("navChats") || "Chat";
}

export function buildAutocallHref(conversationId, mode, extra = {}) {
  const params = new URLSearchParams({ autocall: mode === "video" ? "video" : "audio" });
  Object.entries(extra).forEach(([key, value]) => {
    if (value != null && String(value).trim()) params.set(key, String(value));
  });
  return `/chat/${conversationId}?${params.toString()}`;
}
