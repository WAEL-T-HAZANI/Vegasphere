/** Matches backend profile/auth validators. */
export const PROFILE_NAME_MIN_LENGTH = 3;
export const PROFILE_NAME_MAX_LENGTH = 24;
export const PROFILE_USERNAME_MIN_LENGTH = 3;
export const PROFILE_USERNAME_MAX_LENGTH = 20;
export const PROFILE_ABOUT_MAX_LENGTH = 300;

export const PROFILE_USERNAME_PATTERN = /^[a-z0-9_]+$/i;

export function normalizeProfileUsername(raw: string) {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .slice(0, PROFILE_USERNAME_MAX_LENGTH);
}

export function validateProfileName(name: string, t: (key: string) => string) {
  const trimmed = String(name || "").trim();
  if (trimmed.length < PROFILE_NAME_MIN_LENGTH) {
    return t("nameMinLengthError");
  }
  if (trimmed.length > PROFILE_NAME_MAX_LENGTH) {
    return t("nameMaxLengthError");
  }
  if (/\d/.test(trimmed)) {
    return t("nameNoDigitsError");
  }
  return "";
}

export function validateProfileUsername(username: string, t: (key: string) => string) {
  const trimmed = normalizeProfileUsername(username);
  if (!trimmed) return "";
  if (trimmed.length < PROFILE_USERNAME_MIN_LENGTH) {
    return t("usernameMinLengthError");
  }
  if (trimmed.length > PROFILE_USERNAME_MAX_LENGTH) {
    return t("usernameMaxLengthError");
  }
  if (!PROFILE_USERNAME_PATTERN.test(trimmed)) {
    return t("usernameInvalidError");
  }
  return "";
}
