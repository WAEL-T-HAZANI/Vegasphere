const fs = require("fs");
const os = require("os");
const path = require("path");

const LEGACY_PATH = path.join(__dirname, "..", "data", "vega-dict.db");
const MIN_BYTES = 1024 * 1024;
/** ~952 MB file + headroom for temp download */
const REQUIRED_BYTES = Math.ceil(1.05 * 1024 * 1024 * 1024);

function getFreeBytes(dir) {
  try {
    const target = fs.existsSync(dir) ? dir : path.dirname(dir);
    if (typeof fs.statfsSync === "function") {
      const { bsize, bavail } = fs.statfsSync(target);
      return Number(bsize) * Number(bavail);
    }
  } catch {
    /* ignore */
  }
  return null;
}

function hasSpaceForDownload(dir) {
  const free = getFreeBytes(dir);
  if (free == null) return true;
  return free >= REQUIRED_BYTES;
}

function getWritableDataDir() {
  const fromEnv = String(process.env.VEGA_DICT_DIR || process.env.DATA_DIR || "").trim();
  if (fromEnv) return path.resolve(fromEnv);
  return path.join(os.tmpdir(), "vegasphere-data");
}

function isValidDbFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return false;
    return fs.statSync(filePath).size >= MIN_BYTES;
  } catch {
    return false;
  }
}

/** Path used for read + optional download (writable on Belmo; legacy data/ locally). */
function getVegaDictPath() {
  const explicit = String(process.env.VEGA_DICT_PATH || "").trim();
  if (explicit) return path.resolve(explicit);

  if (isValidDbFile(LEGACY_PATH)) return LEGACY_PATH;

  const writable = path.join(getWritableDataDir(), "vega-dict.db");
  if (isValidDbFile(writable)) return writable;

  return writable;
}

module.exports = {
  getVegaDictPath,
  getWritableDataDir,
  getFreeBytes,
  hasSpaceForDownload,
  LEGACY_PATH,
  MIN_BYTES,
  REQUIRED_BYTES,
};
