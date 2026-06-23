"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import { formatApiError } from "@/lib/apiError";
import { showAuthErrorToast, showAuthSuccessToast } from "@/lib/authToast";
import type { User } from "@/types";

type TwoStepSectionProps = {
  user: User | null | undefined;
  onUserRefresh: () => Promise<void>;
};

export default function TwoStepSection({
  user,
  onUserRefresh,
}: TwoStepSectionProps) {
  const { t } = useTranslation();
  const [pin, setPin] = useState("");
  const [disablePin, setDisablePin] = useState("");
  const [busy, setBusy] = useState(false);

  const savePin = async () => {
    const trimmed = pin.trim();
    if (trimmed.length < 4) {
      showAuthErrorToast(t("twoStepPinRequired"), "auth-error");
      return;
    }
    setBusy(true);
    try {
      await api.put("/auth/2step/pin", { pin: trimmed });
      setPin("");
      await onUserRefresh();
      showAuthSuccessToast(t("twoStepEnabledToast"), "auth-success");
    } catch (e) {
      showAuthErrorToast(formatApiError(e, t, "twoStepSaveFailed"), "auth-error");
    } finally {
      setBusy(false);
    }
  };

  const disable2Step = async () => {
    const trimmed = disablePin.trim();
    if (!trimmed) {
      showAuthErrorToast(t("twoStepPinRequired"), "auth-error");
      return;
    }
    setBusy(true);
    try {
      await api.delete("/auth/2step", { data: { pin: trimmed } });
      setDisablePin("");
      await onUserRefresh();
      showAuthSuccessToast(t("twoStepDisabledToast"), "auth-success");
    } catch (e) {
      showAuthErrorToast(formatApiError(e, t, "twoStepDisableFailed"), "auth-error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">{t("twoStepHint")}</p>
      {user?.twoStepEnabled ? (
        <div className="flex flex-wrap items-end gap-2">
          <label className="grid min-w-[10rem] flex-1 gap-1.5 text-xs font-semibold text-muted">
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
            className="rounded-xl border border-red-300 bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-100"
          >
            {busy ? "…" : t("twoStepDisable")}
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-end gap-2">
          <label className="grid min-w-[10rem] flex-1 gap-1.5 text-xs font-semibold text-muted">
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
            className="vs-btn-primary-sm px-5 py-2.5"
          >
            {busy ? "…" : t("twoStepEnable")}
          </button>
        </div>
      )}
    </div>
  );
}
