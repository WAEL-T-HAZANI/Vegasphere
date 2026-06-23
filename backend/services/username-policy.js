function normalizeUsername(raw) {
  return String(raw || "").trim().toLowerCase();
}

function validateUsername(raw) {
  const username = normalizeUsername(raw);
  if (!username) return { ok: true, value: "" };
  if (!/^[a-z][a-z0-9_]{2,19}$/.test(username)) {
    return {
      ok: false,
      error:
        "Username must start with a letter and use only lowercase letters, numbers, or underscores (3-20 chars).",
    };
  }
  if (username.endsWith("_")) {
    return {
      ok: false,
      error: "Username cannot end with an underscore.",
    };
  }
  return { ok: true, value: username };
}

module.exports = {
  normalizeUsername,
  validateUsername,
};
