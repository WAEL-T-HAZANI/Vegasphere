import type { User } from "@/types";

export type SearchConversationHit = {
  _id: string;
  name?: string;
  latestmessage?: string;
  latestMessage?: string;
  isGroup?: boolean;
  isChannel?: boolean;
  channelSlug?: string;
};

export type SearchMessageHit = {
  _id: string;
  conversationId?: string;
  conversationName?: string;
  text?: string;
  fileName?: string;
  topicName?: string;
  messageType?: string;
  createdAt?: string;
};

export type GlobalSearchResult = {
  users: User[];
  conversations: SearchConversationHit[];
  messages: SearchMessageHit[];
};

export function stripBotUsers(list: User[] | null | undefined): User[] {
  return (Array.isArray(list) ? list : []).filter(
    (user) => !/bot$/i.test(String(user?.email || "")),
  );
}

export function displayUserPrimaryLabel(u: Partial<User> | null | undefined): string {
  const candidates = [u?.name, u?.username, u?.email]
    .map((x) => (x == null ? "" : String(x).trim()))
    .filter(Boolean);
  const best = candidates.find((s) => !/^\d+$/.test(s)) || candidates[0] || "";
  return best || String(u?._id || "").trim();
}

export function userHandleLine(u: Partial<User> | null | undefined): string {
  if (u?.username != null && String(u.username).trim()) {
    return `@${String(u.username).replace(/^@+/, "")}`;
  }
  return String(u?.email ?? "");
}

export function userInitials(label: string): string {
  return String(label || "V")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase();
}

export function conversationPreview(c: SearchConversationHit | null | undefined): string {
  return String(c?.latestmessage || c?.latestMessage || "").trim();
}

export function messagePreview(m: SearchMessageHit | null | undefined): string {
  if (!m) return "—";
  return String(m.text || m.fileName || m.topicName || "—").trim() || "—";
}

export function searchTotals(result: GlobalSearchResult) {
  return {
    people: result.users.length,
    chats: result.conversations.length,
    messages: result.messages.length,
    all:
      result.users.length +
      result.conversations.length +
      result.messages.length,
  };
}
