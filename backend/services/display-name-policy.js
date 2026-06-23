/**
 * Display names must not contain digits (passwords may still contain numbers).
 * @param {unknown} name
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
function validateDisplayName(name) {
  if (name === undefined || name === null) return { ok: true };
  const s = String(name).trim();
  if (!s) {
    return { ok: false, error: "Name cannot be empty" };
  }
  if (/\d/.test(s)) {
    return {
      ok: false,
      error: "Display name cannot contain numbers",
    };
  }
  return { ok: true };
}

module.exports = { validateDisplayName };
