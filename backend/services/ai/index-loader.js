const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const AI_DATA_DIR = path.join(__dirname, "..", "..", "data", "ai");

const FILES = {
  smartReplies: "smart-replies.json",
  translate: "translate.json",
};

let loaded = false;
let smartReplyEntries = new Map();
let translatePhrasesEnToAr = new Map();
let translatePhrasesArToEn = new Map();
let translateWordsEnToAr = new Map();
let translateWordsArToEn = new Map();
let translateWordsEnToArExt = new Map();
let translateWordsArToEnExt = new Map();
let stats = {
  smartReplyKeys: 0,
  translatePhrases: 0,
  translateWords: 0,
  loadedAt: null,
  sources: [],
};

function readJsonFile(baseName) {
  const plainPath = path.join(AI_DATA_DIR, baseName);
  const gzPath = `${plainPath}.gz`;

  if (fs.existsSync(gzPath)) {
    const raw = zlib.gunzipSync(fs.readFileSync(gzPath));
    return JSON.parse(raw.toString("utf8"));
  }
  if (fs.existsSync(plainPath)) {
    return JSON.parse(fs.readFileSync(plainPath, "utf8"));
  }
  return null;
}

function objectToMap(obj) {
  const map = new Map();
  if (!obj || typeof obj !== "object") return map;
  for (const [key, value] of Object.entries(obj)) {
    const k = String(key || "").trim();
    if (!k) continue;
    if (Array.isArray(value)) {
      const replies = value.map((v) => String(v || "").trim()).filter(Boolean);
      if (replies.length) map.set(k, replies);
    } else if (typeof value === "string" && value.trim()) {
      map.set(k, [value.trim()]);
    }
  }
  return map;
}

function stringMap(obj) {
  const map = new Map();
  if (!obj || typeof obj !== "object") return map;
  for (const [key, value] of Object.entries(obj)) {
    const k = String(key || "").trim();
    const v = String(value || "").trim();
    if (k && v) map.set(k, v);
  }
  return map;
}

function loadAiIndexes() {
  if (loaded) return stats;

  smartReplyEntries = new Map();
  translatePhrasesEnToAr = new Map();
  translatePhrasesArToEn = new Map();
  translateWordsEnToAr = new Map();
  translateWordsArToEn = new Map();
  translateWordsEnToArExt = new Map();
  translateWordsArToEnExt = new Map();
  stats = {
    smartReplyKeys: 0,
    translatePhrases: 0,
    translateWords: 0,
    loadedAt: null,
    sources: [],
  };

  const repliesJson = readJsonFile(FILES.smartReplies);
  if (repliesJson?.entries) {
    smartReplyEntries = objectToMap(repliesJson.entries);
    stats.sources.push(repliesJson.source || "smart-replies.json");
  }

  const translateJson = readJsonFile(FILES.translate);
  if (translateJson) {
    translatePhrasesEnToAr = stringMap(translateJson.phrases_en_to_ar);
    translatePhrasesArToEn = stringMap(translateJson.phrases_ar_to_en);
    translateWordsEnToAr = stringMap(translateJson.words_en_to_ar);
    translateWordsArToEn = stringMap(translateJson.words_ar_to_en);
    translateWordsEnToArExt = stringMap(translateJson.words_en_to_ar_ext);
    translateWordsArToEnExt = stringMap(translateJson.words_ar_to_en_ext);
    stats.sources.push(translateJson.source || "translate.json");
  }

  stats.smartReplyKeys = smartReplyEntries.size;
  stats.translatePhrases =
    translatePhrasesEnToAr.size + translatePhrasesArToEn.size;
  stats.translateWords =
    translateWordsEnToAr.size +
    translateWordsArToEn.size +
    translateWordsEnToArExt.size +
    translateWordsArToEnExt.size;
  stats.loadedAt = new Date().toISOString();
  loaded = true;

  if (!stats.smartReplyKeys && !stats.translatePhrases) {
    console.warn(
      "[ai] No AI index files found in backend/data/ai/. Run: node scripts/build-ai-index.js",
    );
  } else {
    console.log(
      `[ai] indexes loaded — replies: ${stats.smartReplyKeys} keys, translate: ${stats.translatePhrases} phrases, ${stats.translateWords} words`,
    );
  }

  return stats;
}

function getSmartReplyEntries() {
  if (!loaded) loadAiIndexes();
  return smartReplyEntries;
}

function getTranslateMaps() {
  if (!loaded) loadAiIndexes();
  return {
    phrasesEnToAr: translatePhrasesEnToAr,
    phrasesArToEn: translatePhrasesArToEn,
    wordsEnToAr: translateWordsEnToAr,
    wordsArToEn: translateWordsArToEn,
    wordsEnToArExt: translateWordsEnToArExt,
    wordsArToEnExt: translateWordsArToEnExt,
  };
}

function getAiIndexStats() {
  if (!loaded) loadAiIndexes();
  return { ...stats };
}

function getAiHealthCheck() {
  const s = getAiIndexStats();
  return {
    ready: s.smartReplyKeys > 0 || s.translatePhrases > 0,
    smartReplyKeys: s.smartReplyKeys,
    translatePhrases: s.translatePhrases,
    translateWords: s.translateWords,
    sources: s.sources,
  };
}

module.exports = {
  AI_DATA_DIR,
  loadAiIndexes,
  getSmartReplyEntries,
  getTranslateMaps,
  getAiIndexStats,
  getAiHealthCheck,
};
