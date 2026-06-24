const crypto = require("crypto");
const User = require("../models/User.js");
const { sendLoginAlertEmail } = require("./mailer.js");
const { SESSION_TOUCH_THROTTLE_MS } = require("../config/env.js");
const { signAccessToken } = require("./jwt-utils.js");

function getRequestIp(req) {
  return String(
    req?.headers?.["x-forwarded-for"]?.split?.(",")?.[0]?.trim() ||
      req?.socket?.remoteAddress ||
      "",
  );
}

function parseUserAgent(uaRaw) {
  const ua = String(uaRaw || "").trim();
  if (!ua) {
    return {
      deviceType: "unknown",
      browser: "",
      os: "",
      label: "Unknown device",
    };
  }

  let deviceType = "desktop";
  if (/tablet|ipad/i.test(ua)) deviceType = "tablet";
  else if (/mobile|iphone|android.*mobile/i.test(ua)) deviceType = "mobile";

  let os = "";
  if (/windows nt/i.test(ua)) os = "Windows";
  else if (/mac os x|macintosh/i.test(ua)) os = "macOS";
  else if (/android/i.test(ua)) os = "Android";
  else if (/iphone|ipad|ios/i.test(ua)) os = "iOS";
  else if (/linux/i.test(ua)) os = "Linux";

  let browser = "";
  if (/edg\//i.test(ua)) browser = "Edge";
  else if (/chrome\//i.test(ua) && !/edg\//i.test(ua)) browser = "Chrome";
  else if (/firefox\//i.test(ua)) browser = "Firefox";
  else if (/safari\//i.test(ua) && !/chrome\//i.test(ua)) browser = "Safari";
  else if (/electron/i.test(ua)) browser = "Desktop app";

  const parts = [browser, os].filter(Boolean);
  const label = parts.length ? parts.join(" · ") : ua.slice(0, 80);

  return { deviceType, browser, os, label };
}

function buildSessionLabel(req) {
  const ua = String(req?.headers?.["user-agent"] || "").trim();
  return parseUserAgent(ua).label;
}

function makeSessionToken(userId, sessionId) {
  return signAccessToken({
    user: { id: String(userId) },
    sessionId: String(sessionId),
  });
}

async function createUserSession(user, req) {
  const sessionId = crypto.randomUUID();
  const now = new Date();
  user.sessions = Array.isArray(user.sessions) ? user.sessions : [];
  const activeBefore = user.sessions.filter((row) => !row.revokedAt).length;
  const parsed = parseUserAgent(String(req?.headers?.["user-agent"] || ""));
  user.sessions.push({
    sessionId,
    label: buildSessionLabel(req),
    userAgent: String(req?.headers?.["user-agent"] || ""),
    ip: getRequestIp(req),
    createdAt: now,
    lastSeenAt: now,
    revokedAt: null,
  });
  await user.save();

  if (user.loginAlertsEnabled !== false && activeBefore > 0 && user.email) {
    sendLoginAlertEmail({
      to: user.email,
      userName: user.name,
      deviceLabel: parsed.label,
      ip: getRequestIp(req),
      signedInAt: now,
    }).catch((err) => console.warn("login alert email:", err.message));
  }

  return {
    sessionId,
    token: makeSessionToken(user._id, sessionId),
  };
}

async function touchSession(userId, sessionId, req) {
  if (!userId || !sessionId) return null;
  const user = await User.findById(userId).select("sessions");
  if (!user) return null;
  user.sessions = Array.isArray(user.sessions) ? user.sessions : [];
  const session = user.sessions.find(
    (row) => String(row.sessionId) === String(sessionId),
  );
  if (!session || session.revokedAt) return null;

  // Throttle writes: skip the DB save on hot paths unless the session is stale
  // or the device fingerprint (IP / user agent) actually changed. This avoids a
  // user.save() on every authenticated request.
  const nextIp = req ? getRequestIp(req) : "";
  const nextUa = req ? String(req?.headers?.["user-agent"] || "") : "";
  const lastSeenMs = session.lastSeenAt
    ? new Date(session.lastSeenAt).getTime()
    : 0;
  const isStale = Date.now() - lastSeenMs >= SESSION_TOUCH_THROTTLE_MS;
  const metaChanged =
    (nextIp && nextIp !== session.ip) ||
    (nextUa && nextUa !== session.userAgent);

  if (!isStale && !metaChanged) {
    return session;
  }

  session.lastSeenAt = new Date();
  if (req) {
    session.userAgent = nextUa || session.userAgent || "";
    session.ip = nextIp || session.ip || "";
    session.label = buildSessionLabel(req) || session.label || "";
  }
  await user.save();
  return session;
}

function publicSessionShape(session, currentSessionId) {
  const ua = String(session?.userAgent || "");
  const parsed = parseUserAgent(ua);
  const storedLabel = String(session?.label || "").trim();
  const deviceLabel =
    storedLabel && storedLabel.length <= 80 && !storedLabel.includes("Mozilla/")
      ? storedLabel
      : parsed.label;

  return {
    sessionId: String(session?.sessionId || ""),
    label: deviceLabel,
    deviceLabel,
    deviceType: parsed.deviceType,
    browser: parsed.browser,
    os: parsed.os,
    userAgent: ua,
    ip: String(session?.ip || ""),
    createdAt: session?.createdAt || null,
    lastSeenAt: session?.lastSeenAt || null,
    current:
      String(session?.sessionId || "") === String(currentSessionId || ""),
  };
}

module.exports = {
  buildSessionLabel,
  createUserSession,
  getRequestIp,
  makeSessionToken,
  parseUserAgent,
  publicSessionShape,
  touchSession,
};
