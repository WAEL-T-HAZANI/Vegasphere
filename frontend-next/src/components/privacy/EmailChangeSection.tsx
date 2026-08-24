"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import { formatApiError, mapPasswordChangeApiError } from "@/lib/apiError";
import { validateEmailField } from "@/lib/authValidation";
import { showAuthErrorToast, showAuthSuccessToast } from "@/lib/authToast";
import AuthField from "@/components/ui/AuthField";
import type { User } from "@/types";

type EmailChangeSectionProps = {
  user: User | null | undefined;
  onUserRefresh: () => Promise<void>;
};

export default function EmailChangeSection({
  user,
  onUserRefresh,
}: EmailChangeSectionProps) {
  const { t } = useTranslation();
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedEmail = newEmail.trim().toLowerCase();
    const nextErrors: { email?: string; password?: string } = {};

    const emailError = validateEmailField(normalizedEmail, t);
    if (emailError) nextErrors.email = emailError;

    if (!password.trim()) {
      nextErrors.password = t("changeEmailPasswordRequired");
    } else if (password.length < 8) {
      nextErrors.password = t("passwordMinLengthError");
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setBusy(true);
    try {
      const { data } = await api.put("/user/update", {
        email: normalizedEmail,
        oldpassword: password,
      });
      setNewEmail("");
      setPassword("");
      await onUserRefresh();
      const hint =
        data && typeof data === "object" && "debugVerifyToken" in data
          ? String((data as { debugVerifyToken?: string }).debugVerifyToken || "")
          : "";
      showAuthSuccessToast(
        hint
          ? t("changeEmailVerifyDevToken", { token: hint })
          : t("changeEmailSuccess"),
        "auth-success",
      );
    } catch (err) {
      const mapped = mapPasswordChangeApiError(err, t);
      if (mapped.oldPassword) {
        setErrors({ password: mapped.oldPassword });
        return;
      }
      const message = formatApiError(err, t);
      const lower = message.toLowerCase();
      if (lower.includes("email")) {
        setErrors({ email: message });
        return;
      }
      showAuthErrorToast(mapped.toast || message, "auth-error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={save} noValidate className="grid gap-3">
      <p className="text-xs text-muted">
        {t("changeEmailCurrent", { email: user?.email || "—" })}
      </p>
      <AuthField
        id="change-email-new"
        label={t("changeEmailNewLabel")}
        type="email"
        autoComplete="email"
        value={newEmail}
        onChange={(value) => {
          setNewEmail(value);
          if (errors.email) {
            setErrors((prev) => {
              const next = { ...prev };
              delete next.email;
              return next;
            });
          }
        }}
        placeholder={t("changeEmailNewPlaceholder")}
        error={errors.email}
        compact
      />
      <AuthField
        id="change-email-password"
        label={t("changeEmailPasswordLabel")}
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(value) => {
          setPassword(value);
          if (errors.password) {
            setErrors((prev) => {
              const next = { ...prev };
              delete next.password;
              return next;
            });
          }
        }}
        placeholder={t("settingsCurrentPassword")}
        error={errors.password}
        compact
      />
      <button type="submit" disabled={busy} className="vs-btn-primary">
        {busy ? "…" : t("changeEmailSave")}
      </button>
    </form>
  );
}
