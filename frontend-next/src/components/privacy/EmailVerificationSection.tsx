"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import { formatApiError } from "@/lib/apiError";
import { showAuthErrorToast, showAuthSuccessToast } from "@/lib/authToast";
import { cn } from "@/lib/classNames";
import type { User } from "@/types";

type EmailVerificationSectionProps = {
  user: User | null | undefined;
};

export default function EmailVerificationSection({
  user,
}: EmailVerificationSectionProps) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);

  const resend = async () => {
    setBusy(true);
    try {
      const { data } = await api.post("/auth/resend-verification", {});
      const hint =
        data && typeof data === "object" && "debugVerifyToken" in data
          ? String((data as { debugVerifyToken?: string }).debugVerifyToken || "")
          : "";
      showAuthSuccessToast(
        hint
          ? t("verifyEmailDevToken", { token: hint })
          : t("verifyEmailResent"),
        "auth-success",
      );
    } catch (e) {
      showAuthErrorToast(formatApiError(e, t, "verifyEmailResendFailed"), "auth-error");
    } finally {
      setBusy(false);
    }
  };

  const verified = Boolean(user?.emailVerified);

  return (
    <div
      className={cn(
        verified ? "vs-status-panel-ok" : "vs-status-panel-pending",
      )}
    >
      <p className="text-sm text-ink">
        {verified ? t("emailVerifiedHint") : t("emailNotVerifiedHint")}
      </p>
      {!verified ? (
        <button
          type="button"
          disabled={busy}
          onClick={resend}
          className="vs-btn-primary-sm mt-3"
        >
          {busy ? "…" : t("resendVerificationEmail")}
        </button>
      ) : null}
    </div>
  );
}
