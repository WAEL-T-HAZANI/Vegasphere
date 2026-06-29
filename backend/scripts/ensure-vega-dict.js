/**
 * Ensures vega-dict.db exists on the server (e.g. Belmo) by downloading from VEGA_DICT_URL.
 * Writes to a writable dir (/tmp by default) because /app is read-only on many hosts.
 */
const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");
const {
  getVegaDictPath,
  getWritableDataDir,
  hasSpaceForDownload,
  MIN_BYTES,
  REQUIRED_BYTES,
} = require("../lib/vega-dict-path.js");
const { isEnvTruthy } = require("../config/env.js");

const DB_PATH = getVegaDictPath();

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    const file = fs.createWriteStream(dest);

    const fail = (err) => {
      file.destroy();
      try {
        fs.unlinkSync(dest);
      } catch {
        /* ignore */
      }
      reject(err);
    };

    file.on("error", fail);

    const req = client.get(url, (res) => {
      if (
        res.statusCode &&
        res.statusCode >= 300 &&
        res.statusCode < 400 &&
        res.headers.location
      ) {
        file.close();
        try {
          fs.unlinkSync(dest);
        } catch {
          /* ignore */
        }
        downloadFile(res.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        fail(new Error(`Download failed: HTTP ${res.statusCode}`));
        return;
      }
      res.on("error", fail);
      res.pipe(file);
      file.on("finish", () => {
        file.close((err) => (err ? fail(err) : resolve()));
      });
    });
    req.on("error", fail);
  });
}

async function ensureVegaDict(options = {}) {
  const forBuild = Boolean(options.forBuild);
  try {
    if (fs.existsSync(DB_PATH)) {
      const stat = fs.statSync(DB_PATH);
      if (stat.size >= MIN_BYTES) {
        return { ok: true, source: "local", bytes: stat.size, path: DB_PATH };
      }
    }

    const url = String(process.env.VEGA_DICT_URL || "").trim();
    if (!url) {
      return {
        ok: false,
        source: "missing",
        path: DB_PATH,
        message: "vega-dict.db not found and VEGA_DICT_URL is unset",
      };
    }

    if (!forBuild && isEnvTruthy(process.env.VEGA_DICT_SKIP_DOWNLOAD)) {
      return {
        ok: false,
        source: "skipped",
        path: DB_PATH,
        message: "VEGA_DICT_SKIP_DOWNLOAD is set — using JSON fallbacks",
      };
    }

    const dir = path.dirname(DB_PATH);
    if (!hasSpaceForDownload(dir)) {
      const needGb = (REQUIRED_BYTES / 1024 / 1024 / 1024).toFixed(1);
      return {
        ok: false,
        source: "no-space",
        path: DB_PATH,
        message: `Need ~${needGb} GB free at ${dir} (Belmo /tmp is too small). Mount VEGA_DICT_DIR or unset VEGA_DICT_URL.`,
      };
    }

    fs.mkdirSync(dir, { recursive: true });
    const tmp = `${DB_PATH}.download`;
    await downloadFile(url, tmp);
    fs.renameSync(tmp, DB_PATH);
    const stat = fs.statSync(DB_PATH);
    return {
      ok: stat.size >= MIN_BYTES,
      source: "downloaded",
      bytes: stat.size,
      path: DB_PATH,
    };
  } catch (err) {
    return {
      ok: false,
      source: "error",
      path: DB_PATH,
      message: err?.message || String(err),
    };
  }
}

module.exports = { ensureVegaDict, DB_PATH, getWritableDataDir };
