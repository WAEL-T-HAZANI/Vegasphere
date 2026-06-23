/**
 * Presence service: multi-device awareness, heartbeat-driven TTLs, and last-seen.
 *
 * Design:
 *  - A user is "online" if they have >= 1 live socket on ANY node.
 *  - Redis is the source of truth across nodes:
 *      presenceSockets:<userId>  (SET of socketIds)  TTL refreshed by heartbeat
 *      presence:<userId>         (last heartbeat ms)  TTL refreshed by heartbeat
 *  - In-process counters mirror local sockets so a single node still works without Redis.
 *  - Heartbeats (socket "heartbeat" event + server ping) refresh TTLs so crashed
 *    nodes' stale presence expires automatically instead of leaking "online forever".
 */
const redisClient = require("./redis-client.js");
const { isReady } = require("./redis-factory.js");
const User = require("../models/User.js");

const PRESENCE_TTL_SEC = 90;

const localSocketCounts = new Map();

function redisOk() {
  return isReady(redisClient);
}

function socketsKey(userId) {
  return `presenceSockets:${String(userId)}`;
}

function heartbeatKey(userId) {
  return `presence:${String(userId)}`;
}

function adjustLocal(userId, delta) {
  if (!userId || !Number.isFinite(delta) || !delta) return 0;
  const key = String(userId);
  const next = Math.max(0, Number(localSocketCounts.get(key) || 0) + delta);
  if (next <= 0) {
    localSocketCounts.delete(key);
    return 0;
  }
  localSocketCounts.set(key, next);
  return next;
}

/** Register a newly connected socket for a user. Returns { firstConnection }. */
async function addSocket(userId, socketId) {
  if (!userId || !socketId) return { firstConnection: false };
  const localBefore = Number(localSocketCounts.get(String(userId)) || 0);
  adjustLocal(userId, 1);

  let firstConnection = localBefore === 0;

  if (redisOk()) {
    try {
      const added = await redisClient.sadd(socketsKey(userId), socketId);
      await redisClient.expire(socketsKey(userId), PRESENCE_TTL_SEC);
      await touch(userId);
      const total = await redisClient.scard(socketsKey(userId));
      // First connection cluster-wide when this socket created the only entry.
      firstConnection = added === 1 && total <= 1;
    } catch (e) {
      console.warn("presence addSocket:", e.message);
    }
  }

  if (firstConnection) {
    await User.findByIdAndUpdate(userId, { isOnline: true }).catch(() => {});
  }
  return { firstConnection };
}

/** Remove a disconnected socket. Returns { lastConnection }. */
async function removeSocket(userId, socketId) {
  if (!userId || !socketId) return { lastConnection: false };
  const localRemaining = adjustLocal(userId, -1);

  let clusterRemaining = localRemaining;

  if (redisOk()) {
    try {
      await redisClient.srem(socketsKey(userId), socketId);
      clusterRemaining = await redisClient.scard(socketsKey(userId));
      if (clusterRemaining > 0) {
        await redisClient.expire(socketsKey(userId), PRESENCE_TTL_SEC);
      } else {
        await redisClient.del(socketsKey(userId));
        await redisClient.del(heartbeatKey(userId));
      }
    } catch (e) {
      console.warn("presence removeSocket:", e.message);
    }
  }

  const lastConnection = clusterRemaining <= 0 && localRemaining <= 0;
  if (lastConnection) {
    await User.findByIdAndUpdate(userId, {
      isOnline: false,
      lastSeen: new Date(),
    }).catch(() => {});
  }
  return { lastConnection };
}

/** Heartbeat: refresh TTLs so presence stays alive while the socket is connected. */
async function touch(userId, socketId) {
  if (!userId) return;
  if (!redisOk()) return;
  try {
    if (socketId) {
      await redisClient.sadd(socketsKey(userId), socketId);
    }
    await redisClient.expire(socketsKey(userId), PRESENCE_TTL_SEC);
    await redisClient.set(
      heartbeatKey(userId),
      String(Date.now()),
      "EX",
      PRESENCE_TTL_SEC,
    );
  } catch (e) {
    console.warn("presence touch:", e.message);
  }
}

/** True if the user has any live socket (cluster-wide when Redis is available). */
async function isOnline(userId) {
  if (!userId) return false;
  if (redisOk()) {
    try {
      const n = await redisClient.scard(socketsKey(userId));
      if (n > 0) return true;
    } catch {
      /* fall through to local */
    }
  }
  return Number(localSocketCounts.get(String(userId)) || 0) > 0;
}

/** Batch presence lookup: { [userId]: { online, lastBeat } }. */
async function getPresenceMap(userIds) {
  const ids = [...new Set((userIds || []).map(String))];
  const out = {};
  if (!ids.length) return out;

  if (redisOk()) {
    try {
      const pipeline = redisClient.pipeline();
      for (const id of ids) {
        pipeline.scard(socketsKey(id));
        pipeline.get(heartbeatKey(id));
      }
      const results = await pipeline.exec();
      for (let i = 0; i < ids.length; i++) {
        const cardRes = results[i * 2];
        const beatRes = results[i * 2 + 1];
        const count = cardRes && !cardRes[0] ? Number(cardRes[1] || 0) : 0;
        const beat = beatRes && !beatRes[0] ? Number(beatRes[1] || 0) : 0;
        out[ids[i]] = { online: count > 0, lastBeat: beat || null };
      }
      return out;
    } catch (e) {
      console.warn("presence getPresenceMap:", e.message);
    }
  }

  for (const id of ids) {
    out[id] = {
      online: Number(localSocketCounts.get(id) || 0) > 0,
      lastBeat: null,
    };
  }
  return out;
}

module.exports = {
  PRESENCE_TTL_SEC,
  addSocket,
  removeSocket,
  touch,
  isOnline,
  getPresenceMap,
};
