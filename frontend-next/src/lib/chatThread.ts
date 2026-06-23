// @ts-nocheck
const GROUP_WINDOW_MS = 5 * 60 * 1000;

/* -----------------------------
 * Helpers
 * ----------------------------- */

function getSenderKey(message) {
  return String(message?.senderId?._id ?? message?.senderId ?? "");
}

function getTimestampMs(message) {
  const raw = message?.createdAt;
  if (!raw) return NaN;

  const ms = new Date(raw).getTime();
  return Number.isFinite(ms) ? ms : NaN;
}

export function getMessageDayKey(message) {
  const raw = message?.createdAt;
  if (!raw) return "";

  if (typeof raw === "string") {
    const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
  }

  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "";

  return d.toISOString().slice(0, 10);
}

/* -----------------------------
 * Grouping logic
 * ----------------------------- */

export function shouldGroupMessages(a, b) {
  if (!a || !b) return false;

  const aSender = getSenderKey(a);
  const bSender = getSenderKey(b);

  if (!aSender || aSender !== bSender) return false;

  if (getMessageDayKey(a) !== getMessageDayKey(b)) return false;

  // Break grouping on structural message types
  if (
    a.replyTo ||
    b.replyTo ||
    a.forwardedFrom ||
    b.forwardedFrom ||
    a.isPinned ||
    b.isPinned
  ) {
    return false;
  }

  const aTime = getTimestampMs(a);
  const bTime = getTimestampMs(b);

  if (!Number.isFinite(aTime) || !Number.isFinite(bTime)) return false;

  return Math.abs(bTime - aTime) <= GROUP_WINDOW_MS;
}

/* -----------------------------
 * UI grouping position
 * ----------------------------- */

export function getMessageGroupPosition(messages, index) {
  const current = messages?.[index];
  if (!current) return "single";

  const prev = messages[index - 1];
  const next = messages[index + 1];

  const groupedWithPrev = shouldGroupMessages(prev, current);
  const groupedWithNext = shouldGroupMessages(current, next);

  if (groupedWithPrev && groupedWithNext) return "middle";
  if (groupedWithPrev) return "end";
  if (groupedWithNext) return "start";

  return "single";
}

/* -----------------------------
 * Thread builder
 * ----------------------------- */

export function buildChatThreadRows(messages) {
  if (!Array.isArray(messages)) return [];

  const rows = [];
  let lastDayKey = "";

  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];

    const dayKey = getMessageDayKey(message);

    if (dayKey && dayKey !== lastDayKey) {
      rows.push({
        type: "date",
        dayKey,
        id: `date-${dayKey}`,
      });

      lastDayKey = dayKey;
    }

    rows.push({
      type: "message",
      id: String(message?._id ?? `msg-${i}`),
      message,
      groupPosition: getMessageGroupPosition(messages, i),
    });
  }

  return rows;
}
