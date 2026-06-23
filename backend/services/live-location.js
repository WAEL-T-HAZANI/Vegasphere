/**
 * Live location shares — Redis when available (multi-node), in-memory fallback.
 */
const redisClient = require("./redis-client.js");
const { isReady } = require("./redis-factory.js");

const mem = new Map();
const KEY = (uid, cid) => `live-loc:${uid}:${cid}`;
const CONV = (cid) => `live-loc-conv:${cid}`;

function canUseRedis() {
  return isReady(redisClient);
}

function ttlSec(durationSec) {
  return Math.min(Math.max(Number(durationSec) || 900, 60), 3600);
}

function buildRow(userId, conversationId, { lat, lng, label, durationSec }) {
  const now = Date.now();
  const ttl = ttlSec(durationSec) * 1000;
  return {
    userId: String(userId),
    conversationId: String(conversationId),
    lat: Number(lat),
    lng: Number(lng),
    label: String(label || "").slice(0, 200),
    startedAt: now,
    expiresAt: now + ttl,
  };
}

async function start(userId, conversationId, opts) {
  const row = buildRow(userId, conversationId, opts);
  const ttl = Math.ceil((row.expiresAt - Date.now()) / 1000);

  if (canUseRedis()) {
    try {
      const k = KEY(userId, conversationId);
      await redisClient.set(k, JSON.stringify(row), "EX", ttl);
      await redisClient.sadd(CONV(conversationId), k);
      await redisClient.expire(CONV(conversationId), ttl);
      return row;
    } catch {
      /* fall through */
    }
  }

  mem.set(`${userId}:${conversationId}`, row);
  return row;
}

async function update(userId, conversationId, lat, lng) {
  const uid = String(userId);
  const cid = String(conversationId);

  if (canUseRedis()) {
    try {
      const k = KEY(uid, cid);
      const raw = await redisClient.get(k);
      if (!raw) return null;
      const row = JSON.parse(raw);
      if (row.expiresAt <= Date.now()) {
        await redisClient.del(k);
        return null;
      }
      row.lat = Number(lat);
      row.lng = Number(lng);
      row.updatedAt = Date.now();
      const ttl = Math.max(1, Math.ceil((row.expiresAt - Date.now()) / 1000));
      await redisClient.set(k, JSON.stringify(row), "EX", ttl);
      return row;
    } catch {
      /* fall through */
    }
  }

  const row = mem.get(`${uid}:${cid}`);
  if (!row || row.expiresAt <= Date.now()) return null;
  row.lat = Number(lat);
  row.lng = Number(lng);
  row.updatedAt = Date.now();
  return row;
}

async function stop(userId, conversationId) {
  const uid = String(userId);
  const cid = String(conversationId);

  if (canUseRedis()) {
    try {
      const k = KEY(uid, cid);
      await redisClient.del(k);
      await redisClient.srem(CONV(cid), k);
      return true;
    } catch {
      /* fall through */
    }
  }
  return mem.delete(`${uid}:${cid}`);
}

async function listForConversation(conversationId) {
  const cid = String(conversationId);
  const now = Date.now();
  const out = [];

  if (canUseRedis()) {
    try {
      const keys = await redisClient.smembers(CONV(cid));
      if (keys.length) {
        const vals = await redisClient.mget(...keys);
        for (const raw of vals) {
          if (!raw) continue;
          const row = JSON.parse(raw);
          if (row.expiresAt > now) out.push(row);
        }
        return out;
      }
    } catch {
      /* fall through */
    }
  }

  for (const row of mem.values()) {
    if (row.conversationId === cid && row.expiresAt > now) out.push(row);
  }
  return out;
}

module.exports = { start, update, stop, listForConversation };
