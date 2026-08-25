/** Matches backend `services/phone-hash.js` (sha256 of digits-only phone). */

import { parsePhoneNumberFromString } from "libphonenumber-js";

const BIDI_RE = /[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g;

export function toWesternDigits(s: string): string {
  return String(s || "")
    .replace(/[\u0660-\u0669]/g, (ch) => String(ch.charCodeAt(0) - 0x0660))
    .replace(/[\u06F0-\u06F9]/g, (ch) => String(ch.charCodeAt(0) - 0x06F0));
}

export function stripBidi(s: string): string {
  return String(s || "").replace(BIDI_RE, "");
}

export function normalizePhoneInput(phone: string): string {
  return stripBidi(toWesternDigits(phone)).trim();
}

export function digitsOnly(phone: string): string {
  return normalizePhoneInput(phone).replace(/\D/g, "");
}

export function isPhoneLikeQuery(q: string): boolean {
  const raw = normalizePhoneInput(q);
  if (!raw) return false;
  const digits = digitsOnly(raw);
  if (digits.length < 4) return false;
  return /^[+]?[\d\s().-]+$/.test(raw);
}

export async function phoneHashFromInput(phone: string): Promise<string> {
  const d = digitsOnly(phone);
  if (!d || typeof crypto === "undefined" || !crypto.subtle) return "";
  const buf = new TextEncoder().encode(d);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(hash)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Hash variants for pasted/local formats vs stored E.164 digits. */
export async function phoneHashCandidatesFromInput(
  phone: string,
): Promise<string[]> {
  const raw = normalizePhoneInput(phone);
  const d = digitsOnly(raw);
  if (!d) return [];

  const set = new Set<string>();
  const add = async (value: string) => {
    const h = await phoneHashFromInput(value);
    if (h) set.add(h);
  };

  await add(d);

  const noLead = d.replace(/^0+/, "");
  if (noLead && noLead !== d) await add(noLead);

  if (d.startsWith("00") && d.length > 4) await add(d.slice(2));

  for (const candidate of [raw, raw.startsWith("+") ? raw : `+${d}`, `+${d}`]) {
    try {
      const parsed = parsePhoneNumberFromString(candidate);
      if (parsed?.isValid()) await add(parsed.number);
    } catch {
      /* ignore invalid parse */
    }
  }

  if (/^0[1-9]\d{7,12}$/.test(d)) {
    for (const cc of [
      "966", "971", "962", "963", "965", "973", "968", "974", "961", "970",
      "20", "1", "44",
    ]) {
      await add(`${cc}${d.slice(1)}`);
    }
  }

  return [...set];
}
