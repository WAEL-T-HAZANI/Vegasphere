import { api } from "@/lib/api";
import type { StatusAudience, StatusItem } from "@/types/status";

/** Status stories — maps to `backend/routes/status.routes.js`. */
export function getStatusFeed() {
  return api.get<StatusItem[]>("/status/feed");
}

export function getMyStatus() {
  return api.get<StatusItem[]>("/status/mine");
}

export function getStatusAudience() {
  return api.get<StatusAudience>("/status/audience");
}

export function createStatus(form: FormData) {
  return api.post("/status/", form);
}

export function viewStatus(statusId: string) {
  return api.post(`/status/${encodeURIComponent(statusId)}/view`);
}

export function deleteStatus(statusId: string) {
  return api.delete(`/status/${encodeURIComponent(statusId)}`);
}
