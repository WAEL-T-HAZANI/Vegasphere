"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAppSelector, useAppDispatch } from "@/store/hooks";

import { authClient, userClient } from "@/lib/clients";
import { formatApiError } from "@/lib/apiError";
import { showAppToast } from "@/lib/appToast";
import { setUser } from "@/store/slices/authSlice";
import AccountPageShell from "@/components/account/AccountPageShell";
import ProtectedPageGate from "@/components/layout/ProtectedPageGate";
import { setNotificationPrefs } from "@/store/slices/uiSlice";
import SettingsAppearanceSection from "@/components/settings/SettingsAppearanceSection";
import SettingsNavigationSection from "@/components/settings/SettingsNavigationSection";
import SettingsNotificationsSection from "@/components/settings/SettingsNotificationsSection";
import SettingsMaintenanceSection from "@/components/settings/SettingsMaintenanceSection";
import { readLocalPref } from "@/lib/localPrefs";
import { syncUserNotificationPrefs } from "@/lib/syncUserNotificationPrefs";

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const status = useAppSelector((s) => s.auth.status);
  const theme = useAppSelector((s) => s.ui.theme);
  const notify = useAppSelector((s) => s.ui.notificationPrefs);
  const rtl = i18n.dir() === "rtl";
  const lang = String(i18n.language || "en").toLowerCase();
  const isArabic = lang.startsWith("ar");
  const languageOptionEnglish = isArabic ? "الانجليزية" : "English";
  const languageOptionArabic = isArabic ? "العربية" : "Arabic";
  const themeLabelLight = isArabic ? "فاتح" : "Light";
  const themeLabelDark = isArabic ? "داكن" : "Dark";
  const [doNotDisturb, setDoNotDisturb] = useState(false);
  const [directAlerts, setDirectAlerts] = useState(true);
  const [groupAlerts, setGroupAlerts] = useState(true);
  const [mentionAlerts, setMentionAlerts] = useState(true);
  const [notifySaving, setNotifySaving] = useState(false);
  const [enterToSend, setEnterToSend] = useState(true);
  const [autoDownloadMedia, setAutoDownloadMedia] = useState("wifi");

  useEffect(() => {
    setEnterToSend(readLocalPref("vs_enter_to_send", true) !== false);
    const adm = readLocalPref("vs_media_auto_download", "always");
    setAutoDownloadMedia(["never", "wifi", "always"].includes(adm) ? adm : "wifi");
  }, []);

  useEffect(() => {
    if (!user) return;
    setDoNotDisturb(user.doNotDisturb === true);
    setDirectAlerts(user.notificationRules?.direct !== false);
    setGroupAlerts(user.notificationRules?.groups !== false);
    setMentionAlerts(user.notificationRules?.mentions !== false);
    syncUserNotificationPrefs(user, dispatch);
  }, [user, dispatch]);

  const toastSaved = useCallback(() => {
    showAppToast({ id: "settings-saved", body: t("settingsSaved") });
  }, [t]);

  const toastError = useCallback(
    (err) => {
      showAppToast({
        id: "settings-err",
        body: formatApiError(err, t, "errorOccurred"),
      });
    },
    [t],
  );

  const saveNotificationRules = async (nextRules) => {
    setNotifySaving(true);
    dispatch(
      setNotificationPrefs({
        direct: nextRules.direct !== false,
        groups: nextRules.groups !== false,
        mentions: nextRules.mentions !== false,
        ...(nextRules.sound !== undefined
          ? { sound: nextRules.sound !== false }
          : {}),
      }),
    );
    try {
      await userClient.updateProfile({ notificationRules: nextRules });
      const { data } = await authClient.getMe();
      dispatch(setUser(data));
      toastSaved();
    } catch (err) {
      toastError(err);
      const restored = user?.notificationRules || {};
      setDirectAlerts(restored.direct !== false);
      setGroupAlerts(restored.groups !== false);
      setMentionAlerts(restored.mentions !== false);
      dispatch(
        setNotificationPrefs({
          direct: restored.direct !== false,
          groups: restored.groups !== false,
          mentions: restored.mentions !== false,
          sound: restored.sound !== false,
        }),
      );
    } finally {
      setNotifySaving(false);
    }
  };

  const saveDoNotDisturb = async (enabled) => {
    setDoNotDisturb(enabled);
    dispatch(setNotificationPrefs({ doNotDisturb: enabled }));
    setNotifySaving(true);
    try {
      await userClient.updateProfile({ doNotDisturb: enabled });
      const { data } = await authClient.getMe();
      dispatch(setUser(data));
      showAppToast({
        id: "settings-dnd",
        body: enabled ? t("settingsDndEnabled") : t("settingsDndDisabled"),
      });
    } catch (err) {
      setDoNotDisturb(!enabled);
      dispatch(setNotificationPrefs({ doNotDisturb: !enabled }));
      toastError(err);
    } finally {
      setNotifySaving(false);
    }
  };

  return (
    <ProtectedPageGate titleKey="navSettings" status={status} user={user}>
      <AccountPageShell
        className="vs-settings-page"
        title={t("navSettings")}
        hint={t("settingsPageHint")}
        mainClassName="pb-safe"
      >
        <SettingsAppearanceSection
          t={t}
          i18n={i18n}
          theme={theme}
          dispatch={dispatch}
          rtl={rtl}
          themeLabelLight={themeLabelLight}
          themeLabelDark={themeLabelDark}
          languageOptionEnglish={languageOptionEnglish}
          languageOptionArabic={languageOptionArabic}
          enterToSend={enterToSend}
          setEnterToSend={setEnterToSend}
          autoDownloadMedia={autoDownloadMedia}
          setAutoDownloadMedia={setAutoDownloadMedia}
        />
        <SettingsNavigationSection t={t} rtl={rtl} />
        <SettingsNotificationsSection
          t={t}
          notify={notify}
          dispatch={dispatch}
          directAlerts={directAlerts}
          setDirectAlerts={setDirectAlerts}
          groupAlerts={groupAlerts}
          setGroupAlerts={setGroupAlerts}
          mentionAlerts={mentionAlerts}
          setMentionAlerts={setMentionAlerts}
          notifySaving={notifySaving}
          doNotDisturb={doNotDisturb}
          saveNotificationRules={saveNotificationRules}
          saveDoNotDisturb={saveDoNotDisturb}
        />
        <SettingsMaintenanceSection />
      </AccountPageShell>
    </ProtectedPageGate>
  );
}
