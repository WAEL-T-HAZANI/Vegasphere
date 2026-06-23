"use client";

import { motion } from "framer-motion";
import { Bell, BellOff } from "lucide-react";
import { setNotificationPrefs } from "@/store/slices/uiSlice";
import PushSubscribeSection from "@/components/settings/PushSubscribeSection";
import SettingsSectionHeading from "@/components/settings/SettingsSectionHeading";
import SettingsToggleRow from "@/components/settings/SettingsToggleRow";

const sectionMotion = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
};

export default function SettingsNotificationsSection({
  t,
  notify,
  dispatch,
  directAlerts,
  setDirectAlerts,
  groupAlerts,
  setGroupAlerts,
  mentionAlerts,
  setMentionAlerts,
  pushWhenAway,
  setPushWhenAway,
  pushSaving,
  notifySaving,
  doNotDisturb,
  saveNotificationRules,
  savePushPreference,
  saveDoNotDisturb,
}) {
  const rulesBusy = pushSaving || notifySaving;

  const patchRules = (patch) => {
    saveNotificationRules({
      direct: patch.direct ?? directAlerts,
      groups: patch.groups ?? groupAlerts,
      mentions: patch.mentions ?? mentionAlerts,
      ...(patch.sound !== undefined ? { sound: patch.sound } : {}),
    });
  };

  return (
    <>
      <motion.section
        {...sectionMotion}
        transition={{ duration: 0.2, delay: 0.08 }}
        className="vs-settings-card space-y-3"
      >
        <SettingsSectionHeading
          icon={Bell}
          title={t("settingsNotifications")}
          hint={t("settingsNotificationsHint")}
        />
        <p className="text-xs font-medium text-muted">{t("settingsAutoSaveHint")}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <SettingsToggleRow
            label={t("settingsSound")}
            checked={notify.sound}
            disabled={rulesBusy}
            onChange={(next) => {
              dispatch(setNotificationPrefs({ sound: next }));
              patchRules({
                direct: directAlerts,
                groups: groupAlerts,
                mentions: mentionAlerts,
                sound: next,
              });
            }}
          />
          <SettingsToggleRow
            label={t("settingsNotifyDirect")}
            hint={t("settingsNotifyDirectHint")}
            checked={directAlerts}
            disabled={rulesBusy}
            onChange={(next) => {
              setDirectAlerts(next);
              patchRules({ direct: next });
            }}
          />
          <SettingsToggleRow
            label={t("settingsNotifyGroups")}
            hint={t("settingsNotifyGroupsHint")}
            checked={groupAlerts}
            disabled={rulesBusy}
            onChange={(next) => {
              setGroupAlerts(next);
              patchRules({ groups: next });
            }}
          />
          <SettingsToggleRow
            label={t("settingsNotifyMentions")}
            hint={t("settingsNotifyMentionsHint")}
            checked={mentionAlerts}
            disabled={rulesBusy}
            onChange={(next) => {
              setMentionAlerts(next);
              patchRules({ mentions: next });
            }}
          />
        </div>
        {rulesBusy ? (
          <p className="text-center text-xs font-medium text-muted">{t("loading")}</p>
        ) : null}
      </motion.section>

      <motion.section
        {...sectionMotion}
        transition={{ duration: 0.2, delay: 0.1 }}
        className="vs-settings-card space-y-3"
      >
        <SettingsSectionHeading icon={BellOff} title={t("settingsDndTitle")} />
        <SettingsToggleRow
          label={t("settingsDndEnable")}
          checked={doNotDisturb}
          disabled={rulesBusy}
          onChange={saveDoNotDisturb}
        />
      </motion.section>

      <motion.div
        {...sectionMotion}
        transition={{ duration: 0.2, delay: 0.12 }}
      >
        <PushSubscribeSection
          embedded
          pushWhenAway={pushWhenAway}
          pushSaving={pushSaving}
          rulesBusy={rulesBusy}
          permissionGranted={notify.browserPush}
          permissionAsked={notify.permissionAsked}
          onPushWhenAwayChange={(next) => {
            setPushWhenAway(next);
            savePushPreference(next);
          }}
          onPermissionChange={(granted) => {
            dispatch(
              setNotificationPrefs({
                browserPush: granted,
                permissionAsked: true,
              }),
            );
          }}
          onUnsubscribed={() => setPushWhenAway(false)}
        />
      </motion.div>
    </>
  );
}
