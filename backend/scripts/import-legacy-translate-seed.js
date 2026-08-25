/**
 * One-time helper: rebuild seed-translate.json from git history (fallbackWords + supplements).
 * Usage: node scripts/import-legacy-translate-seed.js
 */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const OUT = path.join(__dirname, "..", "data", "ai", "seed-translate.json");
const MAX = 80 * 1024 * 1024;

function readGitJson(spec) {
  const raw = execSync(`git show ${spec}`, {
    encoding: "utf8",
    maxBuffer: MAX,
  });
  return JSON.parse(raw);
}

function normalizeKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s']/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.!?؟،؛:]+$/g, "")
    .trim();
}

const AR_RE = /[\u0600-\u06FF]/;
const LAT_RE = /[A-Za-z]/;

function isCleanWord(key, value, direction) {
  if (key.split(/\s+/).length !== 1 || value.split(/\s+/).length !== 1) return false;
  if (key.length < 2 || key.length > 20 || value.length < 2 || value.length > 25) return false;
  if (/^\d+$/.test(key)) return false;
  if (direction === "en") {
    return /^[a-z][a-z'-]*$/i.test(key) && AR_RE.test(value) && !LAT_RE.test(value);
  }
  return AR_RE.test(key) && !LAT_RE.test(key) && LAT_RE.test(value) && !AR_RE.test(value);
}

function add(maps, en, ar, tier = "curated") {
  const eng = String(en || "").trim();
  const ara = String(ar || "").trim();
  if (!eng || !ara) return;
  const enKey = normalizeKey(eng);
  const arKey = normalizeKey(ara);
  if (!enKey || !arKey) return;
  const wc = enKey.split(/\s+/).length;

  if (wc === 1 && eng.length <= 40 && ara.length <= 40) {
    const enTarget = tier === "extended" ? maps.wordsEnExt : maps.wordsEn;
    const arTarget = tier === "extended" ? maps.wordsArExt : maps.wordsAr;
    if (isCleanWord(enKey, ara, "en") && !enTarget.has(enKey)) {
      enTarget.set(enKey, ara);
    }
    if (isCleanWord(arKey, eng, "ar") && !arTarget.has(arKey)) {
      arTarget.set(arKey, eng);
    }
    return;
  }

  if (eng.length <= 120 && ara.length <= 120) {
    if (!maps.phrasesEn.has(enKey)) maps.phrasesEn.set(enKey, ara);
    if (!maps.phrasesAr.has(arKey)) maps.phrasesAr.set(arKey, eng);
  }
}

function mapToObj(map) {
  const out = {};
  for (const [k, v] of [...map.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    out[k] = v;
  }
  return out;
}

const maps = {
  phrasesEn: new Map(),
  phrasesAr: new Map(),
  wordsEn: new Map(),
  wordsAr: new Map(),
  wordsEnExt: new Map(),
  wordsArExt: new Map(),
};

try {
  const fb = readGitJson("HEAD:backend/data/fallbackWords.json");
  for (const [en, ar] of Object.entries(fb.en_to_ar || {})) {
    add(maps, en, ar, "extended");
  }
  for (const [ar, en] of Object.entries(fb.ar_to_en || {})) {
    add(maps, ar, en, "extended");
  }
} catch (err) {
  console.warn("fallbackWords:", err.message);
}

try {
  const sup = readGitJson("HEAD:backend/data/ai-supplements.json");
  for (const [en, ar] of Object.entries(sup.en_to_ar || {})) add(maps, en, ar, "curated");
} catch (err) {
  console.warn("supplements:", err.message);
}

const manual = {
  instrument: "آلة",
  "good morning": "صباح الخير",
  "good night": "تصبح على خير",
  "see you later": "إلى اللقاء",
  "how are you": "كيف حالك",
  "what happened": "ماذا حدث",
  "did you fix it": "هل أصلحته",
  "the car broke": "السيارة تعطلت",
};
for (const [en, ar] of Object.entries(manual)) {
  if (!String(en).includes(" ")) {
    const key = normalizeKey(en);
    if (key && isCleanWord(key, ar, "en")) maps.wordsEn.set(key, String(ar).trim());
  } else {
    add(maps, en, ar, "curated");
  }
}

const payload = {
  phrases_en_to_ar: mapToObj(maps.phrasesEn),
  phrases_ar_to_en: mapToObj(maps.phrasesAr),
  words_en_to_ar: mapToObj(maps.wordsEn),
  words_ar_to_en: mapToObj(maps.wordsAr),
  words_en_to_ar_ext: mapToObj(maps.wordsEnExt),
  words_ar_to_en_ext: mapToObj(maps.wordsArExt),
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(payload));
console.log(
  "seed-translate:",
  Object.keys(payload.phrases_en_to_ar).length,
  "phrases,",
  Object.keys(payload.words_en_to_ar).length,
  "curated words,",
  Object.keys(payload.words_en_to_ar_ext).length,
  "extended words",
);
