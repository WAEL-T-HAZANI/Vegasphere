const { RATE_LIMIT_ENABLED, RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX } =
  require("../config/env.js");
const { ApiError } = require("../services/http-error.js");

const buckets = new Map();

function prune() {
  const now = Date.now();
  for (const [key, row] of buckets) {
    if (row.resetAt <= now) buckets.delete(key);
  }
}

function rateLimit(req, res, next) {
  if (!RATE_LIMIT_ENABLED) return next();

  const key = `${req.ip || "unknown"}:${req.method}:${req.baseUrl || req.path}`;
  const now = Date.now();
  let row = buckets.get(key);
  if (!row || row.resetAt <= now) {
    row = { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
    buckets.set(key, row);
  }
  row.count += 1;

  res.setHeader("X-RateLimit-Limit", String(RATE_LIMIT_MAX));
  res.setHeader(
    "X-RateLimit-Remaining",
    String(Math.max(0, RATE_LIMIT_MAX - row.count)),
  );
  res.setHeader("X-RateLimit-Reset", String(Math.ceil(row.resetAt / 1000)));

  if (row.count > RATE_LIMIT_MAX) {
    return next(ApiError.tooManyRequests());
  }
  if (row.count % 500 === 0) prune();
  return next();
}

module.exports = rateLimit;
