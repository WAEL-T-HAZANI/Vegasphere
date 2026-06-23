const User = require("../../models/User.js");
const { publicSessionShape } = require("../../services/session-auth.js");
const { verifyAccessToken } = require("../../services/jwt-utils.js");
const { isDestructiveMaintenanceAllowed } = require("../../config/env.js");
const { ApiError } = require("../../services/http-error.js");

const authUser = async (req, res) => {
  const token = req.header("auth-token");
  if (!token) {
    throw ApiError.unauthorized("Please authenticate using a valid token");
  }

  let data;
  try {
    data = verifyAccessToken(token);
  } catch {
    throw ApiError.unauthorized("Please authenticate using a valid token");
  }

  if (!data?.user?.id) {
    throw ApiError.unauthorized("Please authenticate using a valid token");
  }

  const user = await User.findById(data.user.id).select("-password -phoneHash");
  if (!user) throw ApiError.notFound("User not found");
  const doc = user.toObject ? user.toObject() : user;
  doc.destructiveMaintenanceAllowed = isDestructiveMaintenanceAllowed(data.user);
  return res.json(doc);
};

const SESSION_PRUNE_MS = 90 * 24 * 60 * 60 * 1000;

const listSessions = async (req, res) => {
  const user = await User.findById(req.user.id).select("sessions");
  if (!user) throw ApiError.notFound("User not found");

  const now = Date.now();
  const rows = Array.isArray(user.sessions) ? user.sessions : [];
  let pruned = false;

  user.sessions = rows.filter((row) => {
    if (!row.revokedAt) return true;
    const revokedMs = new Date(row.revokedAt).getTime();
    if (Number.isNaN(revokedMs)) {
      pruned = true;
      return false;
    }
    if (now - revokedMs > SESSION_PRUNE_MS) {
      pruned = true;
      return false;
    }
    return true;
  });

  if (pruned) await user.save();

  const active = user.sessions
    .filter((row) => !row.revokedAt)
    .sort(
      (a, b) =>
        new Date(b.lastSeenAt || b.createdAt || 0).getTime() -
        new Date(a.lastSeenAt || a.createdAt || 0).getTime(),
    )
    .map((row) => publicSessionShape(row, req.sessionId));

  return res.json(active);
};

const revokeSession = async (req, res) => {
  const sessionId = String(req.params.sessionId || "");
  if (!sessionId) {
    throw ApiError.badRequest("sessionId required");
  }
  if (sessionId === String(req.sessionId || "")) {
    throw ApiError.badRequest("Use sign out for the current session");
  }
  const user = await User.findById(req.user.id).select("sessions");
  if (!user) throw ApiError.notFound("User not found");
  const session = user.sessions?.find(
    (row) => String(row.sessionId) === sessionId,
  );
  if (!session || session.revokedAt) {
    throw ApiError.notFound("Session not found");
  }
  session.revokedAt = new Date();
  await user.save();
  return res.json({ ok: true });
};

const revokeOtherSessions = async (req, res) => {
  const currentSessionId = String(req.sessionId || "");
  const user = await User.findById(req.user.id).select("sessions");
  if (!user) throw ApiError.notFound("User not found");
  let changed = 0;
  for (const session of user.sessions || []) {
    if (String(session.sessionId) === currentSessionId || session.revokedAt)
      continue;
    session.revokedAt = new Date();
    changed += 1;
  }
  await user.save();
  return res.json({ ok: true, revoked: changed });
};

const revokeCurrentSession = async (req, res) => {
  const currentSessionId = String(req.sessionId || "");
  const user = await User.findById(req.user.id).select("sessions");
  if (!user) throw ApiError.notFound("User not found");
  const session = user.sessions?.find(
    (row) => String(row.sessionId) === currentSessionId && !row.revokedAt,
  );
  if (!session) {
    return res.json({ ok: true });
  }
  session.revokedAt = new Date();
  await user.save();
  return res.json({ ok: true });
};

module.exports = {
  authUser,
  listSessions,
  revokeSession,
  revokeOtherSessions,
  revokeCurrentSession,
};
