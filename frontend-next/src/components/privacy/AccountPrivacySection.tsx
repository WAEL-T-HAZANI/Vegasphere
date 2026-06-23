"use client";

import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import BlockedUsersSection from "@/components/privacy/BlockedUsersSection";
import IgnoredUsersSection from "@/components/privacy/IgnoredUsersSection";
import PrivacyToggle from "@/components/privacy/PrivacyToggle";
import PrivacySelectField from "@/components/privacy/PrivacySelectField";
import PrivacyE2eSection from "@/components/privacy/PrivacyE2eSection";
import ReportUserSection from "@/components/privacy/ReportUserSection";
import SettingsSectionHeading from "@/components/settings/SettingsSectionHeading";

const sectionMotion = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
};

export default function AccountPrivacySection({
  t,
  rtl,
  userId,
  lastSeenVisibility,
  setLastSeenVisibility,
  onlineVisibility,
  setOnlineVisibility,
  profilePhotoVisibility,
  setProfilePhotoVisibility,
  aboutVisibility,
  setAboutVisibility,
  callPrivacy,
  setCallPrivacy,
  searchDiscoverable,
  setSearchDiscoverable,
  groupAddPermission,
  setGroupAddPermission,
  readReceiptsEnabled,
  setReadReceiptsEnabled,
  typingIndicatorsEnabled,
  setTypingIndicatorsEnabled,
  loginAlertsEnabled,
  setLoginAlertsEnabled,
  savingPrivacy,
  persistPrivacy,
}) {
  const saveSelect = async (patch, applyLocal) => {
    applyLocal();
    await persistPrivacy(patch);
  };

  const visibilityOptions = [
    { value: "everyone", label: t("privacyEveryone") },
    { value: "contacts", label: t("privacyContacts") },
    { value: "nobody", label: t("privacyNobody") },
  ];

  const groupAddOptions = [
    { value: "everyone", label: t("privacyEveryone") },
    { value: "contacts", label: t("privacyContacts") },
    { value: "nobody", label: t("privacyNobody") },
  ];

  return (
    <>
      <motion.section
        {...sectionMotion}
        transition={{ duration: 0.2, delay: 0.05 }}
        className="vs-settings-card space-y-3"
      >
        <h2 className="text-sm font-semibold text-ink">{t("privacySection")}</h2>
        <p className="text-xs leading-relaxed text-muted">{t("privacyDifferenceBody")}</p>
        <p className="text-xs text-muted">{t("privacyAutoSaveHint")}</p>
        <p className="text-xs text-muted">{t("privacyMutualHint")}</p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="vs-account-list-row">
            <span className="min-w-0 text-sm font-medium text-ink">
              {t("privacyLastSeenVisibility")}
            </span>
            <PrivacySelectField
              rtl={rtl}
              ariaLabel={t("privacyLastSeenVisibility")}
              value={lastSeenVisibility}
              options={visibilityOptions}
              disabled={savingPrivacy}
              onChange={(value) => {
                void saveSelect(
                  { lastSeenVisibility: value },
                  () => setLastSeenVisibility(value),
                );
              }}
            />
          </div>
          <div className="vs-account-list-row">
            <span className="min-w-0 text-sm font-medium text-ink">
              {t("privacyOnlineVisibility")}
            </span>
            <PrivacySelectField
              rtl={rtl}
              ariaLabel={t("privacyOnlineVisibility")}
              value={onlineVisibility}
              options={visibilityOptions}
              disabled={savingPrivacy}
              onChange={(value) => {
                void saveSelect(
                  { onlineVisibility: value },
                  () => setOnlineVisibility(value),
                );
              }}
            />
          </div>
          <div className="vs-account-list-row">
            <span className="min-w-0 text-sm font-medium text-ink">
              {t("privacyProfilePhotoVisibility")}
            </span>
            <PrivacySelectField
              rtl={rtl}
              ariaLabel={t("privacyProfilePhotoVisibility")}
              value={profilePhotoVisibility}
              options={visibilityOptions}
              disabled={savingPrivacy}
              onChange={(value) => {
                void saveSelect(
                  { profilePhotoVisibility: value },
                  () => setProfilePhotoVisibility(value),
                );
              }}
            />
          </div>
          <div className="vs-account-list-row">
            <span className="min-w-0 text-sm font-medium text-ink">
              {t("privacyAboutVisibility")}
            </span>
            <PrivacySelectField
              rtl={rtl}
              ariaLabel={t("privacyAboutVisibility")}
              value={aboutVisibility}
              options={visibilityOptions}
              disabled={savingPrivacy}
              onChange={(value) => {
                void saveSelect(
                  { aboutVisibility: value },
                  () => setAboutVisibility(value),
                );
              }}
            />
          </div>
          <div className="vs-account-list-row">
            <span className="min-w-0 text-sm font-medium text-ink">
              {t("privacySearchDiscoverable")}
            </span>
            <PrivacySelectField
              rtl={rtl}
              ariaLabel={t("privacySearchDiscoverable")}
              value={searchDiscoverable}
              options={visibilityOptions}
              disabled={savingPrivacy}
              onChange={(value) => {
                void saveSelect(
                  { searchDiscoverable: value },
                  () => setSearchDiscoverable(value),
                );
              }}
            />
          </div>
          <div className="vs-account-list-row">
            <span className="min-w-0 text-sm font-medium text-ink">
              {t("privacyCallPrivacy")}
            </span>
            <PrivacySelectField
              rtl={rtl}
              ariaLabel={t("privacyCallPrivacy")}
              value={callPrivacy}
              options={visibilityOptions}
              disabled={savingPrivacy}
              onChange={(value) => {
                void saveSelect({ callPrivacy: value }, () => setCallPrivacy(value));
              }}
            />
          </div>
          <div className="vs-account-list-row sm:col-span-2">
            <span className="min-w-0 text-sm font-medium text-ink">
              {t("privacyGroupAddPermission")}
            </span>
            <PrivacySelectField
              rtl={rtl}
              ariaLabel={t("privacyGroupAddPermission")}
              value={groupAddPermission}
              options={groupAddOptions}
              disabled={savingPrivacy}
              onChange={(value) => {
                void saveSelect(
                  { groupAddPermission: value },
                  () => setGroupAddPermission(value),
                );
              }}
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="vs-account-list-row">
            <span className="text-sm font-medium text-ink">{t("privacyReadReceipts")}</span>
            <PrivacyToggle
              label={t("privacyReadReceipts")}
              checked={readReceiptsEnabled}
              disabled={savingPrivacy}
              onChange={(checked) => {
                void saveSelect(
                  { readReceiptsEnabled: checked },
                  () => setReadReceiptsEnabled(checked),
                );
              }}
            />
          </div>
          <div className="vs-account-list-row">
            <span className="text-sm font-medium text-ink">
              {t("privacyTypingIndicators")}
            </span>
            <PrivacyToggle
              label={t("privacyTypingIndicators")}
              checked={typingIndicatorsEnabled}
              disabled={savingPrivacy}
              onChange={(checked) => {
                void saveSelect(
                  { typingIndicatorsEnabled: checked },
                  () => setTypingIndicatorsEnabled(checked),
                );
              }}
            />
          </div>
          <div className="vs-account-list-row sm:col-span-2">
            <span className="text-sm font-medium text-ink">{t("privacyLoginAlerts")}</span>
            <PrivacyToggle
              label={t("privacyLoginAlerts")}
              checked={loginAlertsEnabled}
              disabled={savingPrivacy}
              onChange={(checked) => {
                void saveSelect(
                  { loginAlertsEnabled: checked },
                  () => setLoginAlertsEnabled(checked),
                );
              }}
            />
          </div>
        </div>

        {savingPrivacy ? (
          <p className="text-center text-xs text-muted">{t("loading")}</p>
        ) : null}
      </motion.section>

      <motion.section
        {...sectionMotion}
        transition={{ duration: 0.2, delay: 0.06 }}
        className="vs-settings-card space-y-4"
      >
        <SettingsSectionHeading
          icon={Lock}
          title={t("privacyE2eTitle")}
          hint={t("profileE2eHint")}
        />
        <PrivacyE2eSection userId={userId} />
      </motion.section>

      <motion.section
        {...sectionMotion}
        transition={{ duration: 0.2, delay: 0.07 }}
        className="vs-settings-card space-y-4"
      >
        <div>
          <h2 className="text-sm font-semibold text-ink">{t("privacyPeopleTitle")}</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted">{t("privacyPeopleHint")}</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="flex min-h-[12rem] flex-col gap-2 rounded-2xl border border-brand-200/40 bg-surface/50 p-3 dark:border-brand-800/30 dark:bg-brand-900/10">
            <div>
              <h3 className="vs-section-kicker">{t("privacyBlockedTitle")}</h3>
              <p className="mt-1 text-[11px] leading-relaxed text-muted">
                {t("privacyBlockedDetail")}
              </p>
            </div>
            <BlockedUsersSection embedded />
          </div>
          <div className="flex min-h-[12rem] flex-col gap-2 rounded-2xl border border-brand-200/40 bg-surface/50 p-3 dark:border-brand-800/30 dark:bg-brand-900/10">
            <div>
              <h3 className="vs-section-kicker">{t("privacyIgnoredTitle")}</h3>
              <p className="mt-1 text-[11px] leading-relaxed text-muted">
                {t("privacyIgnoredHint")}
              </p>
            </div>
            <IgnoredUsersSection />
          </div>
        </div>
      </motion.section>

      <motion.section
        {...sectionMotion}
        transition={{ duration: 0.2, delay: 0.08 }}
        className="vs-settings-card space-y-4"
      >
        <div>
          <h2 className="text-sm font-semibold text-ink">{t("privacyReportTitle")}</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted">{t("privacyReportIntro")}</p>
        </div>
        <ReportUserSection />
      </motion.section>
    </>
  );
}
