/**
 * Multilingual search helpers — Unicode NFC, Arabic diacritic/letter folding,
 * and flexible regex patterns compatible with MongoDB PCRE2 (no \u escapes).
 */

const TASHKEEL_RE = /[\u0610-\u061A\u064B-\u065F\u0670\u0640\u06D6-\u06ED]/g;
const CJK_RE = /[\u3040-\u30FF\u4E00-\u9FFF\uAC00-\uD7AF]/;

function charClassFromCodePoints(codePoints) {
  let body = "";
  for (const cp of codePoints) {
    const ch = String.fromCodePoint(cp);
    if (ch === "]" || ch === "\\" || ch === "-" || ch === "^") {
      body += `\\${ch}`;
    } else {
      body += ch;
    }
  }
  return `[${body}]`;
}

function charClassFromRanges(ranges) {
  const points = [];
  for (const [start, end] of ranges) {
    for (let cp = start; cp <= end; cp += 1) points.push(cp);
  }
  return charClassFromCodePoints(points);
}

/** Literal Unicode chars — safe for MongoDB $regex (no \\u sequences). */
const OPTIONAL_DIACRITICS =
  `${charClassFromRanges([
    [0x0610, 0x061a],
    [0x064b, 0x065f],
    [0x06d6, 0x06ed],
  ])}${charClassFromCodePoints([0x0670, 0x0640])}*`;

const ALEF_CLASS = charClassFromCodePoints([
  0x0627, 0x0671, 0x0623, 0x0625, 0x0622, 0x0672, 0x0673, 0x0675, 0x0677, 0x0678,
]);
const YAA_CLASS = charClassFromCodePoints([0x064a, 0x0649, 0x06cc, 0x06d2]);
const TAA_MARBUTA_CLASS = charClassFromCodePoints([0x0629, 0x0647]);

function normalizeForSearch(text) {
  return String(text || "")
    .normalize("NFC")
    .replace(TASHKEEL_RE, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegexChar(ch) {
  return ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildFlexiblePattern(normalizedQuery) {
  const lower = normalizedQuery.toLocaleLowerCase("en");
  let pattern = "";
  for (const ch of lower) {
    if (ch >= "a" && ch <= "z") {
      pattern += `[${ch}${ch.toUpperCase()}]`;
    } else if (ch === "ا") {
      pattern += ALEF_CLASS + OPTIONAL_DIACRITICS;
    } else if (ch === "ي") {
      pattern += YAA_CLASS + OPTIONAL_DIACRITICS;
    } else if (ch === "ة") {
      pattern += TAA_MARBUTA_CLASS + OPTIONAL_DIACRITICS;
    } else if (/[\u0600-\u06FF]/.test(ch)) {
      pattern += escapeRegexChar(ch) + OPTIONAL_DIACRITICS;
    } else {
      pattern += escapeRegexChar(ch);
    }
  }
  return pattern;
}

function graphemeCount(text) {
  return [...String(text || "")].length;
}

function isSearchQueryLongEnough(query) {
  const normalized = normalizeForSearch(query);
  const count = graphemeCount(normalized);
  if (!count) return false;
  if (CJK_RE.test(normalized)) return count >= 1;
  return count >= 2;
}

function makeSearchRegex(query) {
  const normalized = normalizeForSearch(query);
  if (!isSearchQueryLongEnough(normalized)) return null;
  const pattern = buildFlexiblePattern(normalized);
  if (!pattern) return null;
  return new RegExp(pattern, "i");
}

function matchesSearchText(haystack, query) {
  const needle = normalizeForSearch(query).toLocaleLowerCase("en");
  if (!isSearchQueryLongEnough(query) || !needle) return false;
  const hay = normalizeForSearch(haystack).toLocaleLowerCase("en");
  if (hay.includes(needle)) return true;
  const regex = makeSearchRegex(query);
  return regex ? regex.test(String(haystack || "").normalize("NFC")) : false;
}

module.exports = {
  normalizeForSearch,
  isSearchQueryLongEnough,
  makeSearchRegex,
  matchesSearchText,
  buildFlexiblePattern,
};
