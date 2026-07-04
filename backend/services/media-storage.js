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
  if (isGridFsStorage()) {
    return gridFs.fileExistsInGridFs(relativePath);
  }
  return false;
}

async function persistUploadedFile(localPath, relativePath, contentType) {
  const rel = String(relativePath || "").trim();
  if (!localPath || !rel) return null;

  if (isObjectStorageEnabled()) {
    return publishLocalUpload(localPath, rel, contentType);
  }

  if (isGridFsStorage()) {
    const ok = await gridFs.storeFileFromPath(localPath, rel, contentType);
    if (!ok) return null;
    try {
      if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
    } catch {
      /* ignore */
    }
    return null;
  }

  const filePath = resolveLocalFilePath(rel);
  if (!filePath) return null;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  if (path.resolve(localPath) !== filePath) {
    fs.renameSync(localPath, filePath);
  }
  return null;
}

async function streamStoredFile(relativePath, res) {
  const filePath = resolveLocalFilePath(relativePath);
  if (filePath && fs.existsSync(filePath)) {
    await new Promise((resolve, reject) => {
      res.sendFile(filePath, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    return true;
  }
  if (isGridFsStorage()) {
    return gridFs.streamGridFile(relativePath, res);
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
