const { normalizeReplyList } = require("./groq-llm.js");

function replyKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function mergeReplyLists(primary = [], secondary = [], limit = 3) {
  const seen = new Set();
  const out = [];

  for (const list of [primary, secondary]) {
    for (const item of normalizeReplyList(list)) {
      const key = replyKey(item);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(item);
      if (out.length >= limit) return out;
    }
  }

  return out;
}

module.exports = {
  mergeReplyLists,
};
