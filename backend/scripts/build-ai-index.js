/**
 * Builds backend/data/ai/smart-replies.json.gz and translate.json.gz
 * from local seeds + optional Hugging Face datasets.
 *
 * Usage:
 *   node scripts/build-ai-index.js
 *   SKIP_HF=1 node scripts/build-ai-index.js   # seeds only (fast, offline)
 */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const axios = require("axios");

const OUT_DIR = path.join(__dirname, "..", "data", "ai");
const SEED_REPLIES = path.join(OUT_DIR, "seed-smart-replies.json");
const SEED_UNIVERSITY_REPLIES = path.join(OUT_DIR, "seed-university-replies.json");
const SEED_TRANSLATE = path.join(OUT_DIR, "seed-translate.json");
const SEED_UNIVERSITY_TRANSLATE = path.join(OUT_DIR, "seed-university-translate.json");
const CURATED_PHRASES = path.join(OUT_DIR, "curated-phrases.json");
const HF_ROWS = "https://datasets-server.huggingface.co/rows";
const SKIP_HF = String(process.env.SKIP_HF || "").trim() === "1";

const MAX_PHRASE_CHARS = 120;
const MAX_REPLY_CHARS = 280;
const MAX_WORDS_IN_WORD_LAYER = 1;

function normalizeWhitespace(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeKey(value) {
  return normalizeWhitespace(value)
    .toLowerCase()
    .replace(/'/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.!?؟،؛:]+$/g, "")
    .trim();
}

function wordCount(key) {
  return key ? key.split(/\s+/).filter(Boolean).length : 0;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function addReply(map, incoming, reply) {
  const key = normalizeKey(incoming);
  const value = normalizeWhitespace(reply).slice(0, MAX_REPLY_CHARS);
  if (!key || !value || key.length > MAX_PHRASE_CHARS) return;
  if (!map.has(key)) map.set(key, new Set());
  const set = map.get(key);
  if (set.size >= 5) return;
  set.add(value);
}

function mergeReplySeed(map, seed) {
  const entries = seed?.entries || seed || {};
  for (const [incoming, replies] of Object.entries(entries)) {
    const list = Array.isArray(replies) ? replies : [replies];
    for (const reply of list) addReply(map, incoming, reply);
  }
}

function addTranslation(phrasesEn, phrasesAr, wordsEn, wordsAr, en, ar) {
  const eng = normalizeWhitespace(en);
  const ara = normalizeWhitespace(ar);
  if (!eng || !ara) return;
  if (eng.length > MAX_PHRASE_CHARS || ara.length > MAX_PHRASE_CHARS) return;

  const enKey = normalizeKey(eng);
  const arKey = normalizeKey(ara);
  if (!enKey || !arKey) return;

  const enWords = wordCount(enKey);
  const arWords = wordCount(arKey);
  const isWord =
    Math.max(enWords, arWords) <= MAX_WORDS_IN_WORD_LAYER &&
    eng.length <= 40 &&
    ara.length <= 40;

  if (isWord) {
    if (!wordsEn.has(enKey)) wordsEn.set(enKey, ara);
    if (!wordsAr.has(arKey)) wordsAr.set(arKey, eng);
    return;
  }

  if (!phrasesEn.has(enKey)) phrasesEn.set(enKey, ara);
  if (!phrasesAr.has(arKey)) phrasesAr.set(arKey, eng);
}

function mergeCuratedPhrases(phrasesEn, phrasesAr, wordsEn, wordsAr, curated) {
  if (!curated) return;
  for (const [k, v] of Object.entries(curated.phrases_en_to_ar || {})) {
    addTranslation(phrasesEn, phrasesAr, wordsEn, wordsAr, k, v);
  }
  for (const [k, v] of Object.entries(curated.phrases_ar_to_en || {})) {
    addTranslation(phrasesEn, phrasesAr, wordsEn, wordsAr, v, k);
  }
  for (const [k, v] of Object.entries(curated.words_en_to_ar || {})) {
    if (!wordsEn.has(normalizeKey(k))) wordsEn.set(normalizeKey(k), v);
  }
  for (const [k, v] of Object.entries(curated.words_ar_to_en || {})) {
    if (!wordsAr.has(normalizeKey(k))) wordsAr.set(normalizeKey(k), v);
  }
}

function promoteMultiWordEntries(phrasesEn, phrasesAr, wordsEn, wordsAr) {
  for (const [k, v] of [...wordsEn.entries()]) {
    if (wordCount(k) >= 2) {
      if (!phrasesEn.has(k)) phrasesEn.set(k, v);
      wordsEn.delete(k);
      const arKey = normalizeKey(v);
      if (arKey && wordCount(arKey) >= 2 && !phrasesAr.has(arKey)) {
        phrasesAr.set(arKey, k.split(/\s+/).join(" "));
      }
    }
  }
  for (const [k, v] of [...wordsAr.entries()]) {
    if (wordCount(k) >= 2) {
      if (!phrasesAr.has(k)) phrasesAr.set(k, v);
      wordsAr.delete(k);
    }
  }
}

function mergeTranslateSeed(phrasesEn, phrasesAr, wordsEn, wordsAr, wordsEnExt, wordsArExt, seed) {
  if (!seed || typeof seed !== "object") return;
  for (const [k, v] of Object.entries(seed.phrases_en_to_ar || {})) {
    addTranslation(phrasesEn, phrasesAr, wordsEn, wordsAr, k, v);
  }
  for (const [k, v] of Object.entries(seed.phrases_ar_to_en || {})) {
    addTranslation(phrasesEn, phrasesAr, wordsEn, wordsAr, v, k);
  }
  for (const [k, v] of Object.entries(seed.words_en_to_ar || {})) {
    if (!wordsEn.has(k)) wordsEn.set(k, v);
  }
  for (const [k, v] of Object.entries(seed.words_ar_to_en || {})) {
    if (!wordsAr.has(k)) wordsAr.set(k, v);
  }
  for (const [k, v] of Object.entries(seed.words_en_to_ar_ext || {})) {
    if (!wordsEnExt.has(k)) wordsEnExt.set(k, v);
  }
  for (const [k, v] of Object.entries(seed.words_ar_to_en_ext || {})) {
    if (!wordsArExt.has(k)) wordsArExt.set(k, v);
  }
}

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

async function fetchHfRows(dataset, config, split, totalHint) {
  const rows = [];
  const batch = 100;
  let offset = 0;
  let total = totalHint;
  let retries = 0;

  while (offset < total) {
    const url = `${HF_ROWS}?dataset=${encodeURIComponent(dataset)}&config=${encodeURIComponent(config)}&split=${encodeURIComponent(split)}&offset=${offset}&length=${batch}`;
    try {
      const res = await axios.get(url, { timeout: 120000 });
      retries = 0;
      if (offset === 0 && Number(res.data?.num_rows_total) > 0) {
        total = Number(res.data.num_rows_total);
      }
      const chunk = Array.isArray(res.data?.rows) ? res.data.rows : [];
      if (!chunk.length) break;
      for (const item of chunk) {
        if (item?.row) rows.push(item.row);
      }
      offset += chunk.length;
      if (chunk.length < batch) break;
      process.stdout.write(`  ${dataset} ${offset}/${total}\r`);
      await sleep(250);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 429 || status === 503) {
        retries += 1;
        if (retries > 8) throw err;
        const wait = Math.min(60000, 2000 * retries);
        console.warn(`\n  ${dataset} rate limited (${status}), retry in ${wait}ms…`);
        await sleep(wait);
        continue;
      }
      throw err;
    }
  }
  process.stdout.write("\n");
  return rows;
}

function mapToSortedObject(map, limitPerKey) {
  const out = {};
  const keys = [...map.keys()].sort();
  for (const key of keys) {
    const values = map.get(key);
    if (values instanceof Set) {
      out[key] = [...values].slice(0, limitPerKey);
    } else if (typeof values === "string") {
      out[key] = values;
    }
  }
  return out;
}

function extractDialogLines(row) {
  if (Array.isArray(row?.dialog)) {
    return row.dialog.map((line) => normalizeWhitespace(line)).filter(Boolean);
  }
  if (Array.isArray(row?.conversation)) {
    return row.conversation
      .map((turn) => normalizeWhitespace(turn?.text || turn?.value || turn))
      .filter(Boolean);
  }
  if (Array.isArray(row?.conversations)) {
    return row.conversations
      .map((turn) => normalizeWhitespace(turn?.value || turn?.text))
      .filter(Boolean);
  }
  if (typeof row?.dialog === "string") {
    return row.dialog
      .split(/(?:__eou__|\n|\|)/)
      .map((line) => normalizeWhitespace(line))
      .filter(Boolean);
  }
  if (typeof row?.utterance === "string") {
    return [normalizeWhitespace(row.utterance)];
  }
  return [];
}

const DAILY_DIALOG_CANDIDATES = [
  { dataset: "agentlans/li2017dailydialog", config: "default", split: "train", hint: 13118 },
  { dataset: "frankdarkluo/DailyDialog", config: "default", split: "train", hint: 13118 },
  { dataset: "ConvLab/dailydialog", config: "default", split: "train", hint: 13118 },
  { dataset: "roskoN/dailydialog", config: "default", split: "train", hint: 13118 },
];

async function fetchDailyDialog() {
  for (const candidate of DAILY_DIALOG_CANDIDATES) {
    try {
      console.log(`[build-ai] trying DailyDialog: ${candidate.dataset}…`);
      const rows = await fetchHfRows(
        candidate.dataset,
        candidate.config,
        candidate.split,
        candidate.hint,
      );
      if (rows.length) return { rows, source: candidate.dataset };
    } catch (err) {
      console.warn(
        `[build-ai] ${candidate.dataset} failed:`,
        err?.response?.status || err?.message || err,
      );
    }
  }
  return { rows: [], source: null };
}

async function buildSmartReplies() {
  console.log("[build-ai] smart replies…");
  const replyMap = new Map();

  const seed = readJsonIfExists(SEED_REPLIES);
  if (seed) {
    mergeReplySeed(replyMap, seed);
    console.log(`[build-ai] merged seed-smart-replies (${replyMap.size} keys so far)`);
  }

  const uniSeed = readJsonIfExists(SEED_UNIVERSITY_REPLIES);
  if (uniSeed) {
    mergeReplySeed(replyMap, uniSeed);
    console.log(`[build-ai] merged seed-university-replies (${replyMap.size} keys so far)`);
  }

  const sources = [];
  if (seed) sources.push("seed-smart-replies.json");
  if (uniSeed) sources.push("seed-university-replies.json");

  if (!SKIP_HF) {
    const { rows, source } = await fetchDailyDialog();
    if (source) sources.push(source);
    for (const row of rows) {
      const lines = extractDialogLines(row);
      for (let i = 0; i < lines.length - 1; i += 1) {
        addReply(replyMap, lines[i], lines[i + 1]);
      }
    }

    try {
      const smalltalk = await fetchHfRows(
        "Hexastack/hexabot-smalltalk-trilingual",
        "default",
        "train",
        7000,
      );
      sources.push("hexabot-smalltalk-trilingual");
      for (const row of smalltalk) {
        const utterance = normalizeWhitespace(row?.utterance || row?.text);
        const response = normalizeWhitespace(row?.response || row?.answer);
        if (utterance && response) addReply(replyMap, utterance, response);
      }
    } catch (err) {
      console.warn("[build-ai] smalltalk fetch failed:", err?.message || err);
    }
  } else {
    console.log("[build-ai] SKIP_HF=1 — using seeds only");
  }

  const inlineSeed = {
    hi: ["Hey!", "Hi", "How are you?"],
    hey: ["Hey!", "Hi there", "What's up?"],
    hello: ["Hello!", "Hi", "Hey there"],
    "how are you": ["Good, you?", "Fine thanks", "All good"],
    "what happened": ["Nothing much", "Long story", "I'll tell you later"],
    "did you fix it": ["Yes", "Not yet", "Tomorrow"],
    thanks: ["You're welcome", "Anytime", "No problem"],
    "thank you": ["You're welcome", "Anytime", "No problem"],
    "مرحبا": ["أهلا!", "مرحبا", "كيفك؟"],
    "كيف حالك": ["بخير، وأنت؟", "تمام", "الحمد لله"],
    "شكرا": ["عفواً", "ولا يهمك", "أي وقت"],
  };
  for (const [incoming, replies] of Object.entries(inlineSeed)) {
    for (const reply of replies) addReply(replyMap, incoming, reply);
  }

  return {
    version: 1,
    source: sources.join(" + ") || "seed",
    builtAt: new Date().toISOString(),
    entries: mapToSortedObject(replyMap, 5),
  };
}

async function buildTranslate() {
  console.log("[build-ai] translate…");
  const phrasesEn = new Map();
  const phrasesAr = new Map();
  const wordsEn = new Map();
  const wordsAr = new Map();
  const wordsEnExt = new Map();
  const wordsArExt = new Map();

  const seed = readJsonIfExists(SEED_TRANSLATE);
  const sources = [];
  if (seed) {
    mergeTranslateSeed(
      phrasesEn,
      phrasesAr,
      wordsEn,
      wordsAr,
      wordsEnExt,
      wordsArExt,
      seed,
    );
    sources.push("seed-translate.json");
    console.log(
      `[build-ai] merged seed-translate (${Object.keys(seed.words_en_to_ar || {}).length} curated words, ${Object.keys(seed.words_en_to_ar_ext || {}).length} extended, ${Object.keys(seed.phrases_en_to_ar || {}).length} phrases)`,
    );
  }

  const uniTranslate = readJsonIfExists(SEED_UNIVERSITY_TRANSLATE);
  if (uniTranslate) {
    mergeTranslateSeed(
      phrasesEn,
      phrasesAr,
      wordsEn,
      wordsAr,
      wordsEnExt,
      wordsArExt,
      uniTranslate,
    );
    sources.push("seed-university-translate.json");
    console.log("[build-ai] merged seed-university-translate");
  }

  if (!SKIP_HF) {
    try {
      const tatoeba = await fetchHfRows(
        "ymoslem/Tatoeba-EN-AR",
        "default",
        "train",
        31000,
      );
      sources.push("Tatoeba-EN-AR");
      for (const row of tatoeba) {
        addTranslation(
          phrasesEn,
          phrasesAr,
          wordsEn,
          wordsAr,
          row?.English || row?.english,
          row?.Arabic || row?.arabic,
        );
      }
    } catch (err) {
      console.warn("[build-ai] Tatoeba fetch failed:", err?.message || err);
    }

    try {
      const gv = await fetchHfRows(
        "sentence-transformers/parallel-sentences-global-voices",
        "en-ar",
        "train",
        52000,
      );
      sources.push("Global Voices en-ar");
      for (const row of gv) {
        addTranslation(
          phrasesEn,
          phrasesAr,
          wordsEn,
          wordsAr,
          row?.english || row?.English,
          row?.non_english || row?.arabic || row?.Arabic,
        );
      }
    } catch (err) {
      console.warn("[build-ai] Global Voices fetch failed:", err?.message || err);
    }
  }

  const wordSeed = {
    instrument: "آلة",
    car: "سيارة",
    hello: "مرحبا",
    help: "مساعدة",
    water: "ماء",
    phone: "هاتف",
    doctor: "طبيب",
    yes: "نعم",
    no: "لا",
    tomorrow: "غدا",
    problem: "مشكلة",
    thanks: "شكرا",
    "good morning": "صباح الخير",
    "good night": "تصبح على خير",
    "see you later": "إلى اللقاء",
  };
  for (const [en, ar] of Object.entries(wordSeed)) {
    addTranslation(phrasesEn, phrasesAr, wordsEn, wordsAr, en, ar);
  }

  const curated = readJsonIfExists(CURATED_PHRASES);
  if (curated) {
    mergeCuratedPhrases(phrasesEn, phrasesAr, wordsEn, wordsAr, curated);
    sources.push("curated-phrases.json");
  }

  promoteMultiWordEntries(phrasesEn, phrasesAr, wordsEn, wordsAr);

  return {
    version: 1,
    source: sources.join(" + ") || "seed",
    builtAt: new Date().toISOString(),
    phrases_en_to_ar: mapToSortedObject(phrasesEn),
    phrases_ar_to_en: mapToSortedObject(phrasesAr),
    words_en_to_ar: mapToSortedObject(wordsEn),
    words_ar_to_en: mapToSortedObject(wordsAr),
    words_en_to_ar_ext: mapToSortedObject(wordsEnExt),
    words_ar_to_en_ext: mapToSortedObject(wordsArExt),
  };
}

function writeGzJson(fileName, data) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const json = JSON.stringify(data);
  const gzPath = path.join(OUT_DIR, `${fileName}.gz`);
  fs.writeFileSync(gzPath, zlib.gzipSync(json, { level: 9 }));
  const plainPath = path.join(OUT_DIR, fileName);
  fs.writeFileSync(plainPath, json);
  const mb = (fs.statSync(gzPath).size / 1024 / 1024).toFixed(2);
  console.log(`[build-ai] wrote ${gzPath} (${mb} MB gzip)`);
}

async function main() {
  const replies = await buildSmartReplies();
  writeGzJson("smart-replies.json", replies);
  console.log(
    `[build-ai] smart-replies keys: ${Object.keys(replies.entries || {}).length}`,
  );

  const translate = await buildTranslate();
  writeGzJson("translate.json", translate);
  console.log(
    `[build-ai] translate phrases en→ar: ${Object.keys(translate.phrases_en_to_ar || {}).length}, words: ${Object.keys(translate.words_en_to_ar || {}).length}`,
  );

  console.log("[build-ai] done.");
}

main().catch((err) => {
  console.error("[build-ai] failed:", err);
  process.exit(1);
});
