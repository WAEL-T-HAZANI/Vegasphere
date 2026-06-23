const crypto = require("crypto");

const { JWT_SECRET } = require("../../config/env.js");

function normalizePhoneInput(raw) {
  const v = String(raw ?? "").trim();
  if (!v) return "";
  if (!/^\+[1-9]\d{1,14}$/.test(v)) return null;
  return v;
}

function normalizeEnum(raw, allowed) {
  const v = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (!v) return "";
  return allowed.includes(v) ? v : null;
}

function hashResetToken(raw) {
  return crypto.createHash("sha256").update(String(raw), "utf8").digest("hex");
}

const FORGOT_OK = {
  message:
    "If an account exists for this email, password reset instructions were sent (check your inbox and spam).",
};

module.exports = {
  JWT_SECRET,
  normalizePhoneInput,
  normalizeEnum,
  hashResetToken,
  FORGOT_OK,
};
