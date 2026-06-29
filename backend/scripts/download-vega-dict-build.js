/**
 * Belmo build step: download vega-dict.db into backend/data/ while the filesystem is writable.
 * At runtime /app is read-only but baked files can be opened read-only by SQLite.
 *
 * Set VEGA_DICT_URL in Belmo build environment variables. Skip on local install when unset.
 */
const fs = require("fs");
const { LEGACY_PATH, MIN_BYTES } = require("../lib/vega-dict-path.js");

async function main() {
  const url = String(process.env.VEGA_DICT_URL || "").trim();
  if (!url) {
    console.log("[ai] build: VEGA_DICT_URL unset — skip dictionary download");
    return;
  }

  if (fs.existsSync(LEGACY_PATH)) {
    const size = fs.statSync(LEGACY_PATH).size;
    if (size >= MIN_BYTES) {
      console.log(
        `[ai] build: vega-dict.db already present (${(size / 1024 / 1024).toFixed(1)} MB)`,
      );
      return;
    }
  }

  // Bake into /app/data/ in the deployment image (read-only at runtime is OK for SQLite).
  process.env.VEGA_DICT_PATH = LEGACY_PATH;
  const { ensureVegaDict } = require("./ensure-vega-dict.js");
  const result = await ensureVegaDict({ forBuild: true });
  if (!result.ok) {
    console.error(`[ai] build: dictionary download failed — ${result.message || result.source}`);
    process.exit(1);
  }
  console.log(
    `[ai] build: vega-dict.db ready (${((result.bytes || 0) / 1024 / 1024).toFixed(1)} MB)`,
  );
}

main().catch((err) => {
  console.error("[ai] build:", err?.message || err);
  process.exit(1);
});
