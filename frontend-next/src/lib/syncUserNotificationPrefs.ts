import type { User } from "@/types";
import { setNotificationPrefs } from "@/store/slices/uiSlice";
import type { AppDispatch } from "@/store";

/** Apply server-stored notification fields to Redux (after login or /auth/me). */
export function syncUserNotificationPrefs(
  user: User | null | undefined,
  dispatch: AppDispatch,
) {
  if (!user) return;
  dispatch(
    setNotificationPrefs({
      doNotDisturb: user.doNotDisturb === true,
      direct: user.notificationRules?.direct !== false,
      groups: user.notificationRules?.groups !== false,
      mentions: user.notificationRules?.mentions !== false,
      sound: user.notificationRules?.sound !== false,
    }),
  );
}
