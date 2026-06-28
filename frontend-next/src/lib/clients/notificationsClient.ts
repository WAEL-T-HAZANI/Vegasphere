import { api } from "@/lib/api";
import type { AppNotification, NotificationsPayload } from "@/types/api";

/** Persisted notification inbox — maps to `backend/routes/user.routes.js`. */
export function listNotifications() {
  return api.get<NotificationsPayload>("/user/notifications");
}

export function markNotificationRead(notificationId: string) {
  return api.patch<AppNotification>(
    `/user/notifications/${encodeURIComponent(notificationId)}/read`,
  );
}

export function markAllNotificationsRead() {
  return api.patch<{ ok: boolean; modifiedCount?: number }>(
    "/user/notifications/read-all",
  );
}

export function dismissNotification(notificationId: string) {
  return api.delete<AppNotification>(
    `/user/notifications/${encodeURIComponent(notificationId)}`,
  );
}

export function deleteAllNotifications() {
  return api.delete<{ ok: boolean; modifiedCount?: number }>("/user/notifications");
}
