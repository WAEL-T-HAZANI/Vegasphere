"use client";

import { motion } from "framer-motion";
import { Navigation } from "lucide-react";
import { useFloatingNavMode } from "@/components/layout/FloatingNavigation";
import SettingsSectionHeading from "@/components/settings/SettingsSectionHeading";
import SettingsToggleRow from "@/components/settings/SettingsToggleRow";

const sectionMotion = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
};

export default function SettingsNavigationSection({ t, rtl }) {
  const { floatingNav, setEnabled } = useFloatingNavMode();

  return (
    <motion.section
      {...sectionMotion}
      transition={{ duration: 0.2, delay: 0.09 }}
      dir={rtl ? "rtl" : "ltr"}
      className="vs-settings-card space-y-3"
    >
      <SettingsSectionHeading
        icon={Navigation}
        title={t("settingsFloatingNavTitle")}
        hint={t("settingsFloatingNavHint")}
      />
      <p className="text-xs font-medium text-muted">{t("settingsLocalPrefsHint")}</p>
      <SettingsToggleRow
        label={t("settingsFloatingNavSwitch")}
        hint={t("settingsFloatingNavSwitchHint")}
        checked={floatingNav}
        onChange={setEnabled}
      />
    </motion.section>
  );
}
