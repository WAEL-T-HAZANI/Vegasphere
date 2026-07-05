/** Client-side search query rules (mirrors backend/services/search-normalize.js). */

const TASHKEEL_RE = /[\u0610-\u061A\u064B-\u065F\u0670\u0640\u06D6-\u06ED]/g;
const CJK_RE = /[\u3040-\u30FF\u4E00-\u9FFF\uAC00-\uD7AF]/;

export function normalizeSearchQuery(text: string): string {
  return String(text || "")
    .normalize("NFC")
    .replace(TASHKEEL_RE, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^@+/, "");
}

export function searchGraphemeCount(text: string): number {
  return [...normalizeSearchQuery(text)].length;
}

/** True when the query is long enough to hit the API (CJK: 1+, others: 2+). */
export function isSearchQueryLongEnough(query: string): boolean {
  const normalized = normalizeSearchQuery(query);
  const count = searchGraphemeCount(normalized);
  if (!count) return false;
  if (CJK_RE.test(normalized)) return count >= 1;
  return count >= 2;
}

export function isSearchQueryTooShort(query: string): boolean {
  const trimmed = String(query || "").trim();
  if (!trimmed) return false;
  return !isSearchQueryLongEnough(trimmed);
}

export function findOriginalSearchMatchRange(
  source: string,
  query: string,
): [number, number] | null {
  const src = String(source || "");
  const needle = normalizeSearchQuery(query).toLocaleLowerCase("en");
  if (!src || !needle || !isSearchQueryLongEnough(query)) return null;

  const normChars: string[] = [];
  const normToOrigStart: number[] = [];
  for (let i = 0; i < src.length; i += 1) {
    const folded = normalizeSearchQuery(src[i]).toLocaleLowerCase("en");
    for (const ch of folded) {
      normChars.push(ch);
      normToOrigStart.push(i);
    }
  }

  const hay = normChars.join("");
  const idx = hay.indexOf(needle);
  if (idx < 0) return null;

  const start = normToOrigStart[idx] ?? 0;
  const endMark = normToOrigStart[idx + needle.length - 1] ?? start;
  return [start, endMark + 1];
}

export function matchesSearchText(haystack: string, query: string): boolean {
  const needle = normalizeSearchQuery(query).toLocaleLowerCase("en");
  if (!isSearchQueryLongEnough(query) || !needle) return false;
  const hay = normalizeSearchQuery(haystack).toLocaleLowerCase("en");
  return hay.includes(needle);
}

function messageSearchHaystack(
  message: { _id?: string; text?: string; fileName?: string; e2eVersion?: number },
  decryptedById: Record<string, string> = {},
) {
  const parts: string[] = [];
  if (Number(message?.e2eVersion) > 0) {
    parts.push(String(decryptedById[String(message._id || "")] || ""));
  } else {
    parts.push(String(message?.text || ""));
  }
  parts.push(String(message?.fileName || ""));
  return parts.filter(Boolean).join(" ");
}

export function searchLoadedMessages(
  messages: Array<{ _id?: string; text?: string; fileName?: string; e2eVersion?: number; deletedForEveryone?: boolean; createdAt?: string }>,
  query: string,
  decryptedById: Record<string, string> = {},
) {
  const q = String(query || "").trim();
  if (!q || !isSearchQueryLongEnough(q) || !Array.isArray(messages)) return [];
  return messages.filter((message) => {
    if (message?.deletedForEveryone) return false;
    return matchesSearchText(messageSearchHaystack(message, decryptedById), q);
  });
}

export function mergeSearchResults<T extends { _id?: string; createdAt?: string }>(
  primary: T[],
  secondary: T[],
) {
  const seen = new Set<string>();
  const merged: T[] = [];
  for (const item of [...primary, ...secondary]) {
    const id = String(item?._id || "");
    if (!id || seen.has(id)) continue;
    seen.add(id);
    merged.push(item);
  }
  return merged.sort((a, b) => {
    const aTime = new Date(a?.createdAt || 0).getTime();
    const bTime = new Date(b?.createdAt || 0).getTime();
    return bTime - aTime;
  });
}

export function parseMessageSearchResponse(data: unknown) {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object" && Array.isArray((data as { messages?: unknown[] }).messages)) {
    return (data as { messages: unknown[] }).messages;
  }
  return [];
}
