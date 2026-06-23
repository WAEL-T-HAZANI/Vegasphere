/**
 * Optional Redis mirror for per-user unread counts (multi-worker / fast read path).
 * MongoDB `Conversation.unreadCounts` remains authoritative; we **mirror** the same
 * increments/decrements when `REDIS_UNREAD_MIRROR=1` and `REDIS_URL` is set.
 *
 * Keys: `unreadMirror:<userId>:<conversationId>` (integer), TTL 30d.
 * List API merges `max(mongoCount, redisCount)` then caps display consistency.
 */
const redisClient = require("./redis-client.js");

function enabled() {
  return (
    process.env.REDIS_UNREAD_MIRROR === "1" &&
    redisClient &&
    String(redisClient.status || "") === "ready"
  );
}

function mirrorKey(userId, conversationId) {
  return `unreadMirror:${String(userId)}:${String(conversationId)}`;
}

/**
 * Bump mirror for each recipient who received a mongo unread increment.
 * Unread now reflects "not explicitly read yet", not "not currently inside room".
 */
async function bumpUnreadMirror(otherMemberIds, inRoomUserIds, conversationId) {
  if (!enabled() || !conversationId || !otherMemberIds?.length) return;
  const cid = String(conversationId);
  for (const uid of otherMemberIds) {
    const u = String(uid);
    try {
      const k = mirrorKey(u, cid);
      await redisClient.incr(k);
      await redisClient.expire(k, 60 * 60 * 24 * 30);
    } catch (e) {
      console.warn("Redis unread mirror bump:", e.message);
    }
  }
}

/** Clear mirror when user opens thread (matches mongo zeroing on `join-chat`). */
async function clearUnreadMirror(userId, conversationId) {
  if (!enabled() || !userId || !conversationId) return;
  try {
    await redisClient.del(mirrorKey(userId, conversationId));
  } catch (e) {
    console.warn("Redis unread mirror clear:", e.message);
  }
}

/**
 * Merge Redis mirror into conversation docs for list response (lean objects ok).
 * @param {string} userId
 * @param {object[]} conversations - mongoose docs or plain objects with _id + unreadCounts
 */
async function mergeUnreadMirrorIntoConversations(userId, conversations) {
  if (!enabled() || !conversations?.length) return conversations;
  const uid = String(userId);
  try {
    const keys = conversations.map((c) => mirrorKey(uid, c._id));
    const vals = await redisClient.mget(...keys);
    return conversations.map((conv, i) => {
      const redisVal = vals[i];
      const n = redisVal != null ? parseInt(redisVal, 10) : 0;
      if (!Number.isFinite(n) || n <= 0) return conv;
      const row = (conv.unreadCounts || []).find(
        (x) => String(x.userId?._id || x.userId) === uid,
      );
      const mongo = row?.count ?? 0;
      const merged = Math.max(mongo, n);
      if (merged === mongo) return conv;
      const unreadCounts = (conv.unreadCounts || []).map((u) =>
        String(u.userId?._id || u.userId) === uid ? { ...u, count: merged } : u,
      );
      return typeof conv.toObject === "function"
        ? { ...conv.toObject(), unreadCounts }
        : { ...conv, unreadCounts };
    });
  } catch (e) {
    console.warn("Redis unread mirror merge:", e.message);
    return conversations;
  }
}

function isRedisUnreadMirrorEnabled() {
  return Boolean(enabled());
}

module.exports = {
  isRedisUnreadMirrorEnabled,
  bumpUnreadMirror,
  clearUnreadMirror,
  mergeUnreadMirrorIntoConversations,
};
