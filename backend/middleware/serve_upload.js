const { streamStoredFile } = require("../services/media-storage.js");

function sanitizeRelativePath(reqPath) {
  return String(reqPath || "")
    .replace(/^\/+/, "")
    .replace(/\.\.+/g, ".");
}

async function serveUpload(req, res, next) {
  const relative = sanitizeRelativePath(req.path);
  if (!relative) return next();

  try {
    const served = await streamStoredFile(relative, res);
    if (served) return undefined;
  } catch (err) {
    return next(err);
  }

  return next();
}

module.exports = serveUpload;
