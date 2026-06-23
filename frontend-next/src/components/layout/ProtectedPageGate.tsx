"use client";

/**
 * Per-page guard for settings, profile, privacy, etc.
 * Renders a title + loading (or sign-in hint) until auth.user is ready, then children.
 */
import { useTranslation } from "react-i18next";
import DashboardShellLoading from "@/components/layout/DashboardShellLoading";

export default function ProtectedPageGate({ titleKey, status, user, children }) {
  const { t } = useTranslation();

  if (status === "anonymous") {
    return null;
  }

  if (status === "loading" || status === "idle") {
    return <DashboardShellLoading />;
  }

  if (!user) {
    return (
      <div className="relative mx-auto max-w-lg p-6 md:p-8">
        <h1 className="relative text-2xl font-bold tracking-tight text-brand-800 dark:text-brand-200">
          {t(titleKey)}
        </h1>
        <p className="relative mt-3 text-sm leading-relaxed text-muted">
          {t("dashboardNeedSignIn")}
        </p>
      </div>
    );
  }

  return children;
}
