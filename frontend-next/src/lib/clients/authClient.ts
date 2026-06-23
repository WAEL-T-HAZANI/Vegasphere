import { api } from "@/lib/api";

/** Auth session & account identity — maps to `backend/routes/auth.routes.js`. */
export function getMe() {
  return api.get("/auth/me");
}

export function listSessions() {
  return api.get("/auth/sessions");
}

export function revokeSession(sessionId: string) {
  return api.delete(`/auth/sessions/${encodeURIComponent(sessionId)}`);
}

export function revokeCurrentSession() {
  return api.delete("/auth/sessions/current");
}

export function revokeOtherSessions() {
  return api.delete("/auth/sessions/others");
}
