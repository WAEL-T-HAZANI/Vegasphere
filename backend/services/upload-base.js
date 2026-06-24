const fs = require("fs");
const os = require("os");
const path = require("path");

let cachedBase = null;

function resolveWritableUploadBase() {
  const candidates = [
    process.env.UPLOAD_DIR && path.resolve(process.env.UPLOAD_DIR),
    path.resolve(__dirname, "..", "uploads"),
    path.join(os.tmpdir(), "vegasphere-uploads"),
  ].filter(Boolean);

  for (const base of candidates) {
    try {
      fs.mkdirSync(base, { recursive: true });
      const probe = path.join(base, ".write-probe");
      fs.writeFileSync(probe, "ok");
      fs.unlinkSync(probe);
      return base;
    } catch {
      /* try next candidate */
    }
  }

  throw new Error("No writable upload directory available");
}

function getUploadBase() {
  if (!cachedBase) {
    cachedBase = resolveWritableUploadBase();
  }
  return cachedBase;
}

function uploadSubdir(...parts) {
  const dir = path.join(getUploadBase(), ...parts);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

module.exports = { getUploadBase, uploadSubdir };
