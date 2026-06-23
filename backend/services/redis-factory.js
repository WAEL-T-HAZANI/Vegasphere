/**
 * Redis connection factory (ioredis). Produces fresh connections for pub/sub
 * duplicates, the Socket.io adapter, and blocking operations.
 *
 * Returns null when ioredis is unavailable or REDIS_URL is unset, so all callers
 * can degrade gracefully to single-node behavior.
 */
let Redis = null;
try {
  Redis = require("ioredis");
} catch {
  Redis = null;
}

const REDIS_URL = process.env.REDIS_URL || "";

const baseOptions = {
  lazyConnect: true,
  enableOfflineQueue: false,
  maxRetriesPerRequest: 1,
  connectTimeout: 800,
  retryStrategy: (times) => {
    if (times > 20) return null;
    return Math.min(times * 200, 3000);
  },
};

function hasRedis() {
  return Boolean(Redis && REDIS_URL);
}

function createRedisClient(overrides = {}) {
  if (!hasRedis()) return null;
  try {
    const client = new Redis(REDIS_URL, { ...baseOptions, ...overrides });
    client.on("error", (err) => {
      console.warn("Redis client error:", err.message);
    });
    client.connect?.().catch(() => {});
    return client;
  } catch (e) {
    console.warn("Redis not available:", e.message);
    return null;
  }
}

function isReady(client) {
  return Boolean(client && String(client.status || "") === "ready");
}

/** Wait for an ioredis client without calling connect() twice. */
function waitForRedis(client) {
  if (!client) return Promise.reject(new Error("No Redis client"));
  if (isReady(client)) return Promise.resolve(client);

  const status = String(client.status || "");
  if (status === "connecting" || status === "reconnecting" || status === "connect") {
    return new Promise((resolve, reject) => {
      const cleanup = () => {
        client.off("ready", onReady);
        client.off("error", onError);
      };
      const onReady = () => {
        cleanup();
        resolve(client);
      };
      const onError = (err) => {
        cleanup();
        reject(err);
      };
      client.once("ready", onReady);
      client.once("error", onError);
    });
  }

  const connect = client.connect?.();
  if (connect && typeof connect.then === "function") {
    return connect.then(() => {
      if (!isReady(client)) throw new Error("Redis client not ready");
      return client;
    });
  }
  return Promise.resolve(client);
}

module.exports = {
  hasRedis,
  createRedisClient,
  isReady,
  waitForRedis,
};
