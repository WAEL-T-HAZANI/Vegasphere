const { ApiError } = require("../../services/http-error.js");
const crypto = require("crypto");

const User = require("../../models/User.js");
const {
  sendVerificationEmail,
  isSmtpConfigured,
} = require("../../services/mailer.js");
const { hashResetToken } = require("./helpers.js");

const VERIFY_OK = {
  message:
    "If your account exists and is unverified, a new verification email was sent.",
};

async function issueVerificationToken(user) {
  const rawToken = crypto.randomBytes(32).toString("hex");
  user.emailVerifyTokenHash = hashResetToken(rawToken);
  user.emailVerifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await user.save();
  return rawToken;
}

async function sendVerifyMail(user, rawToken) {
  const base = (
    process.env.PUBLIC_APP_URL || "http://localhost:3000"
  ).replace(/\/$/, "");
  const verifyUrl = `${base}/verify-email?token=${encodeURIComponent(rawToken)}`;

  if (isSmtpConfigured()) {
    try {
      await sendVerificationEmail({
        to: user.email,
        verifyUrl,
        userName: user.name,
      });
      return true;
    } catch (err) {
      console.error("sendVerifyMail failed:", err?.message || err);
      if (process.env.EMAIL_VERIFY_DEBUG === "1") {
        return { debugVerifyToken: rawToken, verifyUrl };
      }
      throw err;
    }
  }
  if (process.env.EMAIL_VERIFY_DEBUG === "1") {
    return { debugVerifyToken: rawToken, verifyUrl };
  }
  return false;
}

const verifyEmail = async (req, res) => {
  const token = String(req.body?.token || "").trim();
  if (!token) {
    throw ApiError.badRequest("token required");
  }
  const hash = hashResetToken(token);
  const user = await User.findOne({
    emailVerifyTokenHash: hash,
    emailVerifyExpires: { $gt: new Date() },
  }).select("+emailVerifyTokenHash +emailVerifyExpires");
  if (!user) {
    throw ApiError.badRequest("Invalid or expired verification link.");
  }
  user.emailVerified = true;
  user.emailVerifyTokenHash = "";
  user.emailVerifyExpires = null;
  await user.save();
  return res.json({ ok: true, message: "Email verified." });
};

const resendVerificationEmail = async (req, res) => {
  const user = await User.findById(req.user.id).select(
    "+emailVerifyTokenHash +emailVerifyExpires email emailVerified name",
  );
  if (!user) throw ApiError.notFound("User not found");
  if (user.emailVerified) {
    return res.json({ ok: true, message: "Email already verified." });
  }
  const rawToken = await issueVerificationToken(user);
  const sent = await sendVerifyMail(user, rawToken);
  if (sent && typeof sent === "object" && sent.debugVerifyToken) {
    return res.json({ ...VERIFY_OK, ...sent });
  }
  return res.json(VERIFY_OK);
};

module.exports = {
  verifyEmail,
  resendVerificationEmail,
  issueVerificationToken,
  sendVerifyMail,
};
