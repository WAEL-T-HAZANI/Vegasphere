"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import { formatApiError } from "@/lib/apiError";
import { showAppToast } from "@/lib/appToast";
import type { User } from "@/types";

type AccountSecuritySectionProps = {
  user: User | null | undefined;
  onUserRefresh: () => Promise<void>;
  /** When true, omit outer card wrapper (parent provides the section shell). */
  embedded?: boolean;
};

export default function AccountSecuritySection({
  user,
  onUserRefresh,
  embedded = false,
}: AccountSecuritySectionProps) {
  const { t } = useTranslation();
  const [pin, setPin] = useState("");
  const [disablePin, setDisablePin] = useState("");
  const [busy, setBusy] = useState(false);
  const [verifyBusy, setVerifyBusy] = useState(false);

  const savePin = async () => {
    setBusy(true);
    try {
      await api.put("/auth/2step/pin", { pin: pin.trim() });
      setPin("");
      await onUserRefresh();
      showAppToast({ id: "2step-on", body: t("twoStepEnabledToast") });
    } catch (e) {
      showAppToast({
        id: "2step-err",
        body: formatApiError(e, t, "twoStepSaveFailed"),
      });
    } finally {
      setBusy(false);
    }
  };

  const disable2Step = async () => {
    setBusy(true);
    try {
      await api.delete("/auth/2step", { data: { pin: disablePin.trim() } });
      setDisablePin("");
      await onUserRefresh();
      showAppToast({ id: "2step-off", body: t("twoStepDisabledToast") });
    } catch (e) {
      showAppToast({
        id: "2step-err",
        body: formatApiError(e, t, "twoStepDisableFailed"),
      });
    } finally {
      setBusy(false);
    }
  };

  const resendVerify = async () => {
    setVerifyBusy(true);
    try {
      const { data } = await api.post("/auth/resend-verification", {});
      const hint =
        data && typeof data === "object" && "debugVerifyToken" in data
          ? String((data as { debugVerifyToken?: string }).debugVerifyToken || "")
          : "";
      showAppToast({
        id: "verify-sent",
        body: hint
          ? t("verifyEmailDevToken", { token: hint })
          : t("verifyEmailResent"),
      });
    } catch (e) {
      showAppToast({
        id: "verify-err",
        body: formatApiError(e, t, "verifyEmailResendFailed"),
      });
    } finally {
      setVerifyBusy(false);
    }
  };

  const body = (
    <>
      {!user?.emailVerified ? (
        <div className="vs-status-panel-pending">
          <p className="text-sm text-ink">{t("emailNotVerifiedHint")}</p>
          <button
            type="button"
            disabled={verifyBusy}
            onClick={resendVerify}
            className="vs-btn-primary-sm mt-3"
          >
            {verifyBusy ? "…" : t("resendVerificationEmail")}
          </button>
        </div>
      ) : (
        <div className="vs-status-panel-ok">
          <p className="text-sm text-ink">{t("emailVerifiedHint")}</p>
        </div>
      )}

      <div className="space-y-2 border-t border-gray-200 pt-4 dark:border-gray-700">
        <p className="text-sm font-medium text-ink">{t("twoStepTitle")}</p>
        <p className="text-xs text-muted">{t("twoStepHint")}</p>
        {user?.twoStepEnabled ? (
          <div className="flex flex-wrap items-end gap-2">
            <label className="grid flex-1 gap-1 text-xs font-semibold text-muted">
              {t("twoStepPinLabel")}
              <input
                type="password"
                inputMode="numeric"
                value={disablePin}
                onChange={(e) => setDisablePin(e.target.value)}
                className="vs-input"
                autoComplete="off"
              />
            </label>
            <button
              type="button"
              disabled={busy}
              onClick={disable2Step}
              className="rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-xs font-semibold text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-100"
            >
              {busy ? "…" : t("twoStepDisable")}
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-end gap-2">
            <label className="grid flex-1 gap-1 text-xs font-semibold text-muted">
              {t("twoStepPinLabel")}
              <input
                type="password"
                inputMode="numeric"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="vs-input"
                autoComplete="new-password"
              />
            </label>
            <button
              type="button"
              disabled={busy || pin.trim().length < 4}
              onClick={savePin}
              className="vs-btn-primary-sm"
            >
              {busy ? "…" : t("twoStepEnable")}
            </button>
          </div>
        )}
      </div>
    </>
  );

  if (embedded) {
    return <div className="space-y-4">{body}</div>;
  }

  return (
    <section className="vs-settings-card space-y-4">
      <h2 className="text-sm font-semibold text-ink">{t("accountSecurityTitle")}</h2>
      {body}
    </section>
  );
}
