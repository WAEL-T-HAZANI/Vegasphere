/**
 * Download OPUS-MT EN↔AR models (one-time / before deploy).
 * Usage: node scripts/warm-neural-models.js
 */
require("dotenv").config({
  path: require("path").resolve(__dirname, "..", ".env"),
  override: true,
});

const { warmNeuralModels } = require("../services/ai/neural-translate.js");

warmNeuralModels()
  .then((status) => {
    console.log("[ai-neural] warm-up:", status);
    process.exit(status.ready ? 0 : 1);
  })
  .catch((err) => {
    console.error("[ai-neural] warm-up failed:", err);
    process.exit(1);
  });
