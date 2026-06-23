import { api } from "@/lib/api";

export type NetworkingListParams = {
  q?: string;
  tag?: string;
};

/** Networking discovery & collab posts — maps to `backend/routes/networking.routes.js`. */
export function listNetworking<T = unknown>(params: NetworkingListParams = {}) {
  return api.get<T>("/networking", { params });
}

export function updateNetworkingProfile(body: Record<string, unknown>) {
  return api.put("/networking/profile", body);
}

export function createNetworkingPost(body: Record<string, unknown>) {
  return api.post("/networking/posts", body);
}

export function updateNetworkingPost(postId: string, body: Record<string, unknown>) {
  return api.patch(`/networking/posts/${encodeURIComponent(postId)}`, body);
}

export function closeNetworkingPost(postId: string) {
  return api.patch(`/networking/posts/${encodeURIComponent(postId)}/close`);
}

export function toggleNetworkingPostInterest(postId: string) {
  return api.post(`/networking/posts/${encodeURIComponent(postId)}/interest`);
}

export function generateNetworkingIntro(body: Record<string, unknown>) {
  return api.post<{ intro?: string }>("/networking/intro", body);
}
