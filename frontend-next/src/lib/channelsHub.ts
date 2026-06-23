import type { Conversation, ConversationMember } from "@/types/api";
import {
  buildGroupMemberSuggestions,
  formatGroupUpdatedAt,
  groupInitials,
} from "@/lib/groupsHub";

export type ChannelVisibility = "public" | "private";

export type ChannelDirectoryEntry = {
  _id: string;
  name?: string;
  description?: string;
  channelSlug?: string;
  visibility?: ChannelVisibility | string;
  avatar?: string;
  channelPostingMode?: string;
  isMember?: boolean;
  isAdmin?: boolean;
  updatedAt?: string;
  members?: unknown[];
};

export function filterMyChannels(
  conversations: Conversation[] | null | undefined,
): Conversation[] {
  return (conversations || []).filter((c) => Boolean(c.isChannel));
}

export function buildChannelMemberSuggestions(
  conversations: Conversation[] | null | undefined,
  currentUserId?: string,
  limit = 48,
): ConversationMember[] {
  return buildGroupMemberSuggestions(conversations, currentUserId, limit);
}

export function channelInitials(name: string | undefined, fallback: string): string {
  return groupInitials(name, fallback);
}

export function formatChannelUpdatedAt(value: unknown, locale?: string): string {
  return formatGroupUpdatedAt(value, locale);
}

export function formatChannelSlug(slug: string | undefined): string {
  const raw = String(slug || "")
    .trim()
    .replace(/^#+/, "")
    .replace(/^\/+/, "");
  return raw ? `#${raw}` : "";
}

export function normalizeChannelSlugInput(value: string): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 48);
}

export function channelVisibilityLabel(
  visibility: unknown,
  t: (_key: string) => string,
): string {
  return String(visibility || "public") === "private"
    ? t("channelsVisibilityPrivate")
    : t("channelsVisibilityPublic");
}

export function isPrivateChannel(visibility: unknown): boolean {
  return String(visibility || "public") === "private";
}

export function channelPostingModeLabel(
  mode: unknown,
  t: (_key: string) => string,
): string {
  return String(mode || "admins_only") === "all"
    ? t("channelPostingAll")
    : t("channelPostingAdminsOnly");
}

export function activeChannelTopics(
  topics: unknown,
): Array<{ id?: string; name?: string; archived?: boolean }> {
  const list = Array.isArray(topics) ? topics : [];
  return list.filter(
    (topic) =>
      topic &&
      typeof topic === "object" &&
      !(topic as { archived?: boolean }).archived,
  ) as Array<{ id?: string; name?: string; archived?: boolean }>;
}
