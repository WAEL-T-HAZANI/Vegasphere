// @ts-nocheck
export function createClientTempId() {
  return `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function formatPresenceTimestamp(value, language) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(language || undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
