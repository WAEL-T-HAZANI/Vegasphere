"use client";

import { motion } from "framer-motion";
import { Languages, MessageSquare, Palette } from "lucide-react";
import { cn } from "@/lib/classNames";
import { setTheme } from "@/store/slices/uiSlice";
import { writeLocalPref } from "@/lib/localPrefs";
import PrivacySelectField from "@/components/privacy/PrivacySelectField";
import SettingsSectionHeading from "@/components/settings/SettingsSectionHeading";
import SettingsToggleRow from "@/components/settings/SettingsToggleRow";

const sectionMotion = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
};

export default function SettingsAppearanceSection({
  t,
  i18n,
  theme,
  dispatch,
  rtl,
  themeLabelLight,
  themeLabelDark,
  languageOptionEnglish,
  languageOptionArabic,
  enterToSend,
  setEnterToSend,
  autoDownloadMedia,
  setAutoDownloadMedia,
}) {
  const mediaOptions = [
    { value: "never", label: t("settingsAutoDownloadNever") },
    { value: "wifi", label: t("settingsAutoDownloadWifi") },
    { value: "always", label: t("settingsAutoDownloadAlways") },
  ];

  return (
    <>
      <motion.section
        {...sectionMotion}
        transition={{ duration: 0.2 }}
        className="vs-settings-card space-y-4"
      >
        <SettingsSectionHeading
          icon={Palette}
          title={t("settingsAppearance")}
          hint={t("settingsAppearanceHint")}
        />
        <div className="flex flex-wrap gap-2">
          {(["light", "dark"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => {
                try {
                  localStorage.setItem("vegasphere-next-theme", k);
                } catch {}
                try {
                  document.cookie = `vegasphere-next-theme=${encodeURIComponent(k)}; path=/; max-age=31536000; samesite=lax`;
                } catch {}
                dispatch(setTheme(k));
              }}
              className={cn(
                "vs-segment-btn rounded-xl border px-4 py-2 text-sm font-semibold shadow-sm transition",
                theme === k
                  ? "border-brand-600 bg-brand-700 text-white dark:border-brand-600 dark:bg-brand-700"
                  : "border-brand-200/60 bg-surface text-ink hover:border-brand-300 dark:border-brand-800/50 dark:bg-brand-900/20",
              )}
            >
              {k === "dark" ? themeLabelDark : themeLabelLight}
            </button>
          ))}
        </div>
      </motion.section>

      <motion.section
        {...sectionMotion}
        transition={{ duration: 0.2, delay: 0.03 }}
        className="vs-settings-card space-y-4"
      >
        <SettingsSectionHeading
          icon={Languages}
          title={t("language")}
          hint={t("settingsLanguageHint")}
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={cn(
              "vs-segment-btn rounded-xl border px-4 py-2 text-sm font-semibold shadow-sm transition",
              i18n.language === "en"
                ? "border-brand-600 bg-brand-700 text-white dark:border-brand-600 dark:bg-brand-700"
                : "border-brand-200/60 bg-surface text-ink hover:border-brand-300 dark:border-brand-800/50 dark:bg-brand-900/20",
            )}
            onClick={() => i18n.changeLanguage("en")}
          >
            {languageOptionEnglish}
          </button>
          <button
            type="button"
            className={cn(
              "vs-segment-btn rounded-xl border px-4 py-2 text-sm font-semibold shadow-sm transition",
              i18n.language === "ar"
                ? "border-brand-600 bg-brand-700 text-white dark:border-brand-600 dark:bg-brand-700"
                : "border-brand-200/60 bg-surface text-ink hover:border-brand-300 dark:border-brand-800/50 dark:bg-brand-900/20",
            )}
            onClick={() => i18n.changeLanguage("ar")}
          >
            {languageOptionArabic}
          </button>
        </div>
      </motion.section>

      <motion.section
        {...sectionMotion}
        transition={{ duration: 0.2, delay: 0.06 }}
        className="vs-settings-card space-y-3"
      >
        <SettingsSectionHeading
          icon={MessageSquare}
          title={t("settingsChatPreferences")}
          hint={t("settingsChatPreferencesHint")}
        />
        <p className="text-xs font-medium text-muted">{t("settingsLocalPrefsHint")}</p>
        <SettingsToggleRow
          label={t("settingsEnterToSend")}
          hint={t("settingsEnterToSendHint")}
          checked={enterToSend}
          onChange={(v) => {
            setEnterToSend(v);
            writeLocalPref("vs_enter_to_send", v);
          }}
        />
        <div className="vs-account-list-row">
          <span className="min-w-0 text-sm font-semibold text-ink">
            {t("settingsMediaAutoDownload")}
          </span>
          <PrivacySelectField
            rtl={rtl}
            ariaLabel={t("settingsMediaAutoDownload")}
            value={autoDownloadMedia}
            options={mediaOptions}
            onChange={(v) => {
              setAutoDownloadMedia(v);
              writeLocalPref("vs_media_auto_download", v);
            }}
          />
        </div>
      </motion.section>
    </>
  );
}
