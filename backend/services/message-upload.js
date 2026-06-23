const fs = require("fs");
const path = require("path");
const multer = require("multer");
const crypto = require("crypto");
const { publishLocalUpload } = require("./object-storage.js");

const uploadRoot = path.resolve(__dirname, "..", "uploads", "messages");
const stagedRoot = path.resolve(uploadRoot, ".staged");
const stagedMetaRoot = path.resolve(stagedRoot, "meta");
const MAX_MESSAGE_UPLOAD_BYTES = 100 * 1024 * 1024;
const ALLOWED_MIME_PREFIXES = ["image/", "video/", "audio/"];
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "application/zip",
  "application/vnd.rar",
  "application/x-rar-compressed",
  "application/x-rar",
]);
const ALLOWED_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".mp4",
  ".webm",
  ".mov",
  ".mp3",
  ".m4a",
  ".wav",
  ".ogg",
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".txt",
  ".csv",
  ".zip",
  ".rar",
]);

function ensureUploadRoot() {
  fs.mkdirSync(uploadRoot, { recursive: true });
  fs.mkdirSync(stagedRoot, { recursive: true });
  fs.mkdirSync(stagedMetaRoot, { recursive: true });
}

function sanitizeBaseName(name) {
  return (
    String(name || "upload")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || "upload"
  );
}

function buildStoredName(file) {
  const original = file?.originalname || "upload";
  const ext = path
    .extname(original || "")
    .slice(0, 16)
    .toLowerCase();
  const base = sanitizeBaseName(path.basename(original, ext));
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `${stamp}-${base}${ext}`;
}

function sanitizeUploadToken(token) {
  const value = String(token || "").trim();
  if (!/^[a-zA-Z0-9._-]{8,120}$/.test(value)) {
    return "";
  }
  return value;
}

ensureUploadRoot();

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    ensureUploadRoot();
    cb(null, stagedRoot);
  },
  filename(_req, file, cb) {
    cb(null, buildStoredName(file));
  },
});

function fileFilter(_req, file, cb) {
  const sizeHint = Number(file?.size || 0);
  if (sizeHint > MAX_MESSAGE_UPLOAD_BYTES) {
    cb(new Error("File too large"));
    return;
  }
  const mime = String(file?.mimetype || "").toLowerCase();
  const ext = path.extname(file?.originalname || "").toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    cb(new Error("Unsupported file type"));
    return;
  }
  const mimeAllowed =
    ALLOWED_MIME_TYPES.has(mime) ||
    ALLOWED_MIME_PREFIXES.some((prefix) => mime.startsWith(prefix)) ||
    !mime ||
    mime === "application/octet-stream";
  if (!mimeAllowed) {
    cb(new Error("Unsupported file type"));
    return;
  }
  cb(null, true);
}

const messageUpload = multer({
  storage,
  limits: {
    fileSize: MAX_MESSAGE_UPLOAD_BYTES,
    files: 1,
  },
  fileFilter,
});

function buildUploadToken() {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function metaPathForToken(token) {
  const safeToken = sanitizeUploadToken(token);
  if (!safeToken) return "";
  const metaPath = path.resolve(stagedMetaRoot, `${safeToken}.json`);
  if (!metaPath.startsWith(`${stagedMetaRoot}${path.sep}`)) return "";
  return metaPath;
}

function writeStageMetadata({ token, ownerId, file, kind }) {
  ensureUploadRoot();
  const metaPath = metaPathForToken(token);
  if (!metaPath) {
    throw new Error("Invalid upload token");
  }
  const record = {
    token: String(token),
    ownerId: String(ownerId),
    kind: String(kind || "file"),
    fileName: String(file?.originalname || file?.filename || "upload"),
    fileType: String(file?.mimetype || "application/octet-stream"),
    fileSize: Number(file?.size || 0),
    storedName: String(file?.filename || ""),
    stagedPath: String(file?.path || ""),
    createdAt: new Date().toISOString(),
  };
  fs.writeFileSync(
    metaPath,
    JSON.stringify(record, null, 2),
    "utf8",
  );
  return record;
}

function readStageMetadata(token) {
  if (!token) return null;
  const metaPath = metaPathForToken(token);
  if (!metaPath) return null;
  try {
    const raw = fs.readFileSync(metaPath, "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function removeStageFiles(meta) {
  if (!meta) return;
  try {
    if (meta.stagedPath && fs.existsSync(meta.stagedPath)) {
      fs.unlinkSync(meta.stagedPath);
    }
  } catch {
    /* ignore */
  }
  try {
    const metaPath = metaPathForToken(meta.token);
    if (metaPath && fs.existsSync(metaPath)) {
      fs.unlinkSync(metaPath);
    }
  } catch {
    /* ignore */
  }
}

function createStagedUpload({ userId, file, kind }) {
  const token = buildUploadToken();
  const meta = writeStageMetadata({
    token,
    ownerId: userId,
    file,
    kind,
  });
  return { token, ...meta };
}

function prepareStagedUpload({ token, userId }) {
  const meta = readStageMetadata(token);
  if (!meta) return null;
  if (String(meta.ownerId) !== String(userId)) return null;
  if (!meta.stagedPath || !fs.existsSync(meta.stagedPath)) {
    removeStageFiles(meta);
    return null;
  }
  const finalPath = path.resolve(uploadRoot, String(meta.storedName || ""));
  const relUrl = `/uploads/messages/${meta.storedName}`;
  return {
    token: String(meta.token),
    kind: String(meta.kind || "file"),
    fileName: String(meta.fileName || meta.storedName || "upload"),
    fileType: String(meta.fileType || "application/octet-stream"),
    fileSize: Number(meta.fileSize || 0),
    url: relUrl,
    async commit() {
      ensureUploadRoot();
      if (!fs.existsSync(meta.stagedPath)) return false;
      const uploaded = await publishLocalUpload(
        meta.stagedPath,
        relUrl,
        meta.fileType,
      );
      if (uploaded) {
        const metaPath = metaPathForToken(meta.token);
        if (metaPath && fs.existsSync(metaPath)) {
          fs.unlinkSync(metaPath);
        }
        this.url = uploaded;
        return true;
      }
      fs.renameSync(meta.stagedPath, finalPath);
      const metaPath = metaPathForToken(meta.token);
      if (metaPath && fs.existsSync(metaPath)) {
        fs.unlinkSync(metaPath);
      }
      return true;
    },
  };
}

function discardStagedUpload({ token, userId }) {
  const meta = readStageMetadata(token);
  if (!meta) return false;
  if (userId && String(meta.ownerId) !== String(userId)) return false;
  removeStageFiles(meta);
  return true;
}

function cleanupExpiredStagedUploads(maxAgeMs = 24 * 60 * 60 * 1000) {
  ensureUploadRoot();
  const now = Date.now();
  const files = fs
    .readdirSync(stagedMetaRoot)
    .filter((name) => name.endsWith(".json"));
  let removed = 0;
  for (const fileName of files) {
    const token = fileName.replace(/\.json$/i, "");
    const meta = readStageMetadata(token);
    if (!meta) continue;
    const createdAt = new Date(meta.createdAt || 0).getTime();
    if (!createdAt || now - createdAt < maxAgeMs) continue;
    removeStageFiles(meta);
    removed += 1;
  }
  return removed;
}

module.exports = {
  messageUpload,
  uploadRoot,
  stagedRoot,
  createStagedUpload,
  prepareStagedUpload,
  discardStagedUpload,
  cleanupExpiredStagedUploads,
};
