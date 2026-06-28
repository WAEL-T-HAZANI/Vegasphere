const { ApiError } = require("../../services/http-error.js");
const crypto = require("crypto");
const { hashSecret, compareSecret } = require("../../services/password-hash.js");
const { isEnvTruthy } = require("../../config/env.js");

const User = require("../../models/User.js");
const {
  sendPasswordResetEmail,
  isMailConfigured,
  formatSmtpError,
} = require("../../services/mailer.js");
const { hashResetToken, FORGOT_OK } = require("./helpers.js");

const forgotPassword = async (req, res) => {
    const email = (req.body?.email || "").trim().toLowerCase();
    if (!email) {
      throw ApiError.badRequest("Email is required");
    }
    const user = await User.findOne({ email }).select(
      "+passwordResetTokenHash +passwordResetExpires",
    );
    if (!user) {
      return res.json(FORGOT_OK);
    }
    const rawToken = crypto.randomBytes(32).toString("hex");
    user.passwordResetTokenHash = hashResetToken(rawToken);
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    const base = (
      process.env.PUBLIC_APP_URL || "http://localhost:3000"
    ).replace(/\/$/, "");
    const resetUrl = `${base}/reset-password?token=${encodeURIComponent(rawToken)}`;

    let mailSent = false;
    if (isMailConfigured()) {
      try {
        const info = await sendPasswordResetEmail({
          to: user.email,
          resetUrl,
          resetToken: rawToken,
          userName: user.name,
        });
        mailSent = true;
        console.log(
          "[mail] password reset email sent",
          info?.messageId ? `id=${info.messageId}` : "",
        );
      } catch (err) {
        console.error("[mail] password reset email failed:", formatSmtpError(err));
        throw ApiError.serviceUnavailable(
          "We could not send the reset email right now. Please try again in a few minutes.",
        );
      }
    } else if (!isEnvTruthy(process.env.PASSWORD_RESET_DEBUG)) {
      console.warn(
        "Password reset: mail not configured (set SMTP_* or RESEND_API_KEY) or use PASSWORD_RESET_DEBUG=1 for local token.",
      );
    }

    const debug = isEnvTruthy(process.env.PASSWORD_RESET_DEBUG);
    if (debug) {
      return res.json({
        ...FORGOT_OK,
        resetCode: rawToken,
        debugResetToken: rawToken,
      });
    }

    res.json(FORGOT_OK);
  
};

const resetPassword = async (req, res) => {
    const token = (req.body?.token || "").trim();
    const password = req.body?.password;
    if (!token || !password || String(password).length < 6) {
      throw ApiError.badRequest("Valid token and password (min 6 characters) are required");
    }
    const hash = hashResetToken(token);
    const user = await User.findOne({
      passwordResetTokenHash: hash,
      passwordResetExpires: { $gt: new Date() },
    }).select("+passwordResetTokenHash +passwordResetExpires +password");
    if (!user) {
      throw ApiError.badRequest(
        "Invalid or expired reset link. Request a new one.",
      );
    }
    user.password = await hashSecret(String(password));
    user.passwordResetTokenHash = "";
    user.passwordResetExpires = null;
    await user.save();
    res.json({ message: "Password updated. You can sign in." });
  
};

module.exports = {
  forgotPassword,
  resetPassword,
};
