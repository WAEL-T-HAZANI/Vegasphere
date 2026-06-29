/**
 * Ensures vega-dict.db exists on the server (e.g. Belmo) by downloading from VEGA_DICT_URL.
 * Set VEGA_DICT_URL to a direct HTTPS link you host (GitLab release asset, etc.).
 */
const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");

const DB_PATH = path.join(__dirname, "..", "data", "vega-dict.db");
const MIN_BYTES = 1024 * 1024;

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    const file = fs.createWriteStream(dest);
    client
      .get(url, (res) => {
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
          file.close();
          try {
            fs.unlinkSync(dest);
          } catch {
            /* ignore */
          }
          reject(new Error(`Download failed: HTTP ${res.statusCode}`));
          return;
        }
        res.pipe(file);
        file.on("finish", () => {
          file.close(resolve);
        });
      })
      .on("error", (err) => {
        file.close();
        try {
          fs.unlinkSync(dest);
        } catch {
          /* ignore */
        }
        reject(err);
      });
  });
}

async function ensureVegaDict() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const stat = fs.statSync(DB_PATH);
      if (stat.size >= MIN_BYTES) {
        return { ok: true, source: "local", bytes: stat.size };
      }
    }

    const url = String(process.env.VEGA_DICT_URL || "").trim();
    if (!url) {
      return {
        ok: false,
        source: "missing",
        message: "vega-dict.db not found and VEGA_DICT_URL is unset",
      };
    }

    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    const tmp = `${DB_PATH}.download`;
    await downloadFile(url, tmp);
    fs.renameSync(tmp, DB_PATH);
    const stat = fs.statSync(DB_PATH);
    return {
      ok: stat.size >= MIN_BYTES,
      source: "downloaded",
      bytes: stat.size,
    };
  } catch (err) {
    return { ok: false, source: "error", message: err?.message || String(err) };
  }
}

module.exports = { ensureVegaDict, DB_PATH };
