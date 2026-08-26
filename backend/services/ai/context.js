const { detectScript, wordCount, normalizeWhitespace } = require("./normalize.js");

const QUESTION_RE =
  /(\?|؟|^(who|what|when|where|why|how|can|could|would|will|did|do|does|is|are|was|were|should)\b|^(من|ماذا|متى|أين|لماذا|كيف|هل|شو|إيش|ايش|ليش|وين))/i;

const COMPLEX_RE =
  /\b(please|explain|help|sorry|because|although|however|problem|issue|fix|update|meeting|tomorrow|tonight|deadline)\b|(?:من فضلك|ساعد|اشرح|مشكلة|بكرة|اجتماع|موعد)/i;

const INTENT_PATTERNS = {
  university: /\b(exam|midterm|final|homework|assignment|professor|lecture|campus|thesis|quiz|graduation|tuition|scholarship|internship|lab report|group project|office hours|presentation|registration)\b|(?:امتحان|واجب|محاضرة|جامعة|دكتور|أستاذ|تخرج|منحة|تدريب|مشروع|كويز|حرم)/i,
  plans: /\b(meet|meeting|coffee|dinner|tonight|weekend|tomorrow|schedule|free|hang out|grab lunch)\b|(?:نتقابل|موعد|قهوة|عشا|فاضي|بكرة|ويكند)/i,
  support: /\b(sad|stressed|upset|worried|failed|lonely|anxious|overwhelmed|rough day|tired|exhausted)\b|(?:حزين|تعبان|زعلان|متوتر|رسبت|وحيد|قلق|يوم صعب)/i,
  thanks: /\b(thanks|thank you|thx|appreciate|grateful)\b|(?:شكرا|شكراً|مشكور|يعطيك)/i,
};

const INTENT_HINTS = {
  university: "University or school context — replies can mention studying, exams, or campus naturally.",
  plans: "Scheduling or meetup context — suggest times, places, or confirm availability.",
  support: "Emotional support context — be empathetic and reassuring.",
  thanks: "Gratitude context — acknowledge warmly and briefly.",
};

const KIND_HINTS = {
  dm: "Direct message between two people.",
  group: "Group chat — replies should work in a shared thread.",
  channel: "Channel or broadcast — keep replies brief and appropriate for many readers.",
  self: "Notes to self — short actionable replies.",
};

function detectConversationIntent({ messages = [], subject = "" } = {}) {
  const blob = [
    subject,
    ...messages.slice(-6).map((item) => normalizeWhitespace(item?.text || item?.content)),
  ]
    .filter(Boolean)
    .join(" ");

  for (const [intent, pattern] of Object.entries(INTENT_PATTERNS)) {
    if (pattern.test(blob)) return intent;
  }
  return null;
}

function buildIntentHint(intent) {
  return intent ? INTENT_HINTS[intent] || "" : "";
}

function buildConversationHint({ subject, conversationKind, intent } = {}) {
  const parts = [];
  const kind = String(conversationKind || "").toLowerCase();
  if (KIND_HINTS[kind]) parts.push(KIND_HINTS[kind]);
  const topic = normalizeWhitespace(subject).slice(0, 100);
  if (topic) parts.push(`Conversation topic: ${topic}`);
  const intentHint = buildIntentHint(intent);
  if (intentHint) parts.push(intentHint);
  return parts.join(" ");
}

function getLastIncomingText(messages = []) {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const item = messages[i];
    const role = String(item?.sender || item?.role || "").toLowerCase();
    if (["me", "user", "assistant"].includes(role)) continue;
    const text = normalizeWhitespace(item?.text || item?.content);
    if (text) return text;
  }
  return "";
}

function messageNeedsLlmBoost({ messages = [], lookupHit = false, lookupWeak = false } = {}) {
  const last = getLastIncomingText(messages);
  if (!last) return false;
  if (!lookupHit) return true;

  const words = wordCount(last);
  if (lookupWeak) return true;
  if (words >= 8) return true;
  if (QUESTION_RE.test(last)) return true;
  if (COMPLEX_RE.test(last)) return true;
  if (detectScript(last) === "mixed") return true;

  return false;
}

function isLookupWeakMatch({ messages = [], replies = [] } = {}) {
  const last = getLastIncomingText(messages);
  if (!last || !replies.length) return false;
  const words = wordCount(last);
  return words >= 6;
}

function translationNeedsGroq({
  lookupStrong = false,
  text = "",
  method = "",
  translatedText = "",
  targetLanguage = "en",
} = {}) {
  const trimmed = normalizeWhitespace(text);
  if (!trimmed) return false;

  const script = detectScript(trimmed);
  if (script === "mixed") return true;
  if (!lookupStrong) return true;
  if (method === "miss" || method === "segment" || method === "words") return true;

  const tgt = String(targetLanguage || "en").split("-")[0].toLowerCase();
  const out = String(translatedText || "");
  const hasAr = /[\u0600-\u06FF]/.test(out);
  const hasLatin = /\b[a-z]{3,}\b/i.test(out);

  if (tgt === "ar" && hasLatin && !hasAr) return true;
  if (tgt === "en" && hasAr && wordCount(trimmed) >= 3) return true;

  return false;
}

module.exports = {
  buildConversationHint,
  buildIntentHint,
  detectConversationIntent,
  getLastIncomingText,
  messageNeedsLlmBoost,
  isLookupWeakMatch,
  translationNeedsGroq,
};
