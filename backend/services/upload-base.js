const fs = require("fs");
const os = require("os");
const path = require("path");

const { UPLOAD_STORAGE, isProd } = require("../config/env.js");

let cachedBase = null;
let cachedStagedBase = null;

function probeWritableDir(base) {
  fs.mkdirSync(base, { recursive: true });
  const probe = path.join(base, ".write-probe");
  fs.writeFileSync(probe, "ok");
  fs.unlinkSync(probe);
  return base;
}

function resolveWritableUploadBase() {
  const candidates = [
    process.env.UPLOAD_DIR && path.resolve(process.env.UPLOAD_DIR),
    path.resolve(__dirname, "..", "uploads"),
  ].filter(Boolean);

  for (const base of candidates) {
    try {
      return probeWritableDir(base);
    } catch {
      /* try next candidate */
    }
  }

  if (UPLOAD_STORAGE === "gridfs") {
    return probeWritableDir(path.join(os.tmpdir(), "vegasphere-upload-cache"));
  }

  if (!isProd) {
    return probeWritableDir(path.join(os.tmpdir(), "vegasphere-uploads"));
  }

  throw new Error(
    "No writable upload directory. Set UPLOAD_DIR to a persistent path or UPLOAD_STORAGE=gridfs on Belmo.",
  );
}

function getUploadBase() {
  if (!cachedBase) {
    cachedBase = resolveWritableUploadBase();
    console.info(`[uploads] final storage base: ${cachedBase}`);
  }
  return cachedBase;
}

/** Multer staging — always a writable temp dir (Belmo /app may be read-only). */
function getStagedBase() {
  if (!cachedStagedBase) {
    cachedStagedBase = probeWritableDir(
      path.join(os.tmpdir(), "vegasphere-staged"),
    );
  }
  return cachedStagedBase;
}

function uploadSubdir(...parts) {
  const dir = path.join(getUploadBase(), ...parts);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

module.exports = { getUploadBase, getStagedBase, uploadSubdir };
