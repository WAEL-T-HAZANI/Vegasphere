"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Wrench } from "lucide-react";
import { useAppSelector } from "@/store/hooks";
import { api } from "@/lib/api";
import { formatApiError } from "@/lib/apiError";
import { showAppToast } from "@/lib/appToast";
import SettingsSectionHeading from "@/components/settings/SettingsSectionHeading";

const sectionMotion = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
};

export default function SettingsMaintenanceSection() {
  const { t } = useTranslation();
  const allowed = useAppSelector(
    (s) => Boolean(s.auth.user?.destructiveMaintenanceAllowed),
  );
  const [busy, setBusy] = useState(false);

  if (!allowed) return null;

  const purgeAi = async () => {
    if (
      typeof window !== "undefined" &&
      !window.confirm(t("purgeAiChatbotConfirm"))
    ) {
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.delete("/conversation/purge/ai-chatbot");
      const n = Number(
        (data as { removedConversations?: number })?.removedConversations ?? 0,
      );
      showAppToast({
        id: "purge-ai",
        body: t("purgeAiChatbotDone", { count: n }),
      });
    } catch (e) {
      showAppToast({
        id: "purge-ai-err",
        body: formatApiError(e, t, "purgeAiChatbotFailed"),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.section
      {...sectionMotion}
      transition={{ duration: 0.2, delay: 0.14 }}
      className="vs-settings-card space-y-4"
    >
      <SettingsSectionHeading
        icon={Wrench}
        title={t("maintenanceTitle")}
        hint={t("purgeAiChatbotHint")}
      />
      <button
        type="button"
        disabled={busy}
        onClick={purgeAi}
        className="rounded-xl border border-red-300 bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-100 disabled:opacity-60"
      >
        {busy ? "…" : t("purgeAiChatbotAction")}
      </button>
    </motion.section>
  );
}
