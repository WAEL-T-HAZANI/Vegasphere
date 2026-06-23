// @ts-nocheck
export function readLocalPref(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    if (raw === "true") return true;
    if (raw === "false") return false;
    return raw;
  } catch {
    return fallback;
  }
}

export function writeLocalPref(key, value) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, String(value));
    if (key === "vs_reduce_motion") applyReduceMotionPref();
  } catch {}
}

/** Whether chat media should load automatically (Settings → media auto-download). */
export function shouldAutoLoadMedia() {
  const pref = readLocalPref("vs_media_auto_download", "wifi");
  if (pref === "never") return false;
  if (pref === "always") return true;
  if (typeof navigator === "undefined") return true;
  try {
    const conn = navigator.connection;
    if (!conn) return true;
    if (conn.saveData) return false;
    const type = String(conn.effectiveType || "");
    return type !== "slow-2g" && type !== "2g" && type !== "3g";
  } catch {
    return true;
  }
}

/** Sync `data-reduce-motion` on <html> from localStorage. */
export function applyReduceMotionPref() {
  if (typeof document === "undefined") return;
  const on = readLocalPref("vs_reduce_motion", false) === true;
  if (on) document.documentElement.setAttribute("data-reduce-motion", "true");
  else document.documentElement.removeAttribute("data-reduce-motion");
}
