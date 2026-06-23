import { API_ORIGIN } from "@/lib/constants";

export const DEFAULT_AVATAR = "/icon.svg";

/** Vega brand wine red — used for generated avatar fallbacks (no random colors). */
export const BRAND_AVATAR_BG = "8B1E3F";
export const BRAND_AVATAR_FG = "FFFFFF";

export function resolveAvatarUrl(raw: string | undefined | null) {
  const value = String(raw || "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value) || /^data:/i.test(value)) return value;
  return `${API_ORIGIN}${value.startsWith("/") ? value : `/${value}`}`;
}

/** True when the user uploaded a file stored on this API (not ui-avatars default). */
export function isCustomAvatar(raw: string | undefined | null) {
  const value = String(raw || "").trim();
  if (!value) return false;
  if (value.includes("/uploads/avatars/")) return true;
  try {
    return new URL(value).pathname.includes("/uploads/avatars/");
  } catch {
    return false;
  }
}

/** True when a group/channel uploaded a file stored on this API. */
export function isCustomConversationAvatar(raw: string | undefined | null) {
  const value = String(raw || "").trim();
  if (!value) return false;
  if (value.includes("/uploads/conversation-avatars/")) return true;
  try {
    return new URL(value).pathname.includes("/uploads/conversation-avatars/");
  } catch {
    return false;
  }
}

export function conversationAvatarUrl(raw: string | undefined | null) {
  const value = String(raw || "").trim();
  if (!value) return "";
  return resolveAvatarUrl(value);
}

/** ui-avatars.com defaults use background=random (blue/purple/etc.) — not our palette. */
export function isGeneratedUiAvatar(raw: string | undefined | null) {
  const value = String(raw || "").trim().toLowerCase();
  if (!value) return false;
  return value.includes("ui-avatars.com");
}

/** Prefer local brand initials instead of random-color generated avatars. */
export function shouldUseLocalAvatarFallback(raw: string | undefined | null) {
  const value = String(raw || "").trim();
  if (!value) return true;
  return isGeneratedUiAvatar(value);
}

export function brandDefaultAvatarUrl(name: string) {
  const safeName = encodeURIComponent(String(name || "V").trim() || "V");
  return `https://ui-avatars.com/api/?name=${safeName}&background=${BRAND_AVATAR_BG}&color=${BRAND_AVATAR_FG}&bold=true`;
}
