const fs = require("fs");
const path = require("path");
const { uploadSubdir } = require("./upload-base.js");

const avatarUploadPrefix = "/uploads/avatars/";
const conversationAvatarUploadPrefix = "/uploads/conversation-avatars/";

let avatarUploadRoot;
let conversationAvatarUploadRoot;

function getAvatarUploadRoot() {
  if (!avatarUploadRoot) avatarUploadRoot = uploadSubdir("avatars");
  return avatarUploadRoot;
}

function getConversationAvatarUploadRoot() {
  if (!conversationAvatarUploadRoot) {
    conversationAvatarUploadRoot = uploadSubdir("conversation-avatars");
  }
  return conversationAvatarUploadRoot;
}

function defaultAvatarUrl(name) {
  const safeName = encodeURIComponent(String(name || "Vegasphere").trim() || "Vegasphere");
  return `https://ui-avatars.com/api/?name=${safeName}&background=8B1E3F&color=ffffff&bold=true`;
}

function buildAbsoluteAssetUrl(req, rawPath) {
  const value = String(rawPath || "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value) || /^data:/i.test(value)) return value;
  const rel = value.startsWith("/") ? value : `/${value}`;
  const configuredBase = String(
    process.env.PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || ""
  )
    .trim()
    .replace(/\/$/, "");
  if (configuredBase) return `${configuredBase}${rel}`;
  const proto =
    String(req?.headers?.["x-forwarded-proto"] || "")
      .split(",")[0]
      .trim() ||
    req?.protocol ||
    "http";
  const host = req?.get?.("host") || "";
  return host ? `${proto}://${host}${rel}` : rel;
}

function getLocalAvatarFilePath(rawUrl) {
  const value = String(rawUrl || "").trim();
  if (!value) return "";
  let pathname = value;
  if (/^https?:\/\//i.test(value)) {
    try {
      pathname = new URL(value).pathname || "";
    } catch {
      pathname = value;
    }
  }
  if (!pathname.startsWith(avatarUploadPrefix)) return "";
  const fileName = path.basename(pathname);
  if (!fileName) return "";
  const fullPath = path.resolve(getAvatarUploadRoot(), fileName);
  const root = getAvatarUploadRoot();
  if (!fullPath.startsWith(root)) return "";
  return fullPath;
}

function removeLocalAvatarFile(rawUrl) {
  const target = getLocalAvatarFilePath(rawUrl);
  if (!target) return;
  try {
    if (fs.existsSync(target)) fs.unlinkSync(target);
  } catch (error) {
    console.warn("avatar cleanup failed", error.message);
  }
}

function getLocalConversationAvatarFilePath(rawUrl) {
  const value = String(rawUrl || "").trim();
  if (!value) return "";
  let pathname = value;
  if (/^https?:\/\//i.test(value)) {
    try {
      pathname = new URL(value).pathname || "";
    } catch {
      pathname = value;
    }
  }
  if (!pathname.startsWith(conversationAvatarUploadPrefix)) return "";
  const fileName = path.basename(pathname);
  if (!fileName) return "";
  const fullPath = path.resolve(getConversationAvatarUploadRoot(), fileName);
  const root = getConversationAvatarUploadRoot();
  if (!fullPath.startsWith(root)) return "";
  return fullPath;
}

function removeLocalConversationAvatarFile(rawUrl) {
  const target = getLocalConversationAvatarFilePath(rawUrl);
  if (!target) return;
  try {
    if (fs.existsSync(target)) fs.unlinkSync(target);
  } catch (error) {
    console.warn("conversation avatar cleanup failed", error.message);
  }
}

async function removeStoredAvatarFile(rawUrl) {
  removeLocalAvatarFile(rawUrl);
  try {
    const { deleteStoredFile } = require("./object-storage.js");
    await deleteStoredFile(rawUrl);
  } catch (error) {
    console.warn("avatar remote cleanup failed", error.message);
  }
}

async function removeStoredConversationAvatarFile(rawUrl) {
  removeLocalConversationAvatarFile(rawUrl);
  try {
    const { deleteStoredFile } = require("./object-storage.js");
    await deleteStoredFile(rawUrl);
  } catch (error) {
    console.warn("conversation avatar remote cleanup failed", error.message);
  }
}

module.exports = {
  avatarUploadPrefix,
  get avatarUploadRoot() {
    return getAvatarUploadRoot();
  },
  conversationAvatarUploadPrefix,
  get conversationAvatarUploadRoot() {
    return getConversationAvatarUploadRoot();
  },
  buildAbsoluteAssetUrl,
  defaultAvatarUrl,
  removeLocalAvatarFile,
  removeLocalConversationAvatarFile,
  removeStoredAvatarFile,
  removeStoredConversationAvatarFile,
};
