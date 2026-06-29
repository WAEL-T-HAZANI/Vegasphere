/**
 * SQLite-backed translation dictionary (MUSE + OPUS + Tatoeba).
 * Uses Node.js built-in node:sqlite (no native addons).
 */
const fs = require("fs");
const path = require("path");
const {
  getVegaDictPath,
  getWritableDataDir,
  hasSpaceForDownload,
  LEGACY_PATH,
  MIN_BYTES,
} = require("../lib/vega-dict-path.js");

const DB_PATH = getVegaDictPath();

let db = null;
let sqliteUnavailable = false;
let openAttempted = false;
let activeDbPath = DB_PATH;

function getDatabaseSync() {
  if (sqliteUnavailable) return null;
  try {
    return require("node:sqlite").DatabaseSync;
  } catch (err) {
    sqliteUnavailable = true;
    console.warn(`[ai] node:sqlite unavailable: ${err?.message || err}`);
    return null;
  }
}

function readonlyFileUri(filePath) {
  const slashPath = path.resolve(filePath).replace(/\\/g, "/");
  return `file://${slashPath}?mode=ro&immutable=1`;
}

function tryCopyToWritable(source) {
  const dest = path.join(getWritableDataDir(), "vega-dict.db");
  if (fs.existsSync(dest) && fs.statSync(dest).size >= MIN_BYTES) {
    return dest;
  }
  if (!fs.existsSync(source) || !hasSpaceForDownload(path.dirname(dest))) {
    return null;
  }
  try {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    console.log(`[ai] copying vega-dict.db to writable path (${dest})…`);
    fs.copyFileSync(source, dest);
    if (fs.statSync(dest).size >= MIN_BYTES) {
      console.log("[ai] vega-dict.db copy complete");
      return dest;
    }
  } catch (err) {
    console.warn(`[ai] vega-dict copy failed: ${err?.message || err}`);
  }
  return null;
}

function openDatabaseAt(filePath) {
  const DatabaseSync = getDatabaseSync();
  if (!DatabaseSync || !fs.existsSync(filePath)) return null;

  const attempts = [
    () => new DatabaseSync(readonlyFileUri(filePath), { readOnly: true }),
    () => new DatabaseSync(filePath, { readOnly: true }),
    () => new DatabaseSync(`file:${filePath}?mode=ro`, { readOnly: true }),
  ];

  for (const tryOpen of attempts) {
    try {
      const conn = tryOpen();
      conn.prepare("SELECT 1 AS ok").get();
      return conn;
    } catch (err) {
      console.warn(`[ai] sqlite open failed (${filePath}): ${err?.message || err}`);
    }
  }
  return null;
}

function openDatabase() {
  if (sqliteUnavailable) return null;

  let conn = openDatabaseAt(activeDbPath);
  if (conn) return conn;

  if (activeDbPath === DB_PATH && String(DB_PATH).includes("/app/data/")) {
    const copied = tryCopyToWritable(DB_PATH);
    if (copied) {
      activeDbPath = copied;
      conn = openDatabaseAt(copied);
      if (conn) return conn;
    }
  }

  if (DB_PATH !== LEGACY_PATH && fs.existsSync(LEGACY_PATH)) {
    conn = openDatabaseAt(LEGACY_PATH);
    if (conn) {
      activeDbPath = LEGACY_PATH;
      return conn;
    }
  }

  sqliteUnavailable = true;
  console.warn("[ai] vega-dict SQLite unavailable — using JSON fallbacks");
  return null;
}

function init() {
  if (sqliteUnavailable) return null;
  if (db) return db;
  if (!openAttempted) {
    openAttempted = true;
    db = openDatabase();
  }
  return db;
}

function isAvailable() {
  return Boolean(init());
}

function withConn(fn) {
  const conn = init();
  if (!conn) return null;
  try {
    return fn(conn);
  } catch (err) {
    console.warn(`[ai] sqlite query failed: ${err?.message || err}`);
    return null;
  }
}

/** @type {Map<string, Map<string, string>>} */
const wordCache = new Map();

function normalizeKey(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s']/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function lookupPhrase(src, tgt, text) {
  return withConn((conn) => {
    const candidates = [
      normalizeKey(text),
      normalizeKey(text.replace(/[.!?؟،؛:]+$/g, "")),
      normalizeKey(text.replace(/['"]/g, "")),
    ].filter(Boolean);

    const stmt = conn.prepare(
      "SELECT tgt_text FROM phrases WHERE src_lang = ? AND tgt_lang = ? AND src_key = ? LIMIT 1",
    );

    const seen = new Set();
    for (const key of candidates) {
      if (seen.has(key)) continue;
      seen.add(key);
      const row = stmt.get(src, tgt, key);
      if (row?.tgt_text) return row.tgt_text;
    }
    return null;
  });
}

/**
 * Prefix search on phrases.src_key for natural reply candidates (same language).
 * Uses PRIMARY KEY (src_lang, tgt_lang, src_key) — prefix LIKE 'token%' is indexed.
 */
function searchReplyPhraseCandidates(srcLang, tokens, options = {}) {
  const lang = String(srcLang || "en").toLowerCase();
  const limit = Math.min(200, Math.max(10, Number(options.limit) || 80));
  const rawTokens = Array.isArray(tokens) ? tokens : [];
  const uniq = [
    ...new Set(
      rawTokens
        .map((t) => normalizeKey(t))
        .filter((t) => t.length >= 2)
        .slice(0, 12),
    ),
  ];
  if (!uniq.length) return [];

  return (
    withConn((conn) => {
      const clauses = uniq.map(() => "src_key LIKE ?").join(" OR ");
      const params = [lang, ...uniq.map((t) => `${t}%`), limit];
      const rows = conn
        .prepare(
          `SELECT DISTINCT src_key FROM phrases WHERE src_lang = ? AND (${clauses}) LIMIT ?`,
        )
        .all(...params);
      return rows.map((row) => String(row?.src_key || "").trim()).filter(Boolean);
    }) || []
  );
}

function lookupWord(src, tgt, token) {
  const key = normalizeKey(token);
  if (!key) return token;

  const hit = withConn((conn) => {
    const row = conn
      .prepare(
        "SELECT tgt_text FROM words WHERE src_lang = ? AND tgt_lang = ? AND src_key = ? LIMIT 1",
      )
      .get(src, tgt, key);
    return row?.tgt_text || null;
  });
  return hit || token;
}

function hasWordSrc(srcLang, token) {
  const key = normalizeKey(token);
  if (!key) return false;
  return Boolean(
    withConn((conn) =>
      conn
        .prepare("SELECT 1 AS ok FROM words WHERE src_lang = ? AND src_key = ? LIMIT 1")
        .get(srcLang, key)?.ok,
    ),
  );
}

function hasPhraseSrc(srcLang, text) {
  const key = normalizeKey(text);
  if (!key) return false;
  return Boolean(
    withConn((conn) =>
      conn
        .prepare("SELECT 1 AS ok FROM phrases WHERE src_lang = ? AND src_key = ? LIMIT 1")
        .get(srcLang, key)?.ok,
    ),
  );
}

function getWordMapCached() {
  return null;
}

function hasSmartIntentsTable() {
  return Boolean(
    withConn((conn) =>
      conn
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'smart_intents' LIMIT 1",
        )
        .get()?.name,
    ),
  );
}

function loadSmartIntents() {
  if (!hasSmartIntentsTable()) return null;
  return withConn((conn) => {
    const rows = conn.prepare("SELECT payload FROM smart_intents ORDER BY id").all();
    const intents = [];
    for (const row of rows) {
      if (!row?.payload) continue;
      try {
        const parsed = JSON.parse(row.payload);
        if (parsed?.id) intents.push(parsed);
      } catch {
        /* skip malformed row */
      }
    }
    return intents.length ? intents : null;
  });
}

function getHealthCheck() {
  const fileExists = fs.existsSync(DB_PATH);
  let fileBytes = 0;
  if (fileExists) {
    try {
      fileBytes = fs.statSync(DB_PATH).size;
    } catch {
      /* ignore */
    }
  }
  return {
    dbPath: activeDbPath || DB_PATH,
    fileExists,
    fileBytes,
    sqlite: isAvailable(),
    source: isAvailable() ? "sqlite" : "json",
  };
}

function getStats() {
  return withConn((conn) => {
    const phraseCount = Number(
      conn.prepare("SELECT COUNT(*) AS n FROM phrases").get()?.n || 0,
    );
    const wordCount = Number(conn.prepare("SELECT COUNT(*) AS n FROM words").get()?.n || 0);
    const smartIntentCount = hasSmartIntentsTable()
      ? Number(conn.prepare("SELECT COUNT(*) AS n FROM smart_intents").get()?.n || 0)
      : 0;
    const pairs = conn
      .prepare(
        "SELECT src_lang, tgt_lang, COUNT(*) AS n FROM phrases GROUP BY src_lang, tgt_lang ORDER BY n DESC LIMIT 40",
      )
      .all();

    return {
      phraseCount,
      wordCount,
      smartIntentCount,
      topPhrasePairs: pairs,
      dbPath: activeDbPath || DB_PATH,
    };
  });
}

function clearCache() {
  wordCache.clear();
}

function close() {
  if (db) {
    try {
      db.close();
    } catch {
      /* ignore */
    }
    db = null;
  }
  wordCache.clear();
}

function getDataSource() {
  return isAvailable() ? "sqlite" : "json";
}

module.exports = {
  init,
  isAvailable,
  lookupPhrase,
  searchReplyPhraseCandidates,
  lookupWord,
  hasWordSrc,
  hasPhraseSrc,
  hasSmartIntentsTable,
  loadSmartIntents,
  getWordMapCached,
  getStats,
  getHealthCheck,
  getDataSource,
  clearCache,
  close,
  DB_PATH,
};
