// @ts-nocheck
const DEFAULT_PATH = "/chats";

export function getSafeNextPath(raw) {
  if (typeof raw !== "string") return DEFAULT_PATH;

  const value = raw.trim();

  // Must start with a single slash
  if (!value.startsWith("/") || value.startsWith("//")) {
    return DEFAULT_PATH;
  }

  // Block obvious protocol injections
  if (/[a-zA-Z]+:/.test(value)) {
    return DEFAULT_PATH;
  }

  // Optional extra safety: block backslashes
  if (value.includes("\\")) {
    return DEFAULT_PATH;
  }

  return value || DEFAULT_PATH;
}
