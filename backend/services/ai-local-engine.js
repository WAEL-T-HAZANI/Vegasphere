/**
 * Local intent-based smart replies + phrase/word translation engine.
 * Premium mode: SQLite vega-dict.db (MUSE + OPUS + ArabEyes).
 * Fallback: legacy JSON in backend/data/.
 */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const dictStore = require("./dict-store");

const DATA_DIR = path.join(__dirname, "..", "data");

const LANGUAGE_META = [
  { code: "auto", name: "Auto detect" },
  { code: "en", name: "English" },
  { code: "ar", name: "Arabic" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "es", name: "Spanish" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
  { code: "tr", name: "Turkish" },
  { code: "ru", name: "Russian" },
  { code: "hi", name: "Hindi" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "fa", name: "Persian" },
  { code: "ur", name: "Urdu" },
];

const SUPPORTED_LANG_CODES = new Set(
  LANGUAGE_META.map((l) => l.code).filter((c) => c !== "auto"),
);

let loaded = false;
let intents = [];
let patternIndex = [];
/** @type {Map<string, Map<string, string>>} */
const phraseMaps = new Map();
/** @type {Map<string, Map<string, string>>} */
const wordMaps = new Map();

const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
const LATIN_RE = /[A-Za-zÀ-ÿ]/;
const CYRILLIC_RE = /[\u0400-\u04FF]/;
const DEVANAGARI_RE = /[\u0900-\u097F]/;
const CJK_RE = /[\u3040-\u30FF\u4E00-\u9FFF\uAC00-\uD7AF]/;

function normalizeText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeKey(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s']/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function pairKey(src, tgt) {
  return `${String(src).toLowerCase()}:${String(tgt).toLowerCase()}`;
}

function detectScript(text) {
  const value = String(text || "");
  const hasAr = ARABIC_RE.test(value);
  const hasEn = LATIN_RE.test(value);
  if (hasAr && !hasEn) return "ar";
  if (hasEn && !hasAr) return "en";
  if (hasAr && hasEn) return "mixed";
  return "unknown";
}

function countMatches(text, re) {
  return (String(text || "").match(re) || []).length;
}

const LATIN_DETECT_LANGS = ["fr", "de", "es", "it", "pt", "en", "tr"];

const FR_HINT_RE =
  /\b(le|la|les|un|une|des|du|de|je|tu|il|elle|nous|vous|ils|elles|bonjour|merci|oui|non|aller|être|etre|avoir|faire|dire|voir|venir|pouvoir|vouloir|savoir|chez|avec|pour|dans|sur|sous|très|tres|bien|mal|au|aux|ce|cet|cette|ces|mon|ton|son|notre|votre|leur|mais|ou|où|ou|donc|car|parce|quoi|comment|quand|pourquoi|salut|bonsoir|au revoir|s il vous plait|svp)\b/i;

const DE_HINT_RE =
  /\b(der|die|das|den|dem|des|ein|eine|ich|du|er|sie|wir|ihr|und|nicht|hallo|danke|bitte|guten|morgen|abend|tag|auf|aus|bei|mit|nach|von|zu|warum|wann|wo|wie|was|wer|haben|sein|werden|können|koennen|müssen|muessen|wollen|sollen|machen|gehen|kommen|sehen|wissen|gut|schlecht|sehr|auch|noch|schon|jetzt|hier|dort)\b/i;

const ES_HINT_RE =
  /\b(el|la|los|las|un|una|unos|unas|yo|tu|el|ella|nosotros|vosotros|ellos|hola|gracias|por favor|buenos|buenas|dias|días|noche|sí|si|no|qué|que|como|cómo|cuando|cuándo|donde|dónde|por qué|porque|muy|bien|mal|con|sin|para|por|de|del|al|en|ser|estar|tener|hacer|poder|decir|ir|ver|dar|saber|querer|venir|hablar|comer|beber|vivir|trabajar|estudiar|grande|pequeño|pequeno|nuevo|viejo|bueno|malo)\b/i;

const IT_HINT_RE =
  /\b(il|lo|la|i|gli|le|un|una|io|tu|lui|lei|noi|voi|loro|ciao|grazie|prego|buongiorno|buonasera|si|sì|no|che|chi|come|quando|dove|perché|perche|molto|bene|male|con|senza|per|di|del|della|dei|delle|nel|nella|essere|avere|fare|dire|andare|venire|potere|volere|dovere|sapere|vedere|dare|stare|parlare|mangiare|bere|vivere|lavorare|studia|grande|piccolo|nuovo|vecchio|buono|cattivo)\b/i;

const PT_HINT_RE =
  /\b(o|a|os|as|um|uma|uns|umas|eu|tu|ele|ela|nós|nos|vós|vos|eles|elas|olá|ola|obrigad|obrigada|bom dia|boa tarde|boa noite|sim|não|nao|que|quem|como|quando|onde|porque|muito|bem|mal|com|sem|para|por|de|do|da|dos|das|no|na|nos|nas|ser|estar|ter|fazer|dizer|ir|ver|dar|saber|querer|vir|poder|falar|comer|beber|viver|trabalhar|estudar|grande|pequeno|novo|velho|bom|mau)\b/i;

const TR_HINT_RE =
  /\b(ben|sen|o|biz|siz|onlar|ve|bir|bu|su|o|için|icin|ile|de|da|mi|mı|mu|mü|evet|hayır|hayir|merhaba|teşekkür|tesekkur|günaydın|gunaydın|iyi|kötü|kotu|çok|cok|nasıl|nasil|ne|nerede|nereye|neden|kim|var|yok|değil|degil|olmak|etmek|yapmak|gitmek|gelmek|görmek|goermek|bilmek|istemek|demek|almak|vermek|yemek|içmek|icmek|calismak|çalışmak|okumak|yazmak|buyuk|büyük|kucuk|küçük|yeni|eski|iyi|kötü|kotu)\b/i;

function memoryWordTranslation(src, tgt, token) {
  const key = normalizeKey(token);
  if (!key) return null;
  const map = wordMaps.get(pairKey(src, tgt));
  return map?.get(key) || null;
}

function scoreTokenForLanguage(lang, token) {
  const key = normalizeKey(token);
  if (!key) return 0;

  let score = 0;

  if (dictStore.isAvailable()) {
    for (const tgt of ["en", "ar"]) {
      const translated = dictStore.lookupWord(lang, tgt, key);
      if (translated && normalizeKey(translated) !== key) score += 3;
    }
    if (dictStore.hasWordSrc(lang, key)) score += 0.25;
  } else {
    for (const tgt of ["en", "ar"]) {
      const translated = memoryWordTranslation(lang, tgt, key);
      if (translated && normalizeKey(translated) !== key) score += 3;
    }
    for (const tgt of SUPPORTED_LANG_CODES) {
      if (tgt === lang) continue;
      if (memoryWordTranslation(lang, tgt, key)) {
        score += 0.25;
        break;
      }
    }
  }

  return score;
}

function detectLatinLanguage(text) {
  loadEngine();

  const lower = normalizeKey(text);
  const tokens = lower.split(/\s+/).filter(Boolean);
  if (!tokens.length) return "en";

  if (FR_HINT_RE.test(lower)) return "fr";
  if (DE_HINT_RE.test(lower)) return "de";
  if (ES_HINT_RE.test(lower)) return "es";
  if (IT_HINT_RE.test(lower)) return "it";
  if (PT_HINT_RE.test(lower)) return "pt";
  if (TR_HINT_RE.test(lower)) return "tr";

  let best = "en";
  let bestScore = 0;

  for (const lang of LATIN_DETECT_LANGS) {
    let score = 0;
    for (const token of tokens) {
      score += scoreTokenForLanguage(lang, token);
    }

    if (dictStore.isAvailable()) {
      if (dictStore.hasPhraseSrc(lang, text)) score += tokens.length;
      for (const tgt of ["en", "ar"]) {
        const phrase = dictStore.lookupPhrase(lang, tgt, text);
        if (phrase && normalizeKey(phrase) !== lower)
          score += tokens.length * 2;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      best = lang;
    }
  }

  if (bestScore > 0) return best;

  if (/[àâæçéèêëîïôùûüœ]/i.test(text)) return "fr";
  if (/[äöüß]/i.test(text)) return "de";
  if (/[ñ¿¡]/i.test(text)) return "es";
  if (/[ãõ]/i.test(text)) return "pt";

  return "en";
}

function detectLanguage(text) {
  const value = normalizeText(text);
  if (!value) return "en";

  const arN = countMatches(value, ARABIC_RE);
  const latN = countMatches(value, LATIN_RE);
  const cyN = countMatches(value, CYRILLIC_RE);
  const devN = countMatches(value, DEVANAGARI_RE);
  const cjkN = countMatches(value, CJK_RE);

  if (arN >= 2 && arN >= latN) return "ar";
  if (cyN >= 2 && cyN >= latN) return "ru";
  if (devN >= 2) return "hi";
  if (cjkN >= 2) {
    if (/[\u3040-\u30FF]/.test(value)) return "ja";
    if (/[\uAC00-\uD7AF]/.test(value)) return "ko";
    return "ja";
  }

  if (latN > 0) {
    return detectLatinLanguage(value);
  }

  const script = detectScript(value);
  if (script === "ar") return "ar";
  return "en";
}

function langCode(code) {
  const value = String(code || "en")
    .split("-")[0]
    .toLowerCase();
  return SUPPORTED_LANG_CODES.has(value) ? value : "en";
}

function readJson(file) {
  const full = path.join(DATA_DIR, file);
  const gzFull = `${full}.gz`;

  if (fs.existsSync(full)) {
    return JSON.parse(fs.readFileSync(full, "utf8"));
  }
  if (fs.existsSync(gzFull)) {
    const raw = zlib.gunzipSync(fs.readFileSync(gzFull)).toString("utf8");
    return JSON.parse(raw);
  }
  return null;
}

function loadLegacyJsonMaps() {
  const skipPhraseMap =
    process.env.AI_SKIP_PHRASE_MAP === "1" ||
    (process.env.NODE_ENV === "production" &&
      process.env.AI_LOAD_PHRASE_MAP !== "1" &&
      !dictStore.isAvailable());

  if (!skipPhraseMap) {
    const translations = readJson("translations.json");
    if (translations) ingestPairMaps(translations, "phrase", phraseMaps);
  }

  const fallback = readJson("fallbackWords.json");
  if (fallback) ingestPairMaps(fallback, "word", wordMaps);

  const supplementPath = path.join(DATA_DIR, "ai-supplements.json");
  if (fs.existsSync(supplementPath)) {
    const supplements = readJson("ai-supplements.json");
    if (supplements?.phrases) mergePairMaps(supplements.phrases, phraseMaps);
    if (supplements?.words) mergePairMaps(supplements.words, wordMaps);
    if (Array.isArray(supplements?.intents) && supplements.intents.length) {
      const seen = new Set(intents.map((i) => i.id));
      for (const intent of supplements.intents) {
        if (!intent?.id || seen.has(intent.id)) continue;
        intents.push(intent);
        seen.add(intent.id);
      }
      patternIndex = buildPatternIndex(intents);
    }
  }
}

function mergePairMaps(json, targetMap) {
  if (!json || typeof json !== "object") return;
  for (const [k, v] of Object.entries(json)) {
    if (!k.includes("_to_")) continue;
    const [src, tgt] = k.split("_to_");
    if (!src || !tgt || typeof v !== "object") continue;
    const key = pairKey(src, tgt);
    let map = targetMap.get(key);
    if (!map) {
      map = new Map();
      targetMap.set(key, map);
    }
    for (const [phrase, translated] of Object.entries(v)) {
      if (phrase && translated) map.set(phrase, String(translated));
    }
  }
}

function ingestPairMaps(json, _prefix, targetMap) {
  mergePairMaps(json, targetMap);
}

function buildPatternIndex(intentList) {
  const index = [];
  for (const intent of intentList) {
    for (const lang of ["en", "ar"]) {
      const patterns = intent.patterns?.[lang] || [];
      for (const pattern of patterns) {
        const key = normalizeKey(pattern);
        if (!key) continue;
        index.push({
          intentId: intent.id,
          intent,
          lang,
          pattern: key,
          tokens: key.split(/\s+/).filter(Boolean),
        });
      }
    }
  }
  return index;
}

function loadEngine() {
  if (loaded) return;

  phraseMaps.clear();
  wordMaps.clear();
  dictStore.init();

  const fromDb = dictStore.loadSmartIntents?.();
  if (fromDb?.length) {
    intents = [...fromDb];
  } else {
    const smart = readJson("smartReplies.json");
    intents = Array.isArray(smart?.intents) ? [...smart.intents] : [];
  }
  patternIndex = buildPatternIndex(intents);

  if (!dictStore.isAvailable()) {
    loadLegacyJsonMaps();
  } else {
    const supplementPath = path.join(DATA_DIR, "ai-supplements.json");
    if (fs.existsSync(supplementPath)) {
      const supplements = readJson("ai-supplements.json");
      if (Array.isArray(supplements?.intents) && supplements.intents.length) {
        const seen = new Set(intents.map((i) => i.id));
        for (const intent of supplements.intents) {
          if (!intent?.id || seen.has(intent.id)) continue;
          intents.push(intent);
          seen.add(intent.id);
        }
        patternIndex = buildPatternIndex(intents);
      }
    }
  }

  loaded = true;
}

function reloadEngine() {
  loaded = false;
  dictStore.close();
  loadEngine();
}

function scorePattern(inputKey, entry) {
  const inputTokens = inputKey.split(/\s+/).filter(Boolean);
  const patternTokens = entry.tokens;

  if (!inputKey || !entry.pattern) return 0;

  if (inputKey === entry.pattern) return 100;
  if (inputKey.includes(entry.pattern) || entry.pattern.includes(inputKey)) {
    return 80 + Math.min(entry.pattern.length, 20);
  }

  let overlap = 0;
  for (const token of patternTokens) {
    if (inputTokens.includes(token)) overlap += 1;
  }

  if (!overlap) return 0;

  const ratio = overlap / Math.max(patternTokens.length, 1);
  return 30 + ratio * 40 + overlap * 5;
}

function matchIntent(text, preferredLang) {
  loadEngine();
  const key = normalizeKey(text);
  if (!key) return null;

  let best = null;
  let bestScore = 0;

  for (const entry of patternIndex) {
    if (preferredLang && entry.lang !== preferredLang) continue;
    const score = scorePattern(key, entry);
    if (score > bestScore) {
      bestScore = score;
      best = entry.intent;
    }
  }

  if (!best && preferredLang) {
    for (const entry of patternIndex) {
      const score = scorePattern(key, entry);
      if (score > bestScore) {
        bestScore = score;
        best = entry.intent;
      }
    }
  }

  return bestScore >= 30 ? best : null;
}

function pickReplies(intent, language, tone) {
  const lang = langCode(language);
  const toneKey = ["default", "friendly", "formal", "short", "funny"].includes(
    tone,
  )
    ? tone
    : "default";

  const pool =
    intent?.replies?.[lang]?.[toneKey] ||
    intent?.replies?.[lang]?.default ||
    intent?.replies?.en?.[toneKey] ||
    intent?.replies?.en?.default ||
    [];

  return Array.isArray(pool) ? pool.filter(Boolean) : [];
}

function rotatePick(items, seed) {
  if (!items.length) return [];
  const offset = Math.abs(seed) % items.length;
  const out = [];
  for (let i = 0; i < items.length; i += 1) {
    out.push(items[(offset + i) % items.length]);
  }
  return out;
}

function hashSeed(text) {
  let h = 0;
  const s = String(text || "");
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return h;
}

function getIncomingTexts(messages) {
  const out = [];
  if (!Array.isArray(messages)) return out;
  for (let i = messages.length - 1; i >= 0 && out.length < 3; i -= 1) {
    const item = messages[i];
    const sender = String(item?.sender || item?.role || "").toLowerCase();
    if (["me", "user", "assistant"].includes(sender)) continue;
    const text = normalizeText(item?.text || item?.content);
    if (text) out.push(text);
  }
  return out.reverse();
}

function getDataSource() {
  loadEngine();
  return (
    dictStore.getDataSource?.() || (dictStore.isAvailable() ? "sqlite" : "json")
  );
}

function getLastIncomingMessage(messages) {
  if (!Array.isArray(messages) || !messages.length) return "";
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const item = messages[i];
    const sender = String(item?.sender || item?.role || "").toLowerCase();
    const text = normalizeText(item?.text || item?.content);
    if (!text) continue;
    if (sender === "me" || sender === "user" || sender === "assistant")
      continue;
    return text;
  }
  const last = messages[messages.length - 1];
  const lastSender = String(last?.sender || last?.role || "").toLowerCase();
  if (["me", "user", "assistant"].includes(lastSender)) return "";
  return normalizeText(last?.text || last?.content);
}

function generateSmartReplies({
  messages = [],
  language = "en",
  tone = "default",
  subject = "",
  conversationKind = "",
  variationSeed = 0,
}) {
  loadEngine();

  const lastText = getLastIncomingMessage(messages);
  const dataSource = getDataSource();
  if (!lastText) {
    const fallback = language.startsWith("ar")
      ? ["👍", "تمام", "شكراً"]
      : ["👍", "Sounds good", "Thanks!"];
    return {
      replies: fallback,
      intent: null,
      provider: "local",
      dataSource,
      contextPreview: "",
    };
  }

  const script = detectScript(lastText);
  const preferredLang =
    script === "ar" ? "ar" : script === "en" ? "en" : langCode(language);

  const incomingTexts = getIncomingTexts(messages);
  const contextBlock =
    incomingTexts.length > 1 ? incomingTexts.join(" ") : lastText;

  let intent =
    matchIntent(contextBlock, preferredLang) ||
    matchIntent(lastText, preferredLang);

  if (!intent) {
    const question = /\?|؟/.test(lastText);
    const exclaim = /!/.test(lastText);
    if (question)
      intent = intents.find((i) => i.id === "question_what") || null;
    else if (exclaim)
      intent = intents.find((i) => i.id === "confirmation_yes") || null;
  }

  const kind = String(conversationKind || "").toLowerCase();
  const groupish = kind === "group" || kind === "channel";

  if (!intent) {
    const generic =
      langCode(language) === "ar"
        ? groupish
          ? ["تمام 👍", "حاضر", "شكراً للمشاركة"]
          : ["تمام 👍", "حاضر", "أوكي"]
        : groupish
          ? ["👍", "Thanks for sharing", "Got it"]
          : ["👍", "Sounds good", "OK"];
    return {
      replies: generic,
      intent: null,
      provider: "local",
      dataSource,
      contextPreview: lastText,
    };
  }

  const pool = pickReplies(intent, language, tone);
  const seed = hashSeed(
    `${contextBlock}::${subject}::${tone}::${variationSeed}`,
  );
  const rotated = rotatePick(pool, seed);
  const replies = rotated.slice(0, 3);

  while (replies.length < 3 && pool.length) {
    const extra = pool[replies.length % pool.length];
    if (!replies.includes(extra)) replies.push(extra);
    else break;
  }

  return {
    replies: replies.length ? replies : ["👍", "OK", "Thanks!"],
    intent: intent.id,
    provider: "local",
    dataSource,
    contextPreview: lastText,
  };
}

function getPhraseMap(src, tgt) {
  return phraseMaps.get(pairKey(src, tgt)) || null;
}

function getWordMap(src, tgt) {
  if (dictStore.isAvailable()) {
    return dictStore.getWordMapCached(src, tgt);
  }
  return wordMaps.get(pairKey(src, tgt)) || null;
}

function lookupPhrase(text, src, tgt) {
  if (dictStore.isAvailable()) {
    const premium = dictStore.lookupPhrase(src, tgt, text);
    if (premium) return premium;
  }

  const map = getPhraseMap(src, tgt);
  if (!map) return null;

  const candidates = [
    normalizeKey(text),
    normalizeKey(text.replace(/[.!?؟،؛:]+$/g, "")),
    normalizeKey(text.replace(/['"]/g, "")),
  ].filter(Boolean);

  const seen = new Set();
  for (const key of candidates) {
    if (seen.has(key)) continue;
    seen.add(key);
    const hit = map.get(key);
    if (hit) return hit;
  }
  return null;
}

function translateToken(token, src, tgt) {
  const key = normalizeKey(token);
  if (!key) return token;

  if (dictStore.isAvailable()) {
    const hit = dictStore.lookupWord(src, tgt, token);
    if (normalizeKey(hit) !== key) return hit;
  }

  const direct = getWordMap(src, tgt);
  if (direct?.has(key)) return direct.get(key);

  return token;
}

function translateByWords(text, src, tgt) {
  const map = getWordMap(src, tgt);
  if (!map || !map.size) return null;

  const parts = String(text || "").split(/(\s+|[.,!?؟،؛:;])/);
  let changed = false;
  const out = parts.map((part) => {
    if (!part || /^\s+$/.test(part) || /^[.,!?؟،؛:;]$/.test(part)) return part;
    const translated = translateToken(part, src, tgt);
    if (normalizeKey(translated) !== normalizeKey(part)) changed = true;
    return translated;
  });
  return changed ? out.join("") : null;
}

/** Always emit a token-wise translation (unknown tokens kept only as last resort). */
function translateByWordsForced(text, src, tgt) {
  const parts = String(text || "").split(/(\s+|[.,!?؟،؛:;])/);
  let changed = false;
  const out = parts.map((part) => {
    if (!part || /^\s+$/.test(part) || /^[.,!?؟،؛:;]$/.test(part)) return part;
    const translated = translateToken(part, src, tgt);
    if (normalizeKey(translated) !== normalizeKey(part)) changed = true;
    return translated;
  });
  return { text: out.join(""), changed };
}

function pivotTranslate(text, src, tgt) {
  if (src === tgt) return { text, method: "noop" };

  const directPhrase = lookupPhrase(text, src, tgt);
  if (directPhrase) return { text: directPhrase, method: "phrase" };

  const directWords = translateByWords(text, src, tgt);
  if (directWords) return { text: directWords, method: "words" };

  if (src !== "en" && tgt !== "en") {
    const toEnPhrase = lookupPhrase(text, src, "en");
    const mid = toEnPhrase || translateByWords(text, src, "en");
    if (mid && mid !== text) {
      const finalPhrase = lookupPhrase(mid, "en", tgt);
      if (finalPhrase) return { text: finalPhrase, method: "pivot-phrase" };
      const finalWords = translateByWords(mid, "en", tgt);
      if (finalWords) return { text: finalWords, method: "pivot-words" };
    }
    const pivotViaEn = translateByWordsForced(text, src, "en");
    if (pivotViaEn.changed) {
      const second = translateByWordsForced(pivotViaEn.text, "en", tgt);
      if (second.changed) return { text: second.text, method: "pivot-words" };
    }
  }

  const forced = translateByWordsForced(text, src, tgt);
  if (forced.changed) return { text: forced.text, method: "words" };

  if (src !== "en" && tgt !== "en") {
    const toEn = translateByWordsForced(text, src, "en");
    const toTgt = translateByWordsForced(toEn.text, "en", tgt);
    if (toTgt.changed) return { text: toTgt.text, method: "pivot-words" };
  }

  return { text, method: "words" };
}

function resolveDirection(source, target, text) {
  let src = String(source || "auto").toLowerCase();
  let tgt = langCode(target || "en");

  if (src === "auto") {
    src = detectLanguage(text);
  } else {
    src = langCode(src);
  }

  if (!SUPPORTED_LANG_CODES.has(tgt)) tgt = "en";
  if (!SUPPORTED_LANG_CODES.has(src)) src = detectLanguage(text);

  const autoSource = String(source || "auto").toLowerCase() === "auto";
  if (autoSource && src === tgt) {
    tgt = src === "ar" ? "en" : "ar";
  }

  return { src, tgt };
}

function translateTextLocal(text, sourceLanguage, targetLanguage) {
  loadEngine();

  const trimmed = normalizeText(text);
  if (!trimmed) {
    return {
      translatedText: "",
      provider: "local",
      method: "empty",
      detectedSource: "auto",
    };
  }

  const { src, tgt } = resolveDirection(
    sourceLanguage,
    targetLanguage,
    trimmed,
  );
  const result = pivotTranslate(trimmed, src, tgt);
  const dataSource = getDataSource();

  return {
    translatedText: result.text,
    provider: dataSource === "sqlite" ? "premium-sqlite" : "legacy-json",
    dataSource,
    method: result.method,
    detectedSource: src,
    targetLanguage: tgt,
  };
}

function getEngineStats() {
  loadEngine();
  if (dictStore.isAvailable()) {
    const dbStats = dictStore.getStats();
    const dbSize = fs.existsSync(dictStore.DB_PATH)
      ? fs.statSync(dictStore.DB_PATH).size
      : 0;
    return {
      provider: "premium-sqlite",
      intents: intents.length,
      patterns: patternIndex.length,
      languages: LANGUAGE_META.filter((l) => l.code !== "auto").length,
      phrasesTotal: dbStats?.phraseCount || 0,
      wordsTotal: dbStats?.wordCount || 0,
      dbMb: (dbSize / 1024 / 1024).toFixed(1),
      topPhrasePairs: dbStats?.topPhrasePairs?.slice(0, 12) || [],
    };
  }

  const phraseCounts = {};
  const wordCounts = {};
  for (const [key, map] of phraseMaps) {
    phraseCounts[key] = map.size;
  }
  for (const [key, map] of wordMaps) {
    wordCounts[key] = map.size;
  }
  return {
    provider: "legacy-json",
    intents: intents.length,
    patterns: patternIndex.length,
    languages: LANGUAGE_META.filter((l) => l.code !== "auto").length,
    phrases: phraseCounts,
    fallbackWords: wordCounts,
    phrasesTotal: Object.values(phraseCounts).reduce((a, b) => a + b, 0),
    wordsTotal: Object.values(wordCounts).reduce((a, b) => a + b, 0),
  };
}

function getSupportedLanguages() {
  return LANGUAGE_META.slice();
}

module.exports = {
  loadEngine,
  reloadEngine,
  detectScript,
  detectLanguage,
  matchIntent,
  generateSmartReplies,
  translateTextLocal,
  getEngineStats,
  getSupportedLanguages,
  getDataSource,
};
