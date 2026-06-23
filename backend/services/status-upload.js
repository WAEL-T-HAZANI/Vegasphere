const fs = require("fs");
const path = require("path");
const multer = require("multer");

const uploadRoot = path.resolve(__dirname, "..", "uploads", "status");
const ALLOWED_IMAGE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
]);

function ensureUploadRoot() {
  fs.mkdirSync(uploadRoot, { recursive: true });
}

function sanitizeBaseName(name) {
  return (
    String(name || "status")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || "status"
  );
}

function buildStoredName(file) {
  const original = file?.originalname || "status";
  const ext =
    path
      .extname(original || "")
      .slice(0, 16)
      .toLowerCase() || ".jpg";
  const base = sanitizeBaseName(path.basename(original, ext));
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `${stamp}-${base}${ext}`;
}

ensureUploadRoot();

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    ensureUploadRoot();
    cb(null, uploadRoot);
  },
  filename(_req, file, cb) {
    cb(null, buildStoredName(file));
  },
});

function fileFilter(_req, file, cb) {
  const mime = String(file?.mimetype || "").toLowerCase();
  if (!mime.startsWith("image/")) {
    cb(new Error("Only image uploads are allowed"));
    return;
  }
  const ext = path.extname(file?.originalname || "").toLowerCase();
  if (ext && !ALLOWED_IMAGE_EXTENSIONS.has(ext)) {
    cb(new Error("Only image uploads are allowed"));
    return;
  }
  cb(null, true);
}

const statusUpload = multer({
  storage,
  limits: {
    fileSize: 6 * 1024 * 1024,
    files: 1,
  },
  fileFilter,
});

module.exports = {
  statusUpload,
};
