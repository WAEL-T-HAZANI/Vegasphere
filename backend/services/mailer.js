const nodemailer = require("nodemailer");

function isSmtpConfigured() {
  return Boolean(
    process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS,
  );
}

function resolveMailFrom() {
  const user = String(process.env.SMTP_USER || "").trim();
  const raw = String(process.env.MAIL_FROM || "").trim();
  if (!user) {
    return raw || '"Vegasphere" <noreply@vegasphere.local>';
  }
  if (
    !raw ||
    /your@gmail\.com|you@example\.com|noreply@vegasphere\.local/i.test(raw)
  ) {
    return `"Vegasphere" <${user}>`;
  }
  return raw;
}

function getMailHealth() {
  if (!isSmtpConfigured()) {
    return { configured: false, status: "skipped" };
  }
  return {
    configured: true,
    host: String(process.env.SMTP_HOST || "").trim(),
    user: String(process.env.SMTP_USER || "").trim(),
    from: resolveMailFrom(),
    status: "unknown",
  };
}

function createTransport() {
  if (!isSmtpConfigured()) return null;
  const port = Number(process.env.SMTP_PORT || 587);
  const secure =
    process.env.SMTP_SECURE === "1" || process.env.SMTP_SECURE === "true";
  const host = String(process.env.SMTP_HOST).trim();
  const isGmail = /gmail\.com/i.test(host);
  return nodemailer.createTransport({
    host,
    port,
    secure,
    requireTLS: !secure,
    auth: {
      user: String(process.env.SMTP_USER).trim(),
      pass: String(process.env.SMTP_PASS).replace(/\s+/g, ""),
    },
    ...(isGmail && !secure ? { tls: { minVersion: "TLSv1.2" } } : {}),
  });
}

/** One-line startup hint for operators. */
function getMailStatusLine() {
  if (!isSmtpConfigured()) {
    return "[mail] SMTP not configured — set SMTP_HOST, SMTP_USER, SMTP_PASS in backend/.env (emails will not send)";
  }
  const debug =
    process.env.EMAIL_VERIFY_DEBUG === "1" ||
    process.env.PASSWORD_RESET_DEBUG === "1";
  const host = String(process.env.SMTP_HOST).trim();
  const user = String(process.env.SMTP_USER).trim();
  if (debug) {
    return `[mail] SMTP ready (${host} as ${user}) — debug tokens still enabled; set EMAIL_VERIFY_DEBUG=0 and PASSWORD_RESET_DEBUG=0 for inbox-only`;
  }
  return `[mail] SMTP ready (${host} as ${user}) — verification and reset emails will send`;
}

async function verifySmtpConnection() {
  const transporter = createTransport();
  if (!transporter) {
    throw new Error("SMTP is not configured (SMTP_HOST, SMTP_USER, SMTP_PASS required)");
  }
  await transporter.verify();
  return transporter;
}

/** Non-blocking startup check; logs result for operators. */
async function warmUpSmtp() {
  if (!isSmtpConfigured()) return false;
  try {
    await verifySmtpConnection();
    console.log("[mail] SMTP connection verified");
    return true;
  } catch (error) {
    console.warn("[mail] SMTP verify failed:", error.message);
    return false;
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * @param {{ to: string, resetUrl: string, userName?: string }} opts
 */
async function sendPasswordResetEmail({ to, resetUrl, userName }) {
  const transporter = createTransport();
  if (!transporter) {
    throw new Error("SMTP is not configured");
  }
  const from = resolveMailFrom();
  const subject =
    process.env.MAIL_SUBJECT_RESET || "Reset your Vegasphere password";
  const greeting = userName ? `Hi ${userName}` : "Hi";
  const text = `${greeting},

Reset your password by opening this link (valid for 1 hour):
${resetUrl}

If you did not request this, you can ignore this email.`;

  const safeName = userName ? escapeHtml(userName) : "";
  const html = `<p>${userName ? `Hi ${safeName}` : "Hi"},</p>
<p><a href="${resetUrl.replace(/"/g, "")}">Reset your password</a></p>
<p>This link expires in one hour.</p>
<p>If you did not request this, you can ignore this email.</p>`;

  await transporter.sendMail({
    from,
    to,
    subject,
    text,
    html,
  });
}

/**
 * @param {{ to: string, verifyUrl: string, userName?: string }} opts
 */
async function sendVerificationEmail({ to, verifyUrl, userName }) {
  const transporter = createTransport();
  if (!transporter) {
    throw new Error("SMTP is not configured");
  }
  const from = resolveMailFrom();
  const subject =
    process.env.MAIL_SUBJECT_VERIFY || "Verify your Vegasphere email";
  const greeting = userName ? `Hi ${userName}` : "Hi";
  const text = `${greeting},

Verify your email by opening this link (valid for 24 hours):
${verifyUrl}

If you did not create an account, you can ignore this email.`;

  const safeName = userName ? escapeHtml(userName) : "";
  const html = `<p>${userName ? `Hi ${safeName}` : "Hi"},</p>
<p><a href="${verifyUrl.replace(/"/g, "")}">Verify your email</a></p>
<p>This link expires in 24 hours.</p>`;

  await transporter.sendMail({ from, to, subject, text, html });
}

/**
 * @param {{ to: string, userName?: string, deviceLabel?: string, ip?: string, signedInAt?: Date }} opts
 */
async function sendLoginAlertEmail({
  to,
  userName,
  deviceLabel,
  ip,
  signedInAt,
}) {
  const transporter = createTransport();
  if (!transporter) return;
  const from = resolveMailFrom();
  const subject =
    process.env.MAIL_SUBJECT_LOGIN || "New sign-in to your Vegasphere account";
  const when = signedInAt
    ? signedInAt.toISOString().replace("T", " ").slice(0, 16)
    : "now";
  const device = deviceLabel || "Unknown device";
  const ipLine = ip ? ` from ${ip}` : "";
  const greeting = userName ? `Hi ${userName}` : "Hi";
  const text = `${greeting},

Your Vegasphere account was signed in on ${device}${ipLine} at ${when}.

If this was you, you can ignore this email. If not, change your password and sign out other devices from Account & security.`;

  const safeName = userName ? escapeHtml(userName) : "";
  const html = `<p>${userName ? `Hi ${safeName}` : "Hi"},</p>
<p>Your Vegasphere account was signed in on <strong>${escapeHtml(device)}</strong>${ip ? ` from ${escapeHtml(ip)}` : ""} at ${escapeHtml(when)}.</p>
<p>If this was not you, change your password and review active sessions.</p>`;

  await transporter.sendMail({ from, to, subject, text, html });
}

module.exports = {
  isSmtpConfigured,
  getMailHealth,
  getMailStatusLine,
  verifySmtpConnection,
  warmUpSmtp,
  resolveMailFrom,
  sendPasswordResetEmail,
  sendVerificationEmail,
  sendLoginAlertEmail,
};
