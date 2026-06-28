const nodemailer = require("nodemailer");
const { isEnvTruthy } = require("../config/env.js");

function isSmtpConfigured() {
  return Boolean(
    stripEnvQuotes(process.env.SMTP_HOST) &&
      stripEnvQuotes(process.env.SMTP_USER) &&
      stripEnvQuotes(process.env.SMTP_PASS),
  );
}

function isResendConfigured() {
  return Boolean(stripEnvQuotes(process.env.RESEND_API_KEY));
}

/** True when SMTP and/or Resend API can send mail. */
function isMailConfigured() {
  return isResendConfigured() || isSmtpConfigured();
}

function stripEnvQuotes(value) {
  let v = String(value || "").trim();
  while (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1).trim();
  }
  return v;
}

function resolveMailFrom() {
  const user = stripEnvQuotes(process.env.SMTP_USER);
  let raw = stripEnvQuotes(process.env.MAIL_FROM);
  if (!user) {
    return raw || '"Vegasphere" <noreply@vegasphere.local>';
  }
  if (
    !raw ||
    /your@gmail\.com|you@example\.com|noreply@vegasphere\.local/i.test(raw)
  ) {
    return `"Vegasphere" <${user}>`;
  }
  const addrMatch = raw.match(/<([^>]+)>/);
  const addr = (addrMatch ? addrMatch[1] : raw).trim().toLowerCase();
  const isGmail = /gmail\.com/i.test(String(process.env.SMTP_HOST || ""));
  if (isGmail && addr !== user.toLowerCase()) {
    const nameMatch = raw.match(/^"([^"]+)"/);
    const display = nameMatch?.[1] || "Vegasphere";
    return `"${display}" <${user}>`;
  }
  return raw;
}

function formatSmtpError(err) {
  const parts = [err?.message || String(err)];
  if (err?.responseCode) parts.push(`code=${err.responseCode}`);
  if (err?.response) parts.push(String(err.response).slice(0, 240));
  return parts.join(" | ");
}

async function sendMailWithRetry(transporter, mailOptions, attempts = 2) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      const info = await transporter.sendMail(mailOptions);
      return info;
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, 1200));
      }
    }
  }
  throw lastErr;
}

function getMailHealth() {
  if (!isMailConfigured()) {
    return { configured: false, status: "skipped" };
  }
  if (isResendConfigured()) {
    return {
      configured: true,
      provider: "resend",
      from: resolveResendFrom(),
      status: "unknown",
    };
  }
  return {
    configured: true,
    provider: "smtp",
    host: stripEnvQuotes(process.env.SMTP_HOST),
    user: stripEnvQuotes(process.env.SMTP_USER),
    from: resolveMailFrom(),
    status: "unknown",
  };
}

function createTransport() {
  if (!isSmtpConfigured()) return null;
  const host = stripEnvQuotes(process.env.SMTP_HOST);
  const isGmail = /gmail\.com/i.test(host);
  let port = Number(process.env.SMTP_PORT || (isGmail ? 587 : 587));
  let secure =
    process.env.SMTP_SECURE === "1" || process.env.SMTP_SECURE === "true";
  if (isGmail && port === 465) {
    secure = true;
  }
  return nodemailer.createTransport({
    host,
    port,
    secure,
    requireTLS: !secure,
    auth: {
      user: stripEnvQuotes(process.env.SMTP_USER),
      pass: stripEnvQuotes(process.env.SMTP_PASS).replace(/\s+/g, ""),
    },
    ...(isGmail
      ? {
          tls: { minVersion: "TLSv1.2", rejectUnauthorized: true },
          connectionTimeout: 20_000,
          greetingTimeout: 20_000,
          socketTimeout: 30_000,
        }
      : {}),
  });
}

/** One-line startup hint for operators. */
function getMailStatusLine() {
  if (!isMailConfigured()) {
    return "[mail] Mail not configured — set SMTP_* or RESEND_API_KEY in backend/.env";
  }
  const debug =
    isEnvTruthy(process.env.EMAIL_VERIFY_DEBUG) ||
    isEnvTruthy(process.env.PASSWORD_RESET_DEBUG);
  if (isResendConfigured()) {
    const from = resolveResendFrom();
    if (debug) {
      return `[mail] Resend ready (${from}) — debug tokens still enabled`;
    }
    return `[mail] Resend ready (${from}) — verification and reset emails will send`;
  }
  const host = stripEnvQuotes(process.env.SMTP_HOST);
  const user = stripEnvQuotes(process.env.SMTP_USER);
  if (debug) {
    return `[mail] SMTP ready (${host} as ${user}) — debug tokens still enabled; set EMAIL_VERIFY_DEBUG=0 and PASSWORD_RESET_DEBUG=0 for inbox-only`;
  }
  return `[mail] SMTP ready (${host} as ${user}) — verification and reset emails will send`;
}

function resolveResendFrom() {
  let raw = stripEnvQuotes(process.env.RESEND_FROM) || stripEnvQuotes(process.env.MAIL_FROM);
  if (!raw || /your@gmail\.com|you@example\.com|noreply@vegasphere\.local/i.test(raw)) {
    raw = stripEnvQuotes(process.env.SMTP_USER);
  }
  if (!raw) {
    return '"Vegasphere" <noreply@vegasphere.local>';
  }
  if (raw.includes("<")) return raw;
  return `"Vegasphere" <${raw}>`;
}

async function sendViaResend({ from, to, subject, text, html, headers }) {
  const apiKey = stripEnvQuotes(process.env.RESEND_API_KEY);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
      text,
      headers,
    }),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend HTTP ${response.status}: ${body.slice(0, 280)}`);
  }
  return response.json();
}

async function sendTransactionalEmail({ to, subject, text, html, refId, replyTo }) {
  const headers = {
    "X-Entity-Ref-ID": refId || `mail-${Date.now()}`,
  };

  if (isResendConfigured()) {
    const from = resolveResendFrom();
    const result = await sendViaResend({ from, to, subject, text, html, headers });
    return { messageId: result?.id, provider: "resend" };
  }

  const transporter = createTransport();
  if (!transporter) {
    throw new Error("Mail is not configured");
  }
  const from = resolveMailFrom();
  const smtpUser = stripEnvQuotes(process.env.SMTP_USER);
  const info = await sendMailWithRetry(transporter, {
    from,
    to,
    subject,
    text,
    html,
    replyTo: replyTo || smtpUser || undefined,
    envelope: smtpUser ? { from: smtpUser, to } : undefined,
    headers,
  });
  return { messageId: info?.messageId, provider: "smtp" };
}

async function verifyMailConnection() {
  if (isResendConfigured()) {
    if (!resolveResendFrom().includes("@")) {
      throw new Error("RESEND_FROM or MAIL_FROM must be set for Resend");
    }
    return { provider: "resend" };
  }
  return verifySmtpConnection();
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
  if (!isMailConfigured()) return false;
  try {
    await verifyMailConnection();
    console.log(
      `[mail] ${isResendConfigured() ? "Resend" : "SMTP"} connection verified`,
    );
    return true;
  } catch (error) {
    console.warn("[mail] Mail verify failed:", error.message);
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
async function sendPasswordResetEmail({ to, resetUrl, resetToken, userName }) {
  const subject =
    process.env.MAIL_SUBJECT_RESET || "Reset your Vegasphere password";
  const greeting = userName ? `Hi ${userName}` : "Hi";
  const includeTokenInBody =
    isEnvTruthy(process.env.PASSWORD_RESET_DEBUG) ||
    isEnvTruthy(process.env.EMAIL_INCLUDE_RESET_TOKEN);
  let token = String(resetToken || "").trim();
  if (!token && includeTokenInBody) {
    try {
      token = new URL(resetUrl).searchParams.get("token") || "";
    } catch {
      token = "";
    }
  }
  const tokenBlock =
    includeTokenInBody && token
      ? `\n\nYour reset code (valid for 1 hour):\n${token}\n`
      : "";
  const text = `${greeting},

Reset your password by opening this link (valid for 1 hour):
${resetUrl}
${tokenBlock}
If the button does not work, open the link in your browser.

If you did not request this, you can ignore this email.`;

  const safeName = userName ? escapeHtml(userName) : "";
  const safeUrl = resetUrl.replace(/"/g, "");
  const safeToken = token ? escapeHtml(token) : "";
  const html = `<!DOCTYPE html><html><body style="font-family:sans-serif;line-height:1.5;color:#222">
<p>${userName ? `Hi ${safeName}` : "Hi"},</p>
<p>We received a request to reset your Vegasphere password.</p>
<p><a href="${safeUrl}" style="display:inline-block;padding:12px 20px;background:#8B1E3F;color:#fff;text-decoration:none;border-radius:8px;">Reset password</a></p>
<p style="word-break:break-all;font-size:13px;color:#555;">Or copy this link:<br><a href="${safeUrl}">${safeUrl}</a></p>
${includeTokenInBody && safeToken ? `<p>Reset code:</p><p style="font-family:monospace;word-break:break-all;">${safeToken}</p>` : ""}
<p style="font-size:13px;color:#555;">This link expires in one hour. If you did not request this, ignore this email.</p>
</body></html>`;

  return sendTransactionalEmail({
    to,
    subject,
    text,
    html,
    refId: `reset-${Date.now()}`,
  });
}

/**
 * @param {{ to: string, verifyUrl: string, userName?: string }} opts
 */
async function sendVerificationEmail({ to, verifyUrl, userName }) {
  const subject =
    process.env.MAIL_SUBJECT_VERIFY || "Verify your Vegasphere email";
  const greeting = userName ? `Hi ${userName}` : "Hi";
  const text = `${greeting},

Verify your email by opening this link (valid for 24 hours):
${verifyUrl}

If you did not create an account, you can ignore this email.`;

  const safeName = userName ? escapeHtml(userName) : "";
  const safeUrl = verifyUrl.replace(/"/g, "");
  const html = `<!DOCTYPE html><html><body style="font-family:sans-serif;line-height:1.5;color:#222">
<p>${userName ? `Hi ${safeName}` : "Hi"},</p>
<p><a href="${safeUrl}" style="display:inline-block;padding:12px 20px;background:#8B1E3F;color:#fff;text-decoration:none;border-radius:8px;">Verify email</a></p>
<p style="font-size:13px;color:#555;">This link expires in 24 hours.</p>
</body></html>`;

  return sendTransactionalEmail({
    to,
    subject,
    text,
    html,
    refId: `verify-${Date.now()}`,
  });
}

/**
 * @param {{ reporterName?: string, reporterEmail?: string, targetName?: string, targetEmail?: string, reason: string }} opts
 */
async function sendUserReportEmail({
  reporterName,
  reporterEmail,
  targetName,
  targetEmail,
  reason,
}) {
  const adminTo = String(process.env.REPORT_ADMIN_EMAIL || process.env.SMTP_USER || "").trim();
  if (!adminTo) return false;
  const transporter = createTransport();
  if (!transporter) return false;
  const from = resolveMailFrom();
  const subject = process.env.MAIL_SUBJECT_REPORT || "Vegasphere user report";
  const text = `User report received

Reporter: ${reporterName || "—"} (${reporterEmail || "—"})
Reported user: ${targetName || "—"} (${targetEmail || "—"})

Reason:
${reason}`;

  const html = `<p><strong>User report received</strong></p>
<p>Reporter: ${escapeHtml(reporterName || "—")} (${escapeHtml(reporterEmail || "")})</p>
<p>Reported user: ${escapeHtml(targetName || "—")} (${escapeHtml(targetEmail || "")})</p>
<p><strong>Reason:</strong></p>
<p>${escapeHtml(reason).replace(/\n/g, "<br>")}</p>`;

  await transporter.sendMail({ from, to: adminTo, subject, text, html });
  return true;
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
  isResendConfigured,
  isMailConfigured,
  getMailHealth,
  getMailStatusLine,
  verifySmtpConnection,
  verifyMailConnection,
  warmUpSmtp,
  resolveMailFrom,
  resolveResendFrom,
  sendPasswordResetEmail,
  sendVerificationEmail,
  sendLoginAlertEmail,
  sendUserReportEmail,
  formatSmtpError,
};
