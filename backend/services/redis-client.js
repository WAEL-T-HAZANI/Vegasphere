/**
 * Optional shared Redis command client (ioredis).
 *
 * If REDIS_URL is unset, this exports `null` and the app degrades gracefully:
 * presence falls back to in-process counters and Socket.io runs single-node.
 *
 * For pub/sub duplicates and the Socket.io adapter, use `lib/redis_factory.js`'s
 * `createRedisClient()` to get fresh, independent connections.
 */
const { createRedisClient } = require("./redis-factory.js");

const client = createRedisClient();

module.exports = client;
