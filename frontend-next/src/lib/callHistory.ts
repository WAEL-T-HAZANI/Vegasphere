// @ts-nocheck
export function formatRelative(dateValue, locale = "en") {
  if (!dateValue) return "";
  const date = new Date(dateValue);
  const diffMs = date.getTime() - Date.now();
  const formatter = new Intl.RelativeTimeFormat(
    locale.startsWith("ar") ? "ar" : "en",
    { numeric: "auto" }
  );
  const sec = Math.round(diffMs / 1000);
  const min = Math.round(sec / 60);
  const hour = Math.round(min / 60);
  const day = Math.round(hour / 24);
  if (Math.abs(sec) < 60) return formatter.format(sec, "second");
  if (Math.abs(min) < 60) return formatter.format(min, "minute");
  if (Math.abs(hour) < 24) return formatter.format(hour, "hour");
  return formatter.format(day, "day");
}

export function formatDuration(totalSec) {
  const sec = Math.max(0, Number(totalSec || 0));
  const mins = Math.floor(sec / 60);
  const rem = sec % 60;
  return `${mins}:${String(rem).padStart(2, "0")}`;
}

export function isSoon(dateValue, windowMinutes = 15) {
  if (!dateValue) return false;
  const ts = new Date(dateValue).getTime();
  if (!Number.isFinite(ts)) return false;
  const diff = ts - Date.now();
  return diff > 0 && diff <= windowMinutes * 60 * 1000;
}

export function deriveDirection(item, meId) {
  if (!item?.initiatorId?._id || !meId) return "missed";
  if (item.status === "missed") {
    return item.initiatorId._id === meId ? "outgoing" : "missed";
  }
  return item.initiatorId._id === meId ? "outgoing" : "incoming";
}

export function deriveOutcome(item) {
  switch (item?.status) {
    case "declined":
      return "declined";
    case "cancelled":
      return "cancelled";
    case "active":
    case "ringing":
      return "ongoing";
    case "completed":
      return "completed";
    case "missed":
    default:
      return "missed";
  }
}
