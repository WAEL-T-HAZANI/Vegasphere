const crypto = require("crypto");

const BIDI_RE = /[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g;

function toWesternDigits(s) {
  return String(s || "")
    .replace(/[\u0660-\u0669]/g, (ch) => String(ch.charCodeAt(0) - 0x0660))
    .replace(/[\u06F0-\u06F9]/g, (ch) => String(ch.charCodeAt(0) - 0x06F0));
}

function stripBidi(s) {
  return String(s || "").replace(BIDI_RE, "");
}

function normalizePhoneInput(phone) {
  return stripBidi(toWesternDigits(phone)).trim();
}

function digitsOnly(s) {
  return normalizePhoneInput(s).replace(/\D/g, "");
}

/** sha256 hex of digits-only string (contact matching). */
function phoneHashFromInput(phone) {
  const d = digitsOnly(phone);
  if (!d) return "";
  return crypto.createHash("sha256").update(d, "utf8").digest("hex");
}

function isPhoneLikeQuery(q) {
  const raw = normalizePhoneInput(q);
  if (!raw) return false;
  const digits = digitsOnly(raw);
  if (digits.length < 4) return false;
  return /^[+]?[\d\s().-]+$/.test(raw);
}

/** Hash variants for pasted/local formats vs stored E.164 digits. */
function phoneHashCandidatesFromQuery(phone) {
  const raw = normalizePhoneInput(phone);
  const d = digitsOnly(raw);
  if (!d) return [];

  const set = new Set();
  const add = (value) => {
    const h = phoneHashFromInput(value);
    if (h) set.add(h);
  };

  add(d);

  const noLead = d.replace(/^0+/, "");
  if (noLead && noLead !== d) add(noLead);

  if (d.startsWith("00") && d.length > 4) add(d.slice(2));

  // Local leading-zero numbers -> common E.164 country codes (digits-only hash).
  if (/^0[1-9]\d{7,12}$/.test(d)) {
    for (const cc of [
      "966", "971", "962", "963", "965", "973", "968", "974", "961", "970",
      "20", "1", "44",
    ]) {
      add(`${cc}${d.slice(1)}`);
    }
  }

  return [...set];
}

module.exports = {
  digitsOnly,
  normalizePhoneInput,
  phoneHashFromInput,
  isPhoneLikeQuery,
  phoneHashCandidatesFromQuery,
};
