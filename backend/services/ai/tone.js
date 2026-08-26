const MAX_REPLY_CHARS = 80;

const FORMAL_EN = [
  [/\bhey\b/gi, "Hello"],
  [/\bhi\b/gi, "Hello"],
  [/\byeah\b/gi, "Yes"],
  [/\byep\b/gi, "Yes"],
  [/\bnope\b/gi, "No"],
  [/\bok\b/gi, "Okay"],
  [/\bthanks\b/gi, "Thank you"],
  [/\bthx\b/gi, "Thank you"],
  [/\bgonna\b/gi, "going to"],
  [/\bwanna\b/gi, "want to"],
  [/\bgotta\b/gi, "have to"],
];

const FORMAL_AR = [
  [/\bهلا\b/g, "مرحباً"],
  [/\bتمام\b/g, "حسناً"],
  [/\bاوكي\b/g, "حسناً"],
  [/\bشكراً\b/g, "شكراً لك"],
];

const FRIENDLY_EMOJI = ["😊", "👍", "🙂"];
const FUNNY_EMOJI = ["😄", "😂", "😉"];

function trimWords(text, maxWords) {
  const parts = String(text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length <= maxWords) return parts.join(" ");
  return parts.slice(0, maxWords).join(" ");
}

function hasEmoji(text) {
  return /[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/u.test(String(text || ""));
}

function pickEmoji(list, seed = 0) {
  return list[Math.abs(Number(seed) || 0) % list.length];
}

function applyToneToReply(reply, tone, language, seed = 0) {
  let text = String(reply || "").trim();
  if (!text) return "";

  const isAr = String(language || "en").toLowerCase().startsWith("ar");

  switch (tone) {
    case "short":
      text = trimWords(text, isAr ? 5 : 6);
      break;
    case "formal":
      for (const [rx, rep] of isAr ? FORMAL_AR : FORMAL_EN) {
        text = text.replace(rx, rep);
      }
      if (!/[.!?؟]$/.test(text)) text += isAr ? "." : ".";
      break;
    case "friendly":
      if (!hasEmoji(text)) {
        text = `${text} ${pickEmoji(FRIENDLY_EMOJI, seed)}`;
      }
      break;
    case "funny":
      if (!hasEmoji(text)) {
        text = `${text} ${pickEmoji(FUNNY_EMOJI, seed)}`;
      }
      break;
    default:
      break;
  }

  return text.slice(0, MAX_REPLY_CHARS);
}

function applyToneToReplies(replies, tone, language = "en", seed = 0) {
  if (!Array.isArray(replies) || !replies.length) return [];
  if (!tone || tone === "default") return replies.slice(0, 3);
  return replies
    .map((reply, index) => applyToneToReply(reply, tone, language, seed + index))
    .filter(Boolean)
    .slice(0, 3);
}

module.exports = {
  applyToneToReplies,
  applyToneToReply,
};
