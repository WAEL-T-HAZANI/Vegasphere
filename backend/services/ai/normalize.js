const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
const LATIN_RE = /[A-Za-z]/;

const ARABIZI_MAP = {
  "2": "أ",
  "3": "ع",
  "5": "خ",
  "6": "ط",
  "7": "ح",
  "8": "ق",
  "9": "ص",
};

function normalizeWhitespace(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function foldArabizi(value) {
  let out = String(value || "");
  for (const [digit, ch] of Object.entries(ARABIZI_MAP)) {
    out = out.replace(new RegExp(digit, "g"), ch);
  }
  return out;
}

function normalizeKey(value) {
  return normalizeWhitespace(foldArabizi(value))
    .toLowerCase()
    .replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, "")
    .replace(/'/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeLookupKey(value) {
  const key = normalizeKey(value);
  return key.replace(/[.!?؟،؛:]+$/g, "").trim();
}

function expandContractions(text) {
  let out = String(text || "").toLowerCase();
  const rules = [
    [/\bwon't\b/g, "will not"],
    [/\bcan't\b/g, "can not"],
    [/\bshan't\b/g, "shall not"],
    [/\bain't\b/g, "am not"],
    [/\bi'm\b/g, "i am"],
    [/\bi've\b/g, "i have"],
    [/\bi'll\b/g, "i will"],
    [/\bi'd\b/g, "i would"],
    [/\byou're\b/g, "you are"],
    [/\byou've\b/g, "you have"],
    [/\byou'll\b/g, "you will"],
    [/\byou'd\b/g, "you would"],
    [/\bhe's\b/g, "he is"],
    [/\bhe'll\b/g, "he will"],
    [/\bshe's\b/g, "she is"],
    [/\bshe'll\b/g, "she will"],
    [/\bit's\b/g, "it is"],
    [/\bit'll\b/g, "it will"],
    [/\bwe're\b/g, "we are"],
    [/\bwe've\b/g, "we have"],
    [/\bwe'll\b/g, "we will"],
    [/\bthey're\b/g, "they are"],
    [/\bthey've\b/g, "they have"],
    [/\bthey'll\b/g, "they will"],
    [/\bdon't\b/g, "do not"],
    [/\bdoesn't\b/g, "does not"],
    [/\bdidn't\b/g, "did not"],
    [/\bisn't\b/g, "is not"],
    [/\baren't\b/g, "are not"],
    [/\bwasn't\b/g, "was not"],
    [/\bweren't\b/g, "were not"],
    [/\bhaven't\b/g, "have not"],
    [/\bhasn't\b/g, "has not"],
    [/\bhadn't\b/g, "had not"],
    [/\bshouldn't\b/g, "should not"],
    [/\bcouldn't\b/g, "could not"],
    [/\bwouldn't\b/g, "would not"],
    [/\bmustn't\b/g, "must not"],
    [/\blet's\b/g, "let us"],
    [/\b(\w+)n't\b/g, "$1 not"],
  ];
  for (const [rx, rep] of rules) {
    out = out.replace(rx, rep);
  }
  return normalizeWhitespace(out);
}

function prepareTranslateInput(text) {
  return expandContractions(normalizeWhitespace(text));
}

function detectScript(text) {
  const value = String(text || "");
  const hasAr = ARABIC_RE.test(value);
  const hasEn = LATIN_RE.test(value);
  if (hasAr && !hasEn) return "ar";
  if (hasEn && !hasAr) return "en";
  if (hasAr && hasEn) return "mixed";
  return "unknown";
}

function wordCount(key) {
  return key ? key.split(/\s+/).filter(Boolean).length : 0;
}

function isMeSender(sender) {
  const role = String(sender || "").toLowerCase();
  return ["me", "user", "assistant"].includes(role);
}

module.exports = {
  normalizeWhitespace,
  normalizeKey,
  normalizeLookupKey,
  expandContractions,
  prepareTranslateInput,
  detectScript,
  wordCount,
  isMeSender,
  ARABIC_RE,
};
