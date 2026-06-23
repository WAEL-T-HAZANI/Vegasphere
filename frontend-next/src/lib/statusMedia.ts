import { API_ORIGIN } from "./constants";

/** Resolve a status image path from the API to a browser-loadable URL. */
export function resolveStatusImageUrl(raw: string | null | undefined): string {
  const value = String(raw || "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value) || /^data:/i.test(value)) return value;
  if (value.startsWith("/")) return `${API_ORIGIN}${value}`;
  return `${API_ORIGIN}/${value}`;
}

export function statusInitials(label: string): string {
  return String(label || "V")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase();
}

export function formatStatusExpiry(
  expiresAt: string | Date | null | undefined,
  t: (_key: string, _opts?: Record<string, unknown>) => string,
): string {
  if (!expiresAt) return "";
  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) return "";
  const diffMs = date.getTime() - Date.now();
  if (diffMs <= 0) return t("statusExpired");
  const hours = Math.ceil(diffMs / (60 * 60 * 1000));
  return t("statusExpiresIn", { hours });
}
