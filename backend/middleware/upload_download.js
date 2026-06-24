const fs = require("fs");
const path = require("path");
const { getUploadBase } = require("../services/upload-base.js");

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

function uploadDownloadAttachment(req, res, next) {
  const wantsDownload =
    req.query.download === "1" || req.query.download === "true";
  if (!wantsDownload) return next();

  const relative = String(req.path || "")
    .replace(/^\/+/, "")
    .replace(/\.\.+/g, ".");
  if (!relative) return next();

  const UPLOAD_ROOT = getUploadRoot();
  const filePath = path.resolve(UPLOAD_ROOT, relative);
  if (
    filePath !== UPLOAD_ROOT &&
    !filePath.startsWith(`${UPLOAD_ROOT}${path.sep}`)
  ) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  let stat;
  try {
    stat = fs.statSync(filePath);
  } catch {
    return next();
  }

  if (!stat.isFile()) return next();

  const filename = sanitizeDownloadName(
    req.query.filename,
    path.basename(filePath),
  );

  return res.download(filePath, filename);
}

module.exports = uploadDownloadAttachment;
