/**
 * Expand replyPairs.json from smartReplies.json intent patterns (one reply per pattern).
 * Run: node scripts/build-reply-pairs-from-intents.js
 */
const fs = require("fs");
const path = require("path");

const smartPath = path.join(__dirname, "..", "data", "smartReplies.json");
const outPath = path.join(__dirname, "..", "data", "replyPairs.json");

const smart = JSON.parse(fs.readFileSync(smartPath, "utf8"));
const existing = fs.existsSync(outPath)
  ? JSON.parse(fs.readFileSync(outPath, "utf8"))
  : { version: 1, pairs: [] };

const seen = new Set((existing.pairs || []).map((p) => p.id));

for (const intent of smart.intents || []) {
  for (const lang of ["en", "ar"]) {
    const patterns = intent.patterns?.[lang] || [];
    const replies = intent.replies?.[lang]?.default || [];
    if (!patterns.length || replies.length < 2) continue;

    for (const pattern of patterns.slice(0, 4)) {
      const id = `intent_${intent.id}_${lang}_${pattern.slice(0, 12).replace(/\W+/g, "_")}`;
      if (seen.has(id)) continue;
      seen.add(id);
      existing.pairs.push({
        id,
        lastPatterns: [pattern],
        replies: { [lang]: { default: replies.slice(0, 3) } },
      });
    }
  }
}

existing.version = 1;
existing.source = "Curated + smartReplies.json expansion";
existing.generatedAt = new Date().toISOString();
existing.pairCount = existing.pairs.length;

fs.writeFileSync(outPath, `${JSON.stringify(existing, null, 2)}\n`, "utf8");
console.log(`Wrote ${existing.pairCount} pairs to ${outPath}`);
