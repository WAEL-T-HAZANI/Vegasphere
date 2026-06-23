import { api } from "@/lib/api";
import type { Conversation } from "@/types/api";

/** Conversations, groups, channels — maps to `backend/routes/conversation.routes.js`. */
export function listConversations() {
  return api.get<Conversation[]>("/conversation/");
}

export function createDirectConversation(members: string[]) {
  return api.post<{ _id?: string }>("/conversation/", { members });
}

export function createGroup(body: {
  name: string;
  description?: string;
  memberIds?: string[];
}) {
  return api.post<{ _id?: string }>("/conversation/group", body);
}

export function createChannel(body: Record<string, unknown>) {
  return api.post<{ _id?: string }>("/conversation/channel", body);
}

export function listPublicChannels<T = unknown>() {
  return api.get<T[]>("/conversation/channels/list");
}

export function joinChannel(channelId: string) {
  return api.post(`/conversation/channel/${encodeURIComponent(channelId)}/join`);
}

export function leaveConversation(conversationId: string) {
  return api.post(`/conversation/${encodeURIComponent(conversationId)}/leave`);
}
