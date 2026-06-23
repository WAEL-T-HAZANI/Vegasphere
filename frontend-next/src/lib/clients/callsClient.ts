import { api } from "@/lib/api";

/** Calls history & invite links — maps to `backend/routes/call.routes.js`. */
export function getCallHistory<T = unknown>() {
  return api.get<T[]>("/calls/history");
}

export function getCallInvites<T = unknown>() {
  return api.get<T[]>("/calls/invites");
}

export function createCallInvite(body: Record<string, unknown>) {
  return api.post("/calls/invite", body);
}

export function cancelCallInvite(inviteId: string) {
  return api.delete(`/calls/invite/${encodeURIComponent(inviteId)}`);
}

export function getIceServers<T = unknown>() {
  return api.get<T>("/calls/ice-servers");
}
