"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Radio, Volume2, Zap } from "lucide-react";
import { api } from "@/lib/api";
import { formatApiError } from "@/lib/apiError";
import { playVegasphereNotifySound } from "@/lib/notificationSound";
import {
  subscribeToWebPush,
  unsubscribeFromWebPush,
} from "@/lib/pushSubscribe";
import SettingsSectionHeading from "@/components/settings/SettingsSectionHeading";
import SettingsToggleRow from "@/components/settings/SettingsToggleRow";

type PushSubscribeSectionProps = {
  embedded?: boolean;
  pushWhenAway?: boolean;
  pushSaving?: boolean;
  rulesBusy?: boolean;
  permissionGranted?: boolean;
  permissionAsked?: boolean;
  onPushWhenAwayChange?: (enabled: boolean) => void;
  onPermissionChange?: (granted: boolean) => void;
  onUnsubscribed?: () => void;
};

export default function PushSubscribeSection({
  embedded = false,
  pushWhenAway = true,
  pushSaving = false,
  rulesBusy = false,
  permissionGranted = false,
  permissionAsked = false,
  onPushWhenAwayChange,
  onPermissionChange,
  onUnsubscribed,
}: PushSubscribeSectionProps) {
  const { t } = useTranslation();
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const disabled = busy || pushSaving || rulesBusy;

  const subscribe = async () => {
    setMsg("");
    setBusy(true);
    try {
      let perm = Notification.permission;
      if (perm === "default") {
        perm = await Notification.requestPermission();
      }
      onPermissionChange?.(perm === "granted");
      if (perm !== "granted") {
        setMsg(t("pushDisabled"));
        return;
      }
      const result = await subscribeToWebPush();
      if (result.ok === false) {
        setMsg(formatApiError(result.error, t, "pushSubscribeFailed"));
        return;
      }
      if (!result.subscribed) {
        const reason = "reason" in result ? result.reason : "unsupported";
        const reasonKey: Record<string, string> = {
          not_configured: "pushNotConfigured",
          insecure: "pushInsecureContext",
          push_unavailable: "pushServiceUnavailable",
          sw_timeout: "pushSwTimeout",
          unsupported: "pushSwUnsupported",
        };
        setMsg(t(reasonKey[reason] || "pushSwUnsupported"));
        return;
      }
      onPushWhenAwayChange?.(true);
      setMsg(t("pushSubscribed"));
    } catch (e) {
      setMsg(formatApiError(e, t, "pushSubscribeFailed"));
    } finally {
      setBusy(false);
    }
  };

  const unsubscribe = async () => {
    setMsg("");
    setBusy(true);
    try {
      await unsubscribeFromWebPush();
      onPushWhenAwayChange?.(false);
      onUnsubscribed?.();
      onPermissionChange?.(false);
      setMsg(t("pushUnsubscribed"));
    } catch (e) {
      setMsg(formatApiError(e, t, "pushSubscribeFailed"));
    } finally {
      setBusy(false);
    }
  };

  const testSound = async () => {
    const played = await playVegasphereNotifySound();
    setMsg(played ? t("pushSoundPreview") : t("pushSoundPreviewBlocked"));
  };

  const testPush = async () => {
    setMsg("");
    setBusy(true);
    try {
      await api.post("/user/push/test");
      setMsg(t("pushTestSent"));
    } catch (e) {
      setMsg(formatApiError(e, t, "pushTestFailed"));
    } finally {
      setBusy(false);
    }
  };

  const inner = (
    <>
      <SettingsSectionHeading
        icon={Radio}
        title={t("pushBackgroundTitle")}
        hint={t("pushBackgroundHint")}
      />
      {onPushWhenAwayChange ? (
        <SettingsToggleRow
          label={t("pushNotifyWhenAway")}
          hint={t("pushNotifyWhenAwayHint")}
          checked={pushWhenAway}
          disabled={disabled}
          onChange={onPushWhenAwayChange}
        />
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || pushSaving}
          onClick={subscribe}
          className="vs-btn-primary-sm px-5 py-2.5 disabled:opacity-60"
        >
          {busy ? "…" : t("pushSubscribe")}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={unsubscribe}
          className="vs-btn-outline-sm px-5 py-2.5 disabled:opacity-60"
        >
          {t("pushUnsubscribeAction")}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => void testSound()}
          className="vs-btn-outline-sm inline-flex items-center gap-1.5 px-4 py-2.5"
        >
          <Volume2 className="h-3.5 w-3.5" aria-hidden />
          {t("pushPreviewSound")}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={testPush}
          className="vs-btn-outline-sm inline-flex items-center gap-1.5 px-4 py-2.5"
        >
          <Zap className="h-3.5 w-3.5" aria-hidden />
          {t("pushSendTest")}
        </button>
      </div>
      {permissionAsked ? (
        <p className="text-xs font-medium text-muted">
          {permissionGranted ? t("pushEnabled") : t("pushDisabled")}
        </p>
      ) : null}
      {msg ? (
        <p className="text-xs font-medium leading-relaxed text-muted">{msg}</p>
      ) : null}
    </>
  );

  if (embedded) {
    return <section className="vs-settings-card space-y-3">{inner}</section>;
  }

  return <section className="vs-settings-card space-y-3">{inner}</section>;
}
