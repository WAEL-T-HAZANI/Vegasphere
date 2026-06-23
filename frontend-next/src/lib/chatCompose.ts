// @ts-nocheck

export const OUTBOX_KEY = "vegasphere_msg_outbox";

const MAX_OUTBOX_ITEMS = 40;

/* -----------------------------
 * Draft storage
 * ----------------------------- */

export const DRAFT_CHANGE_EVENT = "vegasphere:draft-change";

export function draftKey(conversationId) {
  return `vegasphere_draft_${String(conversationId)}`;
}

export function notifyDraftChange(conversationId) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(DRAFT_CHANGE_EVENT, {
      detail: { conversationId: String(conversationId || "") },
    }),
  );
}

export function parseStoredDraft(raw) {
  if (!raw) return { text: "", updatedAt: 0 };

  try {
    const parsed = JSON.parse(String(raw));

    if (parsed && typeof parsed === "object") {
      return {
        text: String(parsed.text ?? ""),
        updatedAt: Number(parsed.updatedAt ?? 0),
      };
    }
  } catch {
    // legacy plain-string draft fallback
  }

  return { text: String(raw), updatedAt: 0 };
}

export function readStoredDraft(conversationId) {
  if (typeof window === "undefined" || !conversationId) {
    return { text: "", updatedAt: 0 };
  }

  try {
    const raw = localStorage.getItem(draftKey(conversationId));
    return parseStoredDraft(raw);
  } catch {
    return { text: "", updatedAt: 0 };
  }
}

/* -----------------------------
 * Outbox (offline retry queue)
 * ----------------------------- */

export async function flushMessageOutbox(api) {
  if (typeof window === "undefined" || !api) return;

  let raw;

  try {
    raw = localStorage.getItem(OUTBOX_KEY);
  } catch {
    return;
  }

  if (!raw) return;

  let list;

  try {
    list = JSON.parse(raw);
  } catch {
    localStorage.removeItem(OUTBOX_KEY);
    return;
  }

  if (!Array.isArray(list) || list.length === 0) return;

  const remain = [];

  for (const item of list) {
    try {
      await api.post("/message/send", item.payload);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 400 || status === 401 || status === 403 || status === 404) {
        continue;
      }
      remain.push(item);
    }
  }

  try {
    localStorage.setItem(
      OUTBOX_KEY,
      JSON.stringify(remain.slice(-MAX_OUTBOX_ITEMS)),
    );
  } catch {
    // ignore quota / storage errors
  }
}

export function enqueueMessageOutbox(payload) {
  if (typeof window === "undefined") return;

  try {
    const list = JSON.parse(localStorage.getItem(OUTBOX_KEY) || "[]");

    list.push({
      payload,
      ts: Date.now(),
    });

    localStorage.setItem(
      OUTBOX_KEY,
      JSON.stringify(list.slice(-MAX_OUTBOX_ITEMS)),
    );
  } catch {
    // ignore storage errors
  }
}

/* -----------------------------
 * Mentions
 * ----------------------------- */

export function parseMentionIds(text, members, myId) {
  if (!text || !Array.isArray(members)) return [];

  const ids = [];
  const seen = new Set();
  const my = String(myId ?? "");

  const re = /@([^\s@]{1,40})/g;

  let match;

  while ((match = re.exec(text)) !== null) {
    const token = match[1]?.trim().toLowerCase();
    if (!token) continue;

    for (const mem of members) {
      const mid = String(mem?._id ?? mem);

      if (mid === my) continue;

      const name = String(mem?.name ?? "").trim();
      if (!name) continue;

      const lower = name.toLowerCase();
      const compact = lower.replace(/\s+/g, "");
      const parts = lower.split(/\s+/).filter(Boolean);

      if (
        parts.some((p) => p === token) ||
        compact === token ||
        lower === token
      ) {
        if (!seen.has(mid)) {
          seen.add(mid);
          ids.push(mid);
        }
        break;
      }
    }
  }

  return ids;
}

export function getMentionDraft(text, caret) {
  const source = String(text ?? "");
  const at = Number.isFinite(caret) && caret >= 0 ? caret : source.length;

  const left = source.slice(0, at);
  const match = left.match(/(^|\s)@([^\s@]{0,40})$/);

  if (!match) return null;

  const token = match[2] ?? "";
  const start = at - token.length - 1;

  return {
    query: token,
    start,
    end: at,
  };
}

export function applyMentionSuggestion(text, caret, label) {
  const draft = getMentionDraft(text, caret);

  if (!draft) {
    return {
      text: String(text ?? ""),
      caret: Number(caret) || 0,
    };
  }

  const source = String(text ?? "");

  const token =
    "@" +
    String(label ?? "")
      .trim()
      .replace(/\s+/g, "");

  const needsSpace =
    source[draft.end] !== " " && source[draft.end] !== undefined;

  const inserted = needsSpace ? `${token} ` : token;

  const nextText =
    source.slice(0, draft.start) + inserted + source.slice(draft.end);

  return {
    text: nextText,
    caret: draft.start + inserted.length,
  };
}

/* -----------------------------
 * Utils
 * ----------------------------- */

export function firstHttpUrl(text) {
  const m = String(text ?? "").match(/https?:\/\/[^\s<>"']{4,2000}/i);

  return m ? m[0].replace(/[),.;]+$/, "") : "";
}
