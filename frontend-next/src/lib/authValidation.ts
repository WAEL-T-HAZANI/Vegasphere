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
