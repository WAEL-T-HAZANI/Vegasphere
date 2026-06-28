const nodemailer = require("nodemailer");

function isSmtpConfigured() {
  return Boolean(
    process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS,
  );
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
  const host = String(process.env.SMTP_HOST).trim();
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
      user: String(process.env.SMTP_USER).trim(),
      pass: String(process.env.SMTP_PASS).replace(/\s+/g, ""),
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
async function sendPasswordResetEmail({ to, resetUrl, resetToken, userName }) {
  const transporter = createTransport();
  if (!transporter) {
    throw new Error("SMTP is not configured");
  }
  const from = resolveMailFrom();
  const smtpUser = stripEnvQuotes(process.env.SMTP_USER);
  const subject =
    process.env.MAIL_SUBJECT_RESET || "Reset your Vegasphere password";
  const greeting = userName ? `Hi ${userName}` : "Hi";
  let token = String(resetToken || "").trim();
  if (!token) {
    try {
      token = new URL(resetUrl).searchParams.get("token") || "";
    } catch {
      token = "";
    }
  }
  const tokenBlock = token
    ? `\n\nYour reset code (valid for 1 hour):\n${token}\n`
    : "";
  const text = `${greeting},

Reset your password by opening this link (valid for 1 hour):
${resetUrl}
${tokenBlock}
If the button does not work, copy the reset code above into the reset page on Vegasphere.

If you did not request this, you can ignore this email.`;

  const safeName = userName ? escapeHtml(userName) : "";
  const safeToken = token ? escapeHtml(token) : "";
  const html = `<p>${userName ? `Hi ${safeName}` : "Hi"},</p>
<p><a href="${resetUrl.replace(/"/g, "")}">Reset your password</a></p>
${token ? `<p>Or copy this reset code:</p><p style="font-family:monospace;word-break:break-all;">${safeToken}</p>` : ""}
<p>This link and code expire in one hour.</p>
<p>If you did not request this, you can ignore this email.</p>`;

  const info = await sendMailWithRetry(transporter, {
    from,
    to,
    subject,
    text,
    html,
    envelope: smtpUser ? { from: smtpUser, to } : undefined,
    headers: {
      "Auto-Submitted": "auto-generated",
      "X-Entity-Ref-ID": `reset-${Date.now()}`,
    },
  });
  return info;
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

  await sendMailWithRetry(transporter, {
    from,
    to,
    subject,
    text,
    html,
    headers: {
      "Auto-Submitted": "auto-generated",
      "X-Entity-Ref-ID": `verify-${Date.now()}`,
    },
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
  getMailHealth,
  getMailStatusLine,
  verifySmtpConnection,
  warmUpSmtp,
  resolveMailFrom,
  sendPasswordResetEmail,
  sendVerificationEmail,
  sendLoginAlertEmail,
  sendUserReportEmail,
  formatSmtpError,
};
