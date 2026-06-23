import type { AxiosRequestConfig } from "axios";
import { api } from "@/lib/api";
import type { PresenceMap } from "@/types";

/** User profile, social graph, presence — maps to `backend/routes/user.routes.js`. */
export function updateProfile(body: Record<string, unknown>) {
  return api.put("/user/update", body);
}

export function getPublicProfile(userId: string) {
  return api.get(`/user/public/${encodeURIComponent(userId)}`);
}

export function getOnlineStatus(userId: string) {
  return api.get(`/user/online-status/${encodeURIComponent(userId)}`);
}

export function getPresenceBatch(ids: string[]) {
  const query = ids.filter(Boolean).join(",");
  return api.get<PresenceMap>("/user/presence", {
    params: query ? { ids: query } : undefined,
  });
}

export function sendChatInvite(otherUserId: string) {
  return api.post(`/user/invite/${encodeURIComponent(otherUserId)}`);
}

export function acceptChatInvite(fromUserId: string) {
  return api.post(`/user/invites/${encodeURIComponent(fromUserId)}/accept`);
}

export function declineChatInvite(fromUserId: string) {
  return api.post(`/user/invites/${encodeURIComponent(fromUserId)}/decline`);
}

export function blockUser(userId: string) {
  return api.post(`/user/block/${encodeURIComponent(userId)}`);
}

export function unblockUser(userId: string) {
  return api.post(`/user/unblock/${encodeURIComponent(userId)}`);
}

export function ignoreUser(userId: string) {
  return api.post(`/user/ignore/${encodeURIComponent(userId)}`);
}

export function reportUser(userId: string, reason: string) {
  return api.post(`/user/report/${encodeURIComponent(userId)}`, { reason });
}

export function patchChatInbox(body: Record<string, unknown>) {
  return api.patch("/user/chat-inbox", body);
}

export function deleteAccount() {
  return api.delete("/user/me");
}

export function removeAvatar() {
  return api.delete<{ url?: string }>("/user/avatar");
}

export function uploadAvatar(form: FormData, config?: AxiosRequestConfig) {
  return api.post<{ url?: string }>("/user/avatar/upload", form, config);
}
