"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import { formatApiError } from "@/lib/apiError";
import { showAuthErrorToast, showAuthSuccessToast } from "@/lib/authToast";
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

  const save = async (e) => {
    e.preventDefault();
    const email = newEmail.trim().toLowerCase();
    if (!email) {
      showAuthErrorToast(t("emailRequired"), "auth-error");
      return;
    }
    if (!password) {
      showAuthErrorToast(t("changeEmailPasswordRequired"), "auth-error");
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.put("/user/update", {
        email,
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
      showAuthErrorToast(formatApiError(err, t), "auth-error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={save} className="grid gap-3">
      <p className="text-xs text-muted">
        {t("changeEmailCurrent", { email: user?.email || "—" })}
      </p>
      <label className="grid gap-1.5 text-xs font-semibold text-muted">
        {t("changeEmailNewLabel")}
        <input
          type="email"
          autoComplete="email"
          className="vs-input"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          placeholder={t("changeEmailNewPlaceholder")}
        />
      </label>
      <label className="grid gap-1.5 text-xs font-semibold text-muted">
        {t("changeEmailPasswordLabel")}
        <input
          type="password"
          autoComplete="current-password"
          className="vs-input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t("settingsCurrentPassword")}
        />
      </label>
      <button type="submit" disabled={busy} className="vs-btn-primary">
        {busy ? "…" : t("changeEmailSave")}
      </button>
    </form>
  );
}
