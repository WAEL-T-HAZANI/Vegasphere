const fs = require("fs");
const path = require("path");
const multer = require("multer");

const { avatarUploadRoot } = require("./avatar-utils.js");
const ALLOWED_IMAGE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
]);

function ensureAvatarRoot() {
  fs.mkdirSync(avatarUploadRoot, { recursive: true });
}

function sanitizeBaseName(name) {
  return (
    String(name || "avatar")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || "avatar"
  );
}

function buildStoredName(file) {
  const original = file?.originalname || "avatar";
  const ext = path
    .extname(original || "")
    .slice(0, 16)
    .toLowerCase();

  const base = sanitizeBaseName(path.basename(original, ext));
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return `${stamp}-${base}${ext || ".png"}`;
}

ensureAvatarRoot();

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    ensureAvatarRoot();
    cb(null, avatarUploadRoot);
  },

  filename(_req, file, cb) {
    cb(null, buildStoredName(file));
  },
});

function fileFilter(_req, file, cb) {
  const mime = String(file?.mimetype || "").toLowerCase();
  const ext = path.extname(file?.originalname || "").toLowerCase();

  if (!mime.startsWith("image/") || !ALLOWED_IMAGE_EXTENSIONS.has(ext)) {
    cb(new Error("Only image uploads are allowed"));
    return;
  }

  cb(null, true);
}

const avatarUpload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
  fileFilter,
});

module.exports = {
  avatarUpload,
};
