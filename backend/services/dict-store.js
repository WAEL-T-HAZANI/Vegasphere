/**
 * SQLite-backed translation dictionary (MUSE + OPUS + Tatoeba).
 * Uses Node.js built-in node:sqlite (no native addons).
 */
const fs = require("fs");
const { getVegaDictPath } = require("../lib/vega-dict-path.js");

const DB_PATH = getVegaDictPath();

let db = null;
let sqliteUnavailable = false;

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

function openDatabase() {
  const DatabaseSync = getDatabaseSync();
  if (!DatabaseSync || !fs.existsSync(DB_PATH)) return null;

  const attempts = [
    () => new DatabaseSync(`file:${DB_PATH}?mode=ro&immutable=1`, { readOnly: true }),
    () => new DatabaseSync(DB_PATH, { readOnly: true }),
  ];

  for (const tryOpen of attempts) {
    try {
      return tryOpen();
    } catch (err) {
      console.warn(`[ai] sqlite open failed (${DB_PATH}): ${err?.message || err}`);
    }
  }
  return null;
}

function init() {
  if (db) return db;
  db = openDatabase();
  return db;
}

function isAvailable() {
  return Boolean(init());
}

function lookupPhrase(src, tgt, text) {
  const conn = init();
  if (!conn) return null;

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
}

function lookupWord(src, tgt, token) {
  const key = normalizeKey(token);
  if (!key) return token;

  const map = getWordMapCached(src, tgt);
  if (map?.has(key)) return map.get(key);

  const conn = init();
  if (!conn) return token;
  const row = conn
    .prepare(
      "SELECT tgt_text FROM words WHERE src_lang = ? AND tgt_lang = ? AND src_key = ? LIMIT 1",
    )
    .get(src, tgt, key);
  if (row?.tgt_text) return row.tgt_text;

  return token;
}

function hasWordSrc(srcLang, token) {
  const key = normalizeKey(token);
  if (!key || !init()) return false;
  const row = db
    .prepare("SELECT 1 AS ok FROM words WHERE src_lang = ? AND src_key = ? LIMIT 1")
    .get(srcLang, key);
  return Boolean(row?.ok);
}

function hasPhraseSrc(srcLang, text) {
  const key = normalizeKey(text);
  if (!key || !init()) return false;
  const row = db
    .prepare("SELECT 1 AS ok FROM phrases WHERE src_lang = ? AND src_key = ? LIMIT 1")
    .get(srcLang, key);
  return Boolean(row?.ok);
}
function getWordMapCached(src, tgt) {
  const key = `${String(src).toLowerCase()}:${String(tgt).toLowerCase()}`;
  if (wordCache.has(key)) return wordCache.get(key);

  const conn = init();
  if (!conn) return null;

  const stmt = conn.prepare(
    "SELECT src_key, tgt_text FROM words WHERE src_lang = ? AND tgt_lang = ?",
  );
  const map = new Map();
  for (const row of stmt.iterate(src, tgt)) {
    if (row.src_key && row.tgt_text) map.set(row.src_key, row.tgt_text);
  }
  wordCache.set(key, map);
  return map;
}

function hasSmartIntentsTable() {
  const conn = init();
  if (!conn) return false;
  try {
    const row = conn
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'smart_intents' LIMIT 1",
      )
      .get();
    return Boolean(row?.name);
  } catch {
    return false;
  }
}

function loadSmartIntents() {
  const conn = init();
  if (!conn || !hasSmartIntentsTable()) return null;

  try {
    const rows = conn
      .prepare("SELECT payload FROM smart_intents ORDER BY id")
      .all();
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
  } catch {
    return null;
  }
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
  const sqlite = isAvailable();
  return {
    dbPath: DB_PATH,
    fileExists,
    fileBytes,
    sqlite,
    source: sqlite ? "sqlite" : "json",
  };
}

function getStats() {
  const conn = init();
  if (!conn) return null;

  const phraseCount = Number(conn.prepare("SELECT COUNT(*) AS n FROM phrases").get()?.n || 0);
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
    dbPath: DB_PATH,
  };
}

function clearCache() {
  wordCache.clear();
}

function close() {
  if (db) {
    db.close();
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
