/**
 * Expand seed-smart-replies.json from git history (replyPairs + smartReplies).
 * Usage: node scripts/import-legacy-replies-seed.js
 */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const OUT = path.join(__dirname, "..", "data", "ai", "seed-smart-replies.json");
const MAX = 50 * 1024 * 1024;

function readGitJson(spec) {
  try {
    const raw = execSync(`git show ${spec}`, { encoding: "utf8", maxBuffer: MAX });
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function normalizeKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.!?؟،؛:]+$/g, "")
    .trim();
}

function addEntry(entries, incoming, replies) {
  const key = normalizeKey(incoming);
  if (!key || key.length > 120) return;
  const list = (Array.isArray(replies) ? replies : [replies])
    .map((r) => String(r || "").trim().slice(0, 280))
    .filter(Boolean);
  if (!list.length) return;
  if (!entries[key]) entries[key] = [];
  const set = new Set(entries[key]);
  for (const r of list) {
    if (set.size >= 5) break;
    set.add(r);
  }
  entries[key] = [...set];
}

const entries = {};
const existing = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : {};
for (const [k, v] of Object.entries(existing.entries || existing)) {
  addEntry(entries, k, v);
}

const smartReplies = readGitJson("HEAD:backend/data/smartReplies.json");
if (smartReplies?.intents) {
  for (const intent of smartReplies.intents) {
    for (const trigger of intent.triggers || []) {
      addEntry(entries, trigger, intent.replies || []);
    }
  }
} else if (smartReplies && typeof smartReplies === "object") {
  for (const [k, v] of Object.entries(smartReplies)) {
    if (k === "version" || k === "generatedAt") continue;
    addEntry(entries, k, v);
  }
}

const replyPairs = readGitJson("HEAD:backend/data/replyPairs.json");
if (replyPairs && typeof replyPairs === "object") {
  for (const [incoming, reply] of Object.entries(replyPairs)) {
    addEntry(entries, incoming, reply);
  }
}

const extra = {
  "are you coming tonight": ["Yes! What time?", "Maybe — let me check", "Can't make it sadly"],
  "did you get my message": ["Yes, just saw it!", "Not yet — resend?", "Got it 👍"],
  "why didn't you answer": ["Sorry, was busy!", "Didn't see it", "My bad, here now"],
  "why didnt you answer": ["Sorry, was busy!", "Didn't see it", "My bad, here now"],
  "can we talk later": ["Sure, whenever works", "Yeah call me later", "Busy right now though"],
  "i'm running late sorry": ["No rush!", "OK see you soon", "Drive safe!"],
  "traffic is terrible today": ["Same here 😅", "Leave early if you can", "Ugh, good luck"],
  "i'm so stressed out": ["Hang in there 💪", "Want to talk?", "Take a breather"],
  "don't worry about it": ["Thanks, means a lot", "You're the best", "OK if you're sure"],
  "let me know when you're free": ["Will do!", "How about tomorrow?", "I'll text you"],
  "that sounds amazing": ["Right?!", "Glad you think so!", "Can't wait"],
  "i don't understand": ["I'll explain", "Which part?", "Let me clarify"],
  "can you explain that again": ["Sure, one sec", "Of course!", "Happy to"],
  "what time should we meet": ["How about 7?", "You pick!", "After work?"],
  "i'll be there in 10 minutes": ["OK!", "See you soon", "Take your time"],
  "did you eat yet": ["Not yet, you?", "Yeah just ate", "Starving actually"],
  "want to grab lunch": ["Sure!", "What time?", "I'm down"],
  "happy birthday btw": ["Thank you! 🎂", "Thanks so much!", "You're sweet!"],
  "merry christmas": ["Merry Christmas! 🎄", "You too!", "Same to you!"],
  "happy new year": ["Happy New Year! 🎉", "You too!", "Cheers to that!"],
  "هل وصلت": ["لسا بالطريق", "هلا! أيوه", "قرب أوصل"],
  "ليش ما رديت": ["آسف كنت مشغول", "ما شفت", "معذرة"],
  "بدي احكي معك": ["أكيد", "اتصل متى ما بدك", "أنا هون"],
  "وين رحت": ["بالشغل", "برجع قريب", "طلعت شوي"],
  "متى بنتقابل": ["بكرة؟", "انت اختار", "بعد الشغل"],
  "تعبت كتير اليوم": ["ارتاح شوي", "فاهمك", "تحمّل 💪"],
  "ما فهمت عليك": ["خليني اشرح", "أي جزء؟", "بعيد الشرح"],
  "بدك تتغدى": ["يلا", "يمتى؟", "جوعان"],
  "عيد ميلادك امتى": ["الشهر الجاي!", "ليه 😄", "بقولك لاحقاً"],
};

for (const [k, v] of Object.entries(extra)) addEntry(entries, k, v);

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ entries }, null, 0));
console.log("seed-smart-replies keys:", Object.keys(entries).length);
