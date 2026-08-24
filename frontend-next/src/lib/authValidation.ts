import type { TFunction } from "i18next";

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(String(email || "").trim().toLowerCase());
}

/** Client-side email field error, or undefined when valid. */
export function validateEmailField(
  email: string,
  t: TFunction,
  emptyKey = "emailRequired",
): string | undefined {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return t(emptyKey);
  if (!isValidEmail(normalized)) return t("emailInvalidError");
  return undefined;
}

export type PasswordChangeFieldErrors = {
  oldPassword?: string;
  newPassword?: string;
};

/** Inline errors for account password change (current + new). */
export function validatePasswordChange(
  oldPassword: string,
  newPassword: string,
  t: TFunction,
): PasswordChangeFieldErrors {
  const errors: PasswordChangeFieldErrors = {};
  const old = String(oldPassword || "");
  const next = String(newPassword || "");

  if (!old.trim()) {
    errors.oldPassword = t("settingsCurrentPasswordRequired");
  } else if (old.length < 8) {
    errors.oldPassword = t("passwordMinLengthError");
  }

  if (!next.trim()) {
    errors.newPassword = t("settingsNewPasswordRequired");
  } else if (next.length < 8) {
    errors.newPassword = t("passwordMinLengthError");
  } else if (old && next && old === next) {
    errors.newPassword = t("settingsPasswordSameAsOld");
  }

  return errors;
}
