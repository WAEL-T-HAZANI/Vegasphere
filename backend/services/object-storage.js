const fs = require("fs");
const path = require("path");

const {
  S3_BUCKET,
  S3_REGION,
  S3_ACCESS_KEY_ID,
  S3_SECRET_ACCESS_KEY,
  S3_ENDPOINT,
  S3_PUBLIC_BASE_URL,
} = require("../config/env.js");

function isObjectStorageEnabled() {
  return Boolean(S3_BUCKET && S3_ACCESS_KEY_ID && S3_SECRET_ACCESS_KEY);
}

function normalizeStorageKey(relativePath) {
  const value = String(relativePath || "")
    .trim()
    .replace(/^\/+/, "");
  if (!value.startsWith("uploads/")) {
    return `uploads/${value.replace(/^uploads\/?/, "")}`;
  }
  return value;
}

function publicUrlForKey(key) {
  const base = String(S3_PUBLIC_BASE_URL || "").trim().replace(/\/$/, "");
  if (!base) return "";
  return `${base}/${String(key || "").replace(/^\/+/, "")}`;
}

let s3ClientPromise = null;

async function getS3Client() {
  if (!isObjectStorageEnabled()) return null;
  if (!s3ClientPromise) {
    s3ClientPromise = (async () => {
      const { S3Client } = await import("@aws-sdk/client-s3");
      const config = {
        region: S3_REGION || "auto",
        credentials: {
          accessKeyId: S3_ACCESS_KEY_ID,
          secretAccessKey: S3_SECRET_ACCESS_KEY,
        },
      };
      if (S3_ENDPOINT) {
        config.endpoint = S3_ENDPOINT;
        config.forcePathStyle = true;
      }
      return new S3Client(config);
    })();
  }
  return s3ClientPromise;
}

async function uploadLocalFile(localPath, relativePath, contentType) {
  if (!isObjectStorageEnabled()) return null;
  const key = normalizeStorageKey(relativePath);
  const body = fs.readFileSync(localPath);
  const { PutObjectCommand } = await import("@aws-sdk/client-s3");
  const client = await getS3Client();
  await client.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType || "application/octet-stream",
    }),
  );
  return publicUrlForKey(key);
}

async function deleteStoredFile(rawUrlOrPath) {
  if (!isObjectStorageEnabled()) return false;
  const value = String(rawUrlOrPath || "").trim();
  if (!value) return false;

  let key = "";
  if (value.startsWith("/uploads/")) {
    key = normalizeStorageKey(value);
  } else if (S3_PUBLIC_BASE_URL && value.startsWith(S3_PUBLIC_BASE_URL)) {
    key = normalizeStorageKey(value.slice(S3_PUBLIC_BASE_URL.length));
  } else {
    try {
      const pathname = new URL(value).pathname || "";
      if (pathname.includes("/uploads/")) {
        key = normalizeStorageKey(pathname);
      }
    } catch {
      return false;
    }
  }

  if (!key) return false;
  const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
  const client = await getS3Client();
  await client.send(
    new DeleteObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
    }),
  );
  return true;
}

/**
 * After multer writes locally: optionally mirror to S3/R2 and remove local copy.
 * Returns absolute public URL when cloud storage is enabled, otherwise null.
 */
async function publishLocalUpload(localPath, relativePath, contentType) {
  if (!isObjectStorageEnabled()) return null;
  const url = await uploadLocalFile(localPath, relativePath, contentType);
  try {
    if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
  } catch {
    /* ignore cleanup errors */
  }
  return url;
}

module.exports = {
  isObjectStorageEnabled,
  normalizeStorageKey,
  publicUrlForKey,
  uploadLocalFile,
  deleteStoredFile,
  publishLocalUpload,
};
