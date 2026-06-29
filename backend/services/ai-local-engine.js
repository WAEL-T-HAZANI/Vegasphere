/**
 * Local intent-based smart replies + phrase/word translation engine.
 * Smart replies: curated JSON in backend/data/ (smartReplies.json, ai-supplements.json).
 * Translation: SQLite vega-dict.db when available; JSON fallbacks (translations.json, fallbackWords.json).
 */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const dictStore = require("./dict-store");
const { retrievePhraseReplies } = require("./phrase-retrieval.js");
const { retrieveJsonPhraseReplies } = require("./json-reply-catalog.js");

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

function mergeIntentList(base, extras) {
  const seen = new Set(base.map((i) => i.id));
  const out = [...base];
  for (const intent of extras || []) {
    if (!intent?.id || seen.has(intent.id)) continue;
    out.push(intent);
    seen.add(intent.id);
  }
  return out;
}

function loadSmartReplyIntents() {
  const smart = readJson("smartReplies.json");
  intents = Array.isArray(smart?.intents) ? [...smart.intents] : [];

  const supplements = readJson("ai-supplements.json");
  if (Array.isArray(supplements?.intents)) {
    intents = mergeIntentList(intents, supplements.intents);
  }

  if (process.env.AI_MERGE_DB_INTENTS === "1" && dictStore.isAvailable()) {
    const fromDb = dictStore.loadSmartIntents?.() || [];
    intents = mergeIntentList(intents, fromDb);
  }
}

function loadTranslationMaps() {
  if (dictStore.isAvailable()) {
    const supplements = readJson("ai-supplements.json");
    if (supplements?.phrases) mergePairMaps(supplements.phrases, phraseMaps);
    return;
  }
  loadLegacyJsonMaps();
}

function loadEngine() {
  if (loaded) return;

  phraseMaps.clear();
  wordMaps.clear();

  loadSmartReplyIntents();
  patternIndex = buildPatternIndex(intents);
  loadTranslationMaps();

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

function matchIntent(text, preferredLang, options = {}) {
  loadEngine();
  const key = normalizeKey(text);
  if (!key) return null;

  const {
    blockCategories = [],
    blockIds = [],
    minScore = 30,
  } = options;

  let best = null;
  let bestScore = 0;

  for (const entry of patternIndex) {
    if (blockCategories.includes(entry.intent?.category)) continue;
    if (blockIds.includes(entry.intentId)) continue;
    if (preferredLang && entry.lang !== preferredLang) continue;
    const score = scorePattern(key, entry);
    if (score > bestScore) {
      bestScore = score;
      best = entry.intent;
    }
  }

  if (!best && preferredLang) {
    for (const entry of patternIndex) {
      if (blockCategories.includes(entry.intent?.category)) continue;
      if (blockIds.includes(entry.intentId)) continue;
      const score = scorePattern(key, entry);
      if (score > bestScore) {
        bestScore = score;
        best = entry.intent;
      }
    }
  }

  return bestScore >= minScore ? best : null;
}

function matchIntentForContext(text, preferredLang, stats) {
  loadEngine();
  const blockCategories = stats?.ongoing ? ["greeting"] : [];
  const blockIds = stats?.ongoing
    ? ["greeting_general", "greeting_morning", "greeting_evening"]
    : [];

  if (isWellbeingQuestion(text)) {
    const wellbeing = intents.find((i) => i.id === "how_are_you");
    if (wellbeing) return wellbeing;
  }

  if (stats?.ongoing && isPureGreeting(text)) {
    const wellbeing = intents.find((i) => i.id === "how_are_you");
    if (wellbeing && isWellbeingQuestion(text)) return wellbeing;
    const gotIt = intents.find((i) => i.id === "got_it");
    if (gotIt) return gotIt;
  }

  const transcript = stats?.topics?.length
    ? `${text} ${stats.topics.join(" ")}`
    : text;

  return (
    matchIntent(text, preferredLang, { blockCategories, blockIds }) ||
    matchIntent(transcript, preferredLang, { blockCategories, blockIds })
  );
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

const STOPWORDS = new Set([
  "the",
  "and",
  "you",
  "your",
  "that",
  "this",
  "with",
  "have",
  "from",
  "they",
  "what",
  "when",
  "where",
  "which",
  "about",
  "just",
  "like",
  "been",
  "were",
  "will",
  "would",
  "could",
  "should",
  "there",
  "their",
  "them",
  "then",
  "than",
  "into",
  "some",
  "very",
  "also",
  "still",
  "hello",
  "hey",
  "good",
  "how",
  "are",
  "its",
  "was",
  "for",
  "not",
  "but",
  "all",
  "can",
  "did",
  "does",
  "doing",
  "going",
  "here",
  "right",
  "well",
  "yeah",
  "yes",
  "okay",
  "thanks",
  "thank",
  "من",
  "في",
  "على",
  "إلى",
  "الى",
  "هذا",
  "هذه",
  "ذلك",
  "كيف",
  "شو",
  "لي",
  "لك",
  "مع",
  "عن",
  "هل",
  "تمام",
  "مرحبا",
  "أهلا",
  "اهلا",
  "هلا",
]);

function isMeSender(sender) {
  const role = String(sender || "").toLowerCase();
  return ["me", "user", "assistant"].includes(role);
}

function getIncomingTexts(messages) {
  const out = [];
  if (!Array.isArray(messages)) return out;
  for (let i = messages.length - 1; i >= 0 && out.length < 6; i -= 1) {
    const item = messages[i];
    if (isMeSender(item?.sender || item?.role)) continue;
    const text = normalizeText(item?.text || item?.content);
    if (text) out.push(text);
  }
  return out.reverse();
}

function getLastOutgoingMessage(messages) {
  if (!Array.isArray(messages) || !messages.length) return "";
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const item = messages[i];
    if (!isMeSender(item?.sender || item?.role)) continue;
    const text = normalizeText(item?.text || item?.content);
    if (text) return text;
  }
  return "";
}

function countConversationDepth(messages) {
  if (!Array.isArray(messages) || !messages.length) return 0;
  let depth = 0;
  let lastSide = "";
  for (const item of messages) {
    const side = isMeSender(item?.sender || item?.role) ? "me" : "them";
    const text = normalizeText(item?.text || item?.content);
    if (!text) continue;
    if (side !== lastSide) {
      depth += 1;
      lastSide = side;
    }
  }
  return Math.max(0, Math.floor(depth / 2));
}

function extractTopics(messages, maxTopics = 4) {
  const freq = new Map();
  if (!Array.isArray(messages)) return [];

  for (const item of messages) {
    const text = normalizeText(item?.text || item?.content);
    if (!text) continue;
    for (const token of normalizeKey(text).split(/\s+/)) {
      if (token.length < 4 || STOPWORDS.has(token)) continue;
      freq.set(token, (freq.get(token) || 0) + 1);
    }
  }

  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .slice(0, maxTopics)
    .map(([word]) => word);
}

function detectConversationTone(messages) {
  const recent = (messages || [])
    .slice(-10)
    .map((item) => normalizeText(item?.text || item?.content))
    .filter(Boolean)
    .join(" ");

  if (
    /😄|😂|🤣|😅|😉|lol|lmao|haha|mostly|living the dream|notification sound|plants are still alive|relatable|vibes|grind|chaos|surviving/i.test(
      recent,
    )
  ) {
    return "funny";
  }
  if (/regards|sincerely|dear sir|respectfully|تحية|طيبة|فضلك/i.test(recent)) {
    return "formal";
  }
  if (/\b(ok|k|👍|تمام|أوكي|ok\.)\b/i.test(recent) && recent.length < 120) {
    return "short";
  }
  return "friendly";
}

function isWellbeingQuestion(text) {
  const key = normalizeKey(text);
  return (
    /\b(how are you|how r u|how are u|how you doing|how s it going|how is it going|what s up|whats up|you okay|you alright|everything ok|everything okay)\b/.test(
      key,
    ) ||
    /\b(كيف حالك|كيفك|شلونك|شو أخبارك|كيف الحال|إيش أخبارك|شو الوضع)\b/.test(
      key,
    ) ||
    /\?/.test(text)
  );
}

function isPureGreeting(text) {
  const key = normalizeKey(text);
  if (!key) return false;
  if (isWellbeingQuestion(text)) return false;
  return /^(hi|hey|hello|yo|sup|howdy|hiya|مرحب|أهلا|اهلا|هلا|سلام)\b/.test(
    key,
  );
}

function getConversationStats(messages) {
  const depth = countConversationDepth(messages);
  const topics = extractTopics(messages.slice(-14));
  const tone = detectConversationTone(messages);
  const lastIncoming = getLastIncomingMessage(messages);
  const lastOutgoing = getLastOutgoingMessage(messages);
  return {
    depth,
    topics,
    tone,
    lastIncoming,
    lastOutgoing,
    ongoing: depth >= 2,
  };
}

function getDataSource() {
  loadEngine();
  if (dictStore.isAvailable()) return "sqlite";
  const fileExists = fs.existsSync(dictStore.DB_PATH);
  if (fileExists) {
    try {
      if (fs.statSync(dictStore.DB_PATH).size >= 1024 * 1024) return "sqlite-file";
    } catch {
      /* ignore */
    }
  }
  return dictStore.getDataSource?.() || "json";
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

function buildThreadContinuityReplies(stats, language, tone = "default") {
  const lang = langCode(language);
  const { topics, lastIncoming, ongoing } = stats || {};
  if (!ongoing || !lastIncoming) return [];

  const topic = topics?.[0] || "";
  const isQuestion = isWellbeingQuestion(lastIncoming);
  const seed = hashSeed(`${lastIncoming}::${topic}::${tone}`);

  if (isQuestion) {
    if (lang === "ar") {
      const pools = topic
        ? [
            `بخير! ${topic} لسا على بالي 😄`,
            `تمام — ${topic} بعدها موجودة`,
            `الحمد لله! وأنت؟`,
          ]
        : [
            "بخير الحمد لله — وأنت؟",
            "تمام! شو أخبارك؟",
            "الحمد لله — كيف يومك؟",
          ];
      return rotatePick(pools, seed).slice(0, 3);
    }

    const pools = topic
      ? [
          `Pretty good! Still thinking about ${topic} 😄`,
          `All good — ${topic} is still a thing though`,
          `Can't complain! How about you?`,
        ]
      : [
          "Doing well, thanks! You?",
          "All good here — how's your day?",
          "Pretty good! What's new with you?",
        ];
    return rotatePick(pools, seed).slice(0, 3);
  }

  if (topic) {
    if (lang === "ar") {
      return rotatePick(
        [
          `فعلاً — ${topic} 😄`,
          `ههه ${topic} — فاهمك`,
          `تمام، ${topic} 👍`,
        ],
        seed,
      ).slice(0, 3);
    }
    return rotatePick(
      [
        `Ha — ${topic} says it all 😄`,
        `Yeah, ${topic} — I feel that`,
        `True! ${topic} energy`,
      ],
      seed,
    ).slice(0, 3);
  }

  return [];
}

function buildContextualReplies(lastText, language, tone = "default", stats = null) {
  const lang = langCode(language);
  const lower = normalizeKey(lastText);
  const raw = String(lastText || "");
  const ongoing = Boolean(stats?.ongoing);
  const patterns = [
    {
      re: /coffee|caffeine|espresso|latte|surviving|قهو|كافيين/,
      en: ["Coffee is essential ☕", "Same — caffeine powered", "Hang in there, one cup at a time"],
      ar: ["القهوة أساسية ☕", "أنا كمان على الكافيين", "تحمّل — كوب كوب"],
    },
    {
      re: /tired|exhausted|sleepy|burnout|rough day|تعب|مرهق|يوم صعب/,
      en: ["Hang in there 💪", "Rest when you can", "Rough day — I feel you"],
      ar: ["تحمّل 💪", "ارتاح لما تقدر", "يوم صعب — فاهمك"],
    },
    {
      re: /thank|thanks|thx|appreciate|شكر|مشكور/,
      en: ["You're welcome!", "Anytime 👍", "Happy to help"],
      ar: ["عفواً!", "أي وقت 👍", "العفو"],
    },
    {
      re: /\?|how are|how.s it|what.s up|كيف حال|شلونك|كيفك/,
      en: ["Doing okay — you?", "All good here, thanks for asking", "Can't complain — how about you?"],
      ar: ["بخير — وأنت؟", "تمام، شكراً للسؤال", "الحمد لله — كيف أحوالك؟"],
    },
    {
      re: /plant|notification|dream|mostly|living|happy|😄|😂|🤣/,
      en: ["Haha same vibe 😄", "Living the dream… mostly", "Good! My plants are still alive too"],
      ar: ["نفس الطاقة 😄", "عايش الحلم… تقريباً", "بخير! النباتات لسا عايشة"],
    },
    {
      re: /work|busy|meeting|deadline|شغل|مشغول/,
      en: ["Busy days — hang in there", "Good luck with it", "You'll get through it"],
      ar: ["أيام مشغولة — بالتوفيق", "بالتوفيق", "بتعديها إن شاء الله"],
    },
  ];

  if (!ongoing) {
    patterns.splice(3, 0, {
      re: /^(hi|hey|hello|yo|sup|مرحب|أهلا|سلام)/,
      en: ["Hey! 👋", "Hi there — what's up?", "Good to hear from you"],
      ar: ["مرحباً! 👋", "أهلاً — كيف الحال؟", "تشرفنا"],
    });
  }

  for (const p of patterns) {
    if (p.re.test(lower) || p.re.test(raw)) {
      const pool = lang === "ar" ? p.ar : p.en;
      const seed = hashSeed(`${raw}::${tone}::${stats?.depth || 0}`);
      const picked = rotatePick(pool, seed).slice(0, 3);
      if (picked.length) return picked;
    }
  }

  const src = detectLanguage(raw);
  if (dictStore.isAvailable() && src && lang !== src) {
    const phrase = dictStore.lookupPhrase(src, lang, raw);
    if (phrase && normalizeKey(phrase) !== lower) {
      return [phrase, lang === "ar" ? "تمام 👍" : "Got it 👍"].slice(0, 3);
    }
  }

  const words = lower.split(/\s+/).filter((w) => w.length > 3);
  const keyword = words[words.length - 1];
  if (keyword && lang === "en") {
    return [
      `Ha — "${keyword}" says it all`,
      `Yeah, ${keyword} — relatable`,
      "I hear you",
    ];
  }
  if (keyword && lang === "ar") {
    return [`فعلاً — ${keyword}`, "فاهمك", "تمام 👍"];
  }

  return [];
}

function blendUniqueReplies(lists, max = 3) {
  const out = [];
  const seen = new Set();
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const line of list) {
      const text = normalizeText(line);
      if (!text) continue;
      const key = normalizeKey(text);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(text);
      if (out.length >= max) return out;
    }
  }
  return out;
}

function resolveIntent(lastText, preferredLang, stats) {
  let intent = matchIntentForContext(lastText, preferredLang, stats);

  if (!intent && stats?.ongoing) {
    intent = matchIntentForContext(
      `${lastText} ${(stats.topics || []).join(" ")}`,
      preferredLang,
      stats,
    );
  }

  if (!intent) {
    const question = /\?|؟/.test(lastText);
    const exclaim = /!/.test(lastText);
    if (isWellbeingQuestion(lastText)) {
      intent = intents.find((i) => i.id === "how_are_you") || null;
    } else if (question) {
      intent = intents.find((i) => i.id === "question_what") || null;
    } else if (exclaim) {
      intent = intents.find((i) => i.id === "confirmation_yes") || null;
    }
  }

  return intent;
}

function buildIntentReplies(
  intent,
  language,
  effectiveTone,
  transcript,
  subject,
  variationSeed,
) {
  if (!intent) return [];
  const pool = pickReplies(intent, language, effectiveTone);
  const seed = hashSeed(
    `${transcript}::${subject}::${effectiveTone}::${variationSeed}`,
  );
  const rotated = rotatePick(pool, seed);
  const replies = rotated.slice(0, 3);
  while (replies.length < 3 && pool.length) {
    const extra = pool[replies.length % pool.length];
    if (!replies.includes(extra)) replies.push(extra);
    else break;
  }
  return replies;
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

  const stats = getConversationStats(messages);
  const lastText = stats.lastIncoming || getLastIncomingMessage(messages);
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

  const effectiveTone =
    tone && tone !== "default" ? tone : stats.tone || "default";

  const transcript = (messages || [])
    .slice(-16)
    .map((item) => {
      const side = isMeSender(item?.sender || item?.role) ? "me" : "them";
      const text = normalizeText(item?.text || item?.content);
      return text ? `${side}: ${text}` : "";
    })
    .filter(Boolean)
    .join("\n");

  const contextPreview = stats.ongoing
    ? transcript.split("\n").slice(-4).join(" · ") || lastText
    : lastText;

  const continuity = buildThreadContinuityReplies(
    stats,
    language,
    effectiveTone,
  );

  const phraseReplies = retrievePhraseReplies({
    messages,
    language: preferredLang,
    stats,
    variationSeed,
  });

  const intent = resolveIntent(lastText, preferredLang, stats);
  const intentReplies = buildIntentReplies(
    intent,
    language,
    effectiveTone,
    transcript,
    subject,
    variationSeed,
  );

  const jsonPhrases = retrieveJsonPhraseReplies({
    messages,
    language: preferredLang,
    stats: { ...stats, tone: effectiveTone },
    variationSeed,
    lastText,
  });

  const dbPhrases = phraseReplies;

  const primary = blendUniqueReplies([
    stats.ongoing ? continuity.slice(0, 1) : [],
    intentReplies,
    jsonPhrases,
  ]);

  if (primary.length >= 2) {
    const replies =
      primary.length >= 3
        ? primary
        : blendUniqueReplies([primary, dbPhrases.slice(0, 1)]);
    return {
      replies,
      intent:
        intent?.id || (jsonPhrases.length ? "json-phrases" : "thread-continuity"),
      provider: "local",
      dataSource,
      contextPreview,
    };
  }

  if (continuity.length >= 2) {
    const replies = blendUniqueReplies([
      continuity,
      jsonPhrases,
      dbPhrases.slice(0, 1),
    ]);
    if (replies.length >= 2) {
      return {
        replies,
        intent: "thread-continuity",
        provider: "local",
        dataSource,
        contextPreview,
      };
    }
  }

  const kind = String(conversationKind || "").toLowerCase();
  const groupish = kind === "group" || kind === "channel";

  if (!intent) {
    const contextual = buildContextualReplies(
      lastText,
      language,
      effectiveTone,
      stats,
    );
    if (contextual.length >= 2) {
      const replies = blendUniqueReplies([
        contextual,
        jsonPhrases,
        dbPhrases.slice(0, 1),
      ]);
      return {
        replies: replies.length >= 2 ? replies : contextual,
        intent: "contextual",
        provider: "local",
        dataSource,
        contextPreview,
      };
    }

    if (dbPhrases.length >= 2) {
      return {
        replies: blendUniqueReplies([continuity.slice(0, 1), dbPhrases]),
        intent: "phrase-retrieval",
        provider: "local",
        dataSource,
        contextPreview,
      };
    }

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
      contextPreview,
    };
  }

  const replies = blendUniqueReplies([
    intentReplies,
    jsonPhrases,
    dbPhrases.slice(0, 1),
  ]);

  return {
    replies: replies.length ? replies : ["👍", "OK", "Thanks!"],
    intent: intent.id,
    provider: "local",
    dataSource,
    contextPreview,
  };
}

function getPhraseMap(src, tgt) {
  return phraseMaps.get(pairKey(src, tgt)) || null;
}

function getWordMap(src, tgt) {
  if (dictStore.isAvailable()) {
    return null;
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
  if (dictStore.isAvailable()) {
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

function pivotTranslateCore(text, src, tgt) {
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

function pivotTranslate(text, src, tgt) {
  if (src === tgt) return { text, method: "noop" };

  const sentences = String(text)
    .split(/(?<=[.!?؟])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (sentences.length > 1) {
    const translated = sentences.map((part) => pivotTranslateCore(part, src, tgt));
    const joined = translated.map((part) => part.text).join(" ");
    const changed = translated.some((part, idx) => part.text !== sentences[idx]);
    if (changed) return { text: joined, method: "sentences" };
  }

  return pivotTranslateCore(text, src, tgt);
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
