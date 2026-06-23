/** Matches backend `services/phone-hash.js` (sha256 of digits-only phone). */

export function digitsOnly(phone: string): string {
  return String(phone || "").replace(/\D/g, "");
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
