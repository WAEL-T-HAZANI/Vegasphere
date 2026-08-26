/**
 * Smoke test for enhanced smart replies + translate (no Groq required).
 */
process.env.AI_LLM_SMART_REPLIES = "off";
process.env.AI_LLM_TRANSLATE = "off";
process.env.AI_NEURAL_TRANSLATE = "0";

const { loadAiIndexes } = require("../services/ai/index-loader.js");
const { lookupSmartReplies } = require("../services/ai/lookup.js");
const { translateHybrid } = require("../services/ai/translate-hybrid.js");
const { messageNeedsLlmBoost, detectConversationIntent } = require("../services/ai/context.js");

loadAiIndexes();

function assert(name, cond) {
  if (!cond) throw new Error(`FAIL: ${name}`);
  console.log(`OK: ${name}`);
}

const casual = lookupSmartReplies({
  messages: [{ sender: "them", text: "did u fix it yet?" }],
  language: "en",
  tone: "default",
});
assert("fuzzy lookup hits did u fix", casual.replies.length > 0);

const formal = lookupSmartReplies({
  messages: [{ sender: "them", text: "hello" }],
  language: "en",
  tone: "formal",
});
assert("formal tone changes reply", formal.replies.some((r) => /Hello|Okay|\./.test(r)));

const short = lookupSmartReplies({
  messages: [{ sender: "them", text: "thanks" }],
  language: "en",
  tone: "short",
});
assert("short tone truncates", short.replies.every((r) => r.split(/\s+/).length <= 6));

const boost = messageNeedsLlmBoost({
  messages: [{ sender: "them", text: "Can you explain why the meeting moved to tomorrow?" }],
  lookupHit: true,
  lookupWeak: true,
});
assert("complex message needs LLM boost", boost === true);

const uni = lookupSmartReplies({
  messages: [{ sender: "them", text: "exam tomorow" }],
  language: "en",
  tone: "default",
});
assert("fuzzy university exam typo", uni.replies.length > 0);

const uniIntent = detectConversationIntent({
  messages: [{ sender: "them", text: "homework due tonight" }],
  subject: "CS101",
});
assert("detects university intent", uniIntent === "university");

const { mergeReplyLists } = require("../services/ai/merge-replies.js");
const merged = mergeReplyLists(["Sure!", "On it"], ["Sure!", "Thanks"], 3);
assert("merge dedupes replies", merged.length === 3 && merged[0] === "Sure!");

(async () => {
  const brb = await translateHybrid({
    text: "brb",
    sourceLanguage: "en",
    targetLanguage: "ar",
  });
  assert("brb translates", /[\u0600-\u06FF]/.test(brb.translatedText));

  const shukran = await translateHybrid({
    text: "shukran",
    sourceLanguage: "auto",
    targetLanguage: "en",
  });
  assert("shukran to english", /thank/i.test(shukran.translatedText));

  console.log("\nAll smoke tests passed.");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
