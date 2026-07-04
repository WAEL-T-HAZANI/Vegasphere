const fs = require("fs");
const path = require("path");
const { getUploadBase } = require("../services/upload-base.js");
const {
  streamStoredFile,
  localFileExists,
  resolveLocalFilePath,
} = require("../services/media-storage.js");

function getUploadRoot() {
  return getUploadBase();
}

function sanitizeDownloadName(raw, fallback) {
  const value = String(raw || fallback || "download")
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "_")
    .slice(0, 180);
  return value || "download";
}

async function uploadDownloadAttachment(req, res, next) {
  const wantsDownload =
    req.query.download === "1" || req.query.download === "true";
  if (!wantsDownload) return next();

  const relative = String(req.path || "")
    .replace(/^\/+/, "")
    .replace(/\.\.+/g, ".");
  if (!relative) return next();

  const UPLOAD_ROOT = getUploadRoot();
  const filePath = resolveLocalFilePath(relative);
  if (filePath && fs.existsSync(filePath)) {
    try {
      const stat = fs.statSync(filePath);
      if (stat.isFile()) {
        const filename = sanitizeDownloadName(
          req.query.filename,
          path.basename(filePath),
        );
        return res.download(filePath, filename);
      }
    } catch {
      /* fall through to GridFS */
    }
  }

  if (localFileExists(relative)) {
    const resolved = path.resolve(UPLOAD_ROOT, relative);
    if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
      const filename = sanitizeDownloadName(
        req.query.filename,
        path.basename(resolved),
      );
      return res.download(resolved, filename);
    }
  }

  try {
    const filename = sanitizeDownloadName(
      req.query.filename,
      path.basename(relative),
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename.replace(/"/g, "")}"`,
    );
    const served = await streamStoredFile(relative, res);
    if (served) return undefined;
  } catch {
    /* fall through */
  }

  return next();
}

module.exports = uploadDownloadAttachment;
