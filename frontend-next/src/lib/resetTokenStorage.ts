/** Short-lived reset token passed from forgot-password → reset-password (same tab). */
export const RESET_TOKEN_STORAGE_KEY = "vega_reset_token";

export function readResetTokenFromStorage(): string {
  if (typeof window === "undefined") return "";
  try {
    return String(sessionStorage.getItem(RESET_TOKEN_STORAGE_KEY) || "").trim();
  } catch {
    return "";
  }
}

export function writeResetTokenToStorage(token: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(RESET_TOKEN_STORAGE_KEY, token);
  } catch {
    /* private mode / quota */
  }
}

export function clearResetTokenFromStorage(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(RESET_TOKEN_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
