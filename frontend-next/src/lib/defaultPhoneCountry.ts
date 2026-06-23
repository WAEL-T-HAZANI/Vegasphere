import type { Country } from "react-phone-number-input";

/** Default phone country from UI language (empty phone only). */
export function getDefaultPhoneCountry(language: string | undefined): Country {
  const lang = String(language || "en").toLowerCase();
  if (lang.startsWith("ar")) return "SA";
  if (lang.startsWith("fr")) return "FR";
  if (lang.startsWith("de")) return "DE";
  if (lang.startsWith("es")) return "ES";
  if (lang.startsWith("tr")) return "TR";
  return "US";
}
