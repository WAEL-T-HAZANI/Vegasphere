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
