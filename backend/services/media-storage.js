const fs = require("fs");
const path = require("path");
const { UPLOAD_STORAGE, PUBLIC_API_URL } = require("../config/env.js");
const { getUploadBase } = require("./upload-base.js");
const { publishLocalUpload, isObjectStorageEnabled } = require("./object-storage.js");
const gridFs = require("./media-gridfs.js");

function isGridFsStorage() {
  return UPLOAD_STORAGE === "gridfs";
}

function normalizeRelativeUploadPath(raw) {
  const value = String(raw || "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      const apiBase = String(PUBLIC_API_URL || "").trim().replace(/\/$/, "");
      if (apiBase && value.startsWith(apiBase)) {
        return url.pathname.replace(/^\/uploads\/?/, "");
      }
      return url.pathname.replace(/^\/uploads\/?/, "");
    } catch {
      return "";
    }
  }
  return value.replace(/^\/uploads\/?/, "").replace(/^\/+/, "");
}

function resolveLocalFilePath(relativePath) {
  const relative = normalizeRelativeUploadPath(relativePath);
  if (!relative) return "";
  const root = path.resolve(getUploadBase());
  const filePath = path.resolve(root, relative);
  if (
    filePath !== root &&
    !filePath.startsWith(`${root}${path.sep}`)
  ) {
    return "";
  }
  return filePath;
}

function localFileExists(relativePath) {
  const filePath = resolveLocalFilePath(relativePath);
  if (!filePath) return false;
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

async function storedFileExists(relativePath) {
  if (localFileExists(relativePath)) return true;
  try {
    if (await gridFs.fileExistsInGridFs(relativePath)) return true;
  } catch {
    /* ignore */
  }
  return false;
}

function contentTypeForPath(filePath, fallback = "application/octet-stream") {
  const ext = path.extname(String(filePath || "")).toLowerCase();
  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".gif":
      return "image/gif";
    case ".webp":
      return "image/webp";
    case ".mp4":
      return "video/mp4";
    case ".webm":
      return "video/webm";
    case ".mov":
      return "video/quicktime";
    case ".m4v":
      return "video/x-m4v";
    case ".mp3":
      return "audio/mpeg";
    case ".m4a":
      return "audio/mp4";
    case ".wav":
      return "audio/wav";
    case ".ogg":
      return "audio/ogg";
    case ".pdf":
      return "application/pdf";
    default:
      return fallback;
  }
}

async function persistUploadedFile(localPath, relativePath, contentType) {
  const rel = String(relativePath || "").trim();
  if (!localPath || !rel) return false;

  if (isObjectStorageEnabled()) {
    const cloudUrl = await publishLocalUpload(localPath, rel, contentType);
    return cloudUrl || false;
  }

  if (isGridFsStorage()) {
    const ok = await gridFs.storeFileFromPath(localPath, rel, contentType);
    if (!ok) return false;
    try {
      if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
    } catch {
      /* ignore */
    }
    return null;
  }

  const filePath = resolveLocalFilePath(rel);
  if (!filePath) return false;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  if (path.resolve(localPath) !== filePath) {
    fs.renameSync(localPath, filePath);
  }
  try {
    return fs.statSync(filePath).isFile() ? null : false;
  } catch {
    return false;
  }
}

async function streamStoredFile(relativePath, res) {
  const filePath = resolveLocalFilePath(relativePath);
  if (filePath && fs.existsSync(filePath)) {
    const ct = contentTypeForPath(filePath);
    res.setHeader("Content-Type", ct);
    res.setHeader("Cache-Control", "public, max-age=604800");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    await new Promise((resolve, reject) => {
      res.sendFile(filePath, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    return true;
  }
  // Fallback: older uploads may still live in GridFS even when UPLOAD_STORAGE=local.
  try {
    const served = await gridFs.streamGridFile(relativePath, res);
    if (served) return true;
  } catch {
    /* ignore */
  }
  return false;
}

module.exports = {
  isGridFsStorage,
  normalizeRelativeUploadPath,
  resolveLocalFilePath,
  localFileExists,
  storedFileExists,
  persistUploadedFile,
  streamStoredFile,
};
