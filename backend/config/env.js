/**
 * Centralized environment configuration.
 *
 * Single source of truth for secrets and tunables. Fails fast in production when
 * critical values (e.g. JWT_SECRET) are missing or left at insecure defaults, so a
 * misconfigured deploy crashes immediately instead of silently accepting forgeable
 * tokens or reflecting every CORS origin.
 */
const NODE_ENV = process.env.NODE_ENV || "development";
const isProd = NODE_ENV === "production";

const INSECURE_JWT_DEFAULT = "change-me";
const JWT_ISSUER = process.env.JWT_ISSUER || "vegasphere";
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || "vegasphere-api";
const MIN_JWT_SECRET_LEN = 32;

function fail(message) {
  throw new Error(`[config] ${message}`);
}

// ---- JWT ----------------------------------------------------------------
const rawJwtSecret = String(process.env.JWT_SECRET || "");
if (isProd && (!rawJwtSecret || rawJwtSecret === INSECURE_JWT_DEFAULT)) {
  fail(
    "JWT_SECRET must be set to a strong, unique value in production (refusing to start with the insecure default).",
  );
}
if (isProd && rawJwtSecret.length < MIN_JWT_SECRET_LEN) {
  fail(
    `JWT_SECRET must be at least ${MIN_JWT_SECRET_LEN} characters in production.`,
  );
}
const JWT_SECRET = rawJwtSecret || INSECURE_JWT_DEFAULT;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1d";

// ---- Password hashing ---------------------------------------------------
const BCRYPT_ROUNDS = Number(
  process.env.BCRYPT_ROUNDS || (isProd ? 12 : 10),
);
if (!Number.isFinite(BCRYPT_ROUNDS) || BCRYPT_ROUNDS < 10 || BCRYPT_ROUNDS > 15) {
  fail("BCRYPT_ROUNDS must be a number between 10 and 15.");
}

// ---- Object storage (optional S3 / Cloudflare R2) ----------------------
const S3_BUCKET = String(process.env.S3_BUCKET || "").trim();
const S3_REGION = String(process.env.S3_REGION || "auto").trim();
const S3_ACCESS_KEY_ID = String(process.env.S3_ACCESS_KEY_ID || "").trim();
const S3_SECRET_ACCESS_KEY = String(process.env.S3_SECRET_ACCESS_KEY || "").trim();
const S3_ENDPOINT = String(process.env.S3_ENDPOINT || "").trim();
const S3_PUBLIC_BASE_URL = String(process.env.S3_PUBLIC_BASE_URL || "")
  .trim()
  .replace(/\/$/, "");

// ---- CORS ---------------------------------------------------------------
function parseOrigins(raw) {
  return String(raw || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const CORS_ORIGINS = parseOrigins(process.env.CORS_ORIGINS);

/** In dev, pair localhost <-> 127.0.0.1 so either loopback URL works. */
function expandDevLoopbackOrigins(origins) {
  const out = new Set(origins);
  for (const origin of origins) {
    try {
      const url = new URL(origin);
      const port = url.port || (url.protocol === "https:" ? "443" : "80");
      if (url.hostname === "localhost") {
        out.add(`${url.protocol}//127.0.0.1:${port}`);
      } else if (url.hostname === "127.0.0.1") {
        out.add(`${url.protocol}//localhost:${port}`);
      }
    } catch {
      /* ignore malformed origin entries */
    }
  }
  return Array.from(out);
}

/** In dev, allow adjacent localhost ports (e.g. 3002) for two-tab / two-user UI testing. */
function expandDevLocalhostPortRange(origins) {
  const out = new Set(origins);
  for (const origin of origins) {
    try {
      const url = new URL(origin);
      if (url.hostname !== "localhost" && url.hostname !== "127.0.0.1") continue;
      for (let port = 3000; port <= 3010; port++) {
        out.add(`${url.protocol}//localhost:${port}`);
        out.add(`${url.protocol}//127.0.0.1:${port}`);
      }
    } catch {
      /* ignore malformed origin entries */
    }
  }
  return Array.from(out);
}

/**
 * Resolve an origin value usable by both the `cors` middleware and Socket.io.
 *   - explicit allowlist (CORS_ORIGINS) -> exact-match array
 *   - development allowlist             -> also localhost/127.0.0.1 twins
 *   - production with no allowlist       -> deny cross-origin (false)
 *   - development with no allowlist       -> reflect request origin (true)
 */
function resolveCorsOrigin() {
  if (CORS_ORIGINS.length) {
    if (isProd) return CORS_ORIGINS;
    return expandDevLocalhostPortRange(expandDevLoopbackOrigins(CORS_ORIGINS));
  }
  return isProd ? false : true;
}

if (isProd && !CORS_ORIGINS.length) {
  console.warn(
    "[config] CORS_ORIGINS is empty in production; all cross-origin browser requests will be blocked. Set CORS_ORIGINS=https://app.example.com,https://...",
  );
}

// ---- HTTP body limits ---------------------------------------------------
const JSON_BODY_LIMIT = process.env.JSON_BODY_LIMIT || "1mb";
const URLENCODED_BODY_LIMIT = process.env.URLENCODED_BODY_LIMIT || "1mb";

// ---- Sessions -----------------------------------------------------------
const SESSION_TOUCH_THROTTLE_MS = Number(
  process.env.SESSION_TOUCH_THROTTLE_MS || 60_000,
);

// ---- Rate limiting (optional; off in dev unless enabled) ---------------
const RATE_LIMIT_ENABLED =
  process.env.RATE_LIMIT_ENABLED === "1" ||
  (isProd && process.env.RATE_LIMIT_ENABLED !== "0");
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX || 300);

// ---- Proxy / trust ------------------------------------------------------
const TRUST_PROXY = process.env.TRUST_PROXY === "1" || isProd;

// ---- WebRTC ICE (STUN/TURN) ---------------------------------------------
const DEFAULT_ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];

function parseIceServers(raw) {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return [...DEFAULT_ICE_SERVERS];
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
      if (parsed && Array.isArray(parsed.iceServers)) {
        return parsed.iceServers.filter(Boolean);
      }
    } catch {
      /* fall through to comma-separated urls */
    }
  }
  return trimmed
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((urls) => ({ urls }));
}

const ICE_SERVERS = parseIceServers(process.env.ICE_SERVERS);

function normalizeIceUrls(entry) {
  const urls = entry?.urls;
  if (Array.isArray(urls)) return urls.map(String);
  if (urls) return [String(urls)];
  return [];
}

function getIceServerMeta(servers = ICE_SERVERS) {
  const list = Array.isArray(servers) ? servers : [];
  const urls = list.flatMap(normalizeIceUrls);
  const hasTurn = urls.some((url) => /^turns?:/i.test(url));
  const hasStun = urls.some((url) => /^stun:/i.test(url));
  const hasSecureTurn = urls.some((url) => /^turns:/i.test(url));
  const hasTurnCredentials = list.some(
    (entry) =>
      normalizeIceUrls(entry).some((url) => /^turns?:/i.test(url)) &&
      Boolean(entry?.username && entry?.credential),
  );
  const usesPlaceholderTurn = list.some((entry) =>
    normalizeIceUrls(entry).some((url) =>
      /turn\.example\.com|turn-user|turn-pass/i.test(
        `${url} ${entry?.username || ""} ${entry?.credential || ""}`,
      ),
    ),
  );
  return {
    count: list.length,
    hasStun,
    hasTurn,
    hasSecureTurn,
    hasTurnCredentials,
    usesPlaceholderTurn,
    liveReady: hasTurn && hasTurnCredentials && !usesPlaceholderTurn,
  };
}

function getIceServers() {
  return ICE_SERVERS.length ? ICE_SERVERS : [...DEFAULT_ICE_SERVERS];
}

const iceMeta = getIceServerMeta();
if (isProd && !iceMeta.liveReady) {
  console.warn(
    "[config] ICE_SERVERS has no production-ready TURN server. Calls may fail across strict networks; configure TURN for live demos.",
  );
}

/** Destructive maintenance (e.g. purge AI bot chats) — exposed to clients via /auth/me. */
function isDestructiveMaintenanceAllowed(jwtUser = {}) {
  return (
    process.env.ALLOW_DESTRUCTIVE_MAINTENANCE === "1" ||
    jwtUser?.role === "admin" ||
    jwtUser?.isAdmin === true
  );
}

module.exports = {
  NODE_ENV,
  isProd,
  JWT_SECRET,
  JWT_EXPIRES_IN,
  JWT_ISSUER,
  JWT_AUDIENCE,
  BCRYPT_ROUNDS,
  S3_BUCKET,
  S3_REGION,
  S3_ACCESS_KEY_ID,
  S3_SECRET_ACCESS_KEY,
  S3_ENDPOINT,
  S3_PUBLIC_BASE_URL,
  CORS_ORIGINS,
  parseOrigins,
  resolveCorsOrigin,
  JSON_BODY_LIMIT,
  URLENCODED_BODY_LIMIT,
  SESSION_TOUCH_THROTTLE_MS,
  ICE_SERVERS,
  getIceServers,
  getIceServerMeta,
  RATE_LIMIT_ENABLED,
  RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX,
  TRUST_PROXY,
  isDestructiveMaintenanceAllowed,
};
