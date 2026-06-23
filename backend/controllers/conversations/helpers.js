const Conversation = require("../../models/Conversation.js");
const User = require("../../models/User.js");

function defaultTopics() {
  return [{ id: "general", name: "General", description: "", archived: false }];
}

async function resolveSelectableMemberIds(rawIds, requesterId) {
  const requester = String(requesterId || "");
  const uniqueIds = [
    ...new Set((Array.isArray(rawIds) ? rawIds : []).map(String)),
  ]
    .map((id) => id.trim())
    .filter((id) => id && id !== requester);

  if (!uniqueIds.length) return [];

  const [me, users] = await Promise.all([
    User.findById(requesterId).select("blockedUsers"),
    User.find({ _id: { $in: uniqueIds } }).select("_id email blockedUsers"),
  ]);

  const myBlocked = new Set((me?.blockedUsers || []).map((id) => String(id)));
  const resolved = [];

  for (const user of users) {
    const uid = String(user._id);
    if (/bot$/i.test(String(user.email || ""))) continue;
    if (myBlocked.has(uid)) continue;
    if (
      (user.blockedUsers || []).some(
        (blockedId) => String(blockedId) === requester,
      )
    ) {
      continue;
    }
    resolved.push(uid);
  }

  if (resolved.length !== uniqueIds.length) {
    const resolvedSet = new Set(resolved);
    const rejected = uniqueIds.filter((id) => !resolvedSet.has(id));
    const error = new Error("Some selected users are unavailable");
    error.statusCode = 400;
    error.details = { rejectedIds: rejected };
    throw error;
  }

  return resolved;
}

async function populateConversation(conversation) {
  await conversation.populate("members", "-password -phoneHash");
  return conversation;
}

function pruneExpiredBans(conversation) {
  if (!conversation?.bannedUsers?.length) return false;
  const now = Date.now();
  const before = conversation.bannedUsers.length;
  conversation.bannedUsers = (conversation.bannedUsers || []).filter((b) => {
    const exp = b?.expiresAt ? new Date(b.expiresAt).getTime() : null;
    if (exp != null && !Number.isNaN(exp) && exp <= now) return false;
    return true;
  });
  return conversation.bannedUsers.length !== before;
}

async function ensureSelfConversation(userId) {
  const uid = String(userId || "");
  if (!uid) return null;
  let conv = await Conversation.findOne({
    isSelfChat: true,
    members: uid,
  }).populate("members", "-password -phoneHash");
  if (conv) return conv;
  conv = await Conversation.create({
    members: [uid],
    isSelfChat: true,
    name: "Saved Messages",
    unreadCounts: [{ userId: uid, count: 0 }],
    latestMessage: "",
  });
  await conv.populate("members", "-password -phoneHash");
  return conv;
}

/**
 * Periodic cleanup: remove expired bans from all conversations.
 * Safe to run frequently; uses a single $pull update.
 */
async function cleanupExpiredBans() {
  const now = new Date();
  await Conversation.updateMany(
    { "bannedUsers.expiresAt": { $ne: null, $lte: now } },
    { $pull: { bannedUsers: { expiresAt: { $ne: null, $lte: now } } } },
  );
}

function findActiveInvite(conv, token) {
  const t = String(token || "").trim();
  if (!t || !conv?.inviteLinks?.length) return null;
  const now = Date.now();
  for (const link of conv.inviteLinks) {
    if (String(link.token) !== t || link.revokedAt) continue;
    if (link.expiresAt && new Date(link.expiresAt).getTime() <= now) continue;
    if (
      link.maxUses != null &&
      Number(link.usesCount) >= Number(link.maxUses)
    ) {
      continue;
    }
    return link;
  }
  return null;
}

/**
 * When no admins remain, promote the first member for groups only.
 * Channels never auto-promote subscribers — assign admins explicitly.
 */
function ensureAdminSuccession(conversation) {
  if (!conversation?.members?.length) return;
  if (conversation.admins?.length) return;
  if (conversation.isChannel) return;
  conversation.admins = [conversation.members[0]];
}

function appendModerationLog(conv, entry) {
  if (!conv) return;
  conv.moderationLog = Array.isArray(conv.moderationLog)
    ? conv.moderationLog
    : [];
  conv.moderationLog.push({
    action: String(entry?.action || "").slice(0, 64) || "unknown",
    actorId: entry?.actorId || null,
    targetUserId: entry?.targetUserId || null,
    token: entry?.token ? String(entry.token).slice(0, 128) : "",
    reason: entry?.reason ? String(entry.reason).slice(0, 280) : "",
    meta: entry?.meta && typeof entry.meta === "object" ? entry.meta : {},
    at: entry?.at ? new Date(entry.at) : new Date(),
  });
  // cap to last 200 entries to avoid unbounded document growth
  if (conv.moderationLog.length > 200) {
    conv.moderationLog = conv.moderationLog.slice(
      conv.moderationLog.length - 200,
    );
  }
  conv.markModified("moderationLog");
}

module.exports = {
  defaultTopics,
  resolveSelectableMemberIds,
  populateConversation,
  pruneExpiredBans,
  ensureSelfConversation,
  findActiveInvite,
  appendModerationLog,
  ensureAdminSuccession,
  cleanupExpiredBans,
};
