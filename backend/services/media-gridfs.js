const fs = require("fs");
const mongoose = require("mongoose");

const BUCKET_NAME = "vegasphere_uploads";

let bucketPromise = null;

function normalizeStorageKey(relativePath) {
  return String(relativePath || "")
    .trim()
    .replace(/^\/+/, "")
    .replace(/^uploads\/?/, "")
    .replace(/\.\.+/g, ".");
}

async function getBucket() {
  if (!mongoose.connection?.db) {
    throw new Error("MongoDB not connected");
  }
  if (!bucketPromise) {
    bucketPromise = (async () => {
      const { GridFSBucket } = await import("mongodb");
      return new GridFSBucket(mongoose.connection.db, {
        bucketName: BUCKET_NAME,
      });
    })();
  }
  return bucketPromise;
}

async function storeFileFromPath(localPath, relativePath, contentType) {
  const key = normalizeStorageKey(relativePath);
  if (!key || !localPath || !fs.existsSync(localPath)) return false;

  const bucket = await getBucket();
  const existing = await bucket.find({ filename: key }).limit(1).toArray();
  for (const file of existing) {
    await bucket.delete(file._id);
  }

  await new Promise((resolve, reject) => {
    const readStream = fs.createReadStream(localPath);
    const uploadStream = bucket.openUploadStream(key, {
      contentType: contentType || "application/octet-stream",
      metadata: { key },
    });
    readStream.on("error", reject);
    uploadStream.on("error", reject);
    uploadStream.on("finish", resolve);
    readStream.pipe(uploadStream);
  });
  return true;
}

async function findGridFile(relativePath) {
  const key = normalizeStorageKey(relativePath);
  if (!key) return null;
  const bucket = await getBucket();
  const files = await bucket.find({ filename: key }).limit(1).toArray();
  return files[0] || null;
}

async function fileExistsInGridFs(relativePath) {
  const file = await findGridFile(relativePath);
  return Boolean(file);
}

async function streamGridFile(relativePath, res) {
  const file = await findGridFile(relativePath);
  if (!file) return false;

  const bucket = await getBucket();
  if (file.contentType) {
    res.setHeader("Content-Type", file.contentType);
  }
  if (file.length) {
    res.setHeader("Content-Length", String(file.length));
  }
  res.setHeader("Cache-Control", "public, max-age=604800");

  await new Promise((resolve, reject) => {
    const stream = bucket.openDownloadStream(file._id);
    stream.on("error", reject);
    stream.on("end", resolve);
    stream.pipe(res);
  });
  return true;
}

async function deleteGridFile(relativePath) {
  const file = await findGridFile(relativePath);
  if (!file) return false;
  const bucket = await getBucket();
  await bucket.delete(file._id);
  return true;
}

module.exports = {
  normalizeStorageKey,
  storeFileFromPath,
  fileExistsInGridFs,
  streamGridFile,
  deleteGridFile,
};
