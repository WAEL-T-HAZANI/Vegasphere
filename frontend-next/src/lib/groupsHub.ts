import type { Conversation, ConversationMember } from "@/types/api";

export function filterMyGroups(conversations: Conversation[] | null | undefined): Conversation[] {
  return (conversations || []).filter((c) => Boolean(c.isGroup) && !c.isChannel);
}

/** People from direct chats only (not groups/channels/self). */
export function buildGroupMemberSuggestions(
  conversations: Conversation[] | null | undefined,
  currentUserId?: string,
  limit = 48,
): ConversationMember[] {
  const seen = new Map<string, ConversationMember>();
  for (const conv of conversations || []) {
    if (conv.isGroup || conv.isChannel || conv.isSelfChat) continue;
    for (const member of conv.members || []) {
      const id = String(member?._id || member || "");
      if (!id || id === String(currentUserId || "")) continue;
      if (!seen.has(id)) {
        seen.set(id, {
          _id: id,
          name: member?.name || "",
          username: member?.username || "",
          email: member?.email || "",
          profilePic: member?.profilePic || "",
        });
      }
    }
  }
  return [...seen.values()].slice(0, limit);
}

export function isConversationAdmin(
  conversation: Conversation | null | undefined,
  userId?: string,
): boolean {
  if (!conversation || !userId) return false;
  if (typeof conversation.viewerIsAdmin === "boolean") {
    return conversation.viewerIsAdmin;
  }
  const uid = String(userId);
  const admins = (conversation.admins as Array<{ _id?: string } | string> | undefined) || [];
  return admins.some((a) => String(typeof a === "object" && a?._id ? a._id : a) === uid);
}

export function groupInitials(name: string | undefined, fallback: string): string {
  const initials = String(name || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return initials || fallback;
}

export function formatGroupUpdatedAt(value: unknown, locale?: string): string {
  if (!value) return "";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "";
  const lang = locale?.startsWith("ar") ? "ar" : locale?.startsWith("en") ? "en" : locale;
  return date.toLocaleDateString(lang || undefined, {
    month: "short",
    day: "2-digit",
  });
}
