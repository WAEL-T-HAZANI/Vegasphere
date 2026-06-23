// @ts-nocheck
import { API_ORIGIN } from "@/lib/constants";

export function voiceFileExtension(mime) {
  const m = String(mime || "").toLowerCase();
  if (m.includes("ogg")) return "ogg";
  if (m.includes("mp4") || m.includes("aac") || m.includes("m4a")) return "m4a";
  if (m.includes("mpeg") || m.includes("mp3")) return "mp3";
  return "webm";
}

export function normalizeAudioMime(mime) {
  const m = String(mime || "").toLowerCase();
  if (m.includes("webm")) return "audio/webm";
  if (m.includes("ogg")) return "audio/ogg";
  if (m.includes("mp4") || m.includes("aac") || m.includes("m4a")) return "audio/mp4";
  if (m.includes("mpeg") || m.includes("mp3")) return "audio/mpeg";
  if (m.startsWith("audio/")) return m.split(";")[0];
  return "audio/webm";
}

export function isVideoLike({ url, fileType, fileName }) {
  const u = String(url || "");
  const ft = String(fileType || "");
  const fn = String(fileName || "");
  if (ft.startsWith("video/")) return true;
  return (
    /\.(mp4|webm|ogg|mov|m4v)(\?|$)/i.test(u) ||
    /\.(mp4|webm|ogg|mov|m4v)$/i.test(fn)
  );
}

export function isPdfLike({ url, fileType, fileName }) {
  const u = String(url || "");
  const ft = String(fileType || "");
  const fn = String(fileName || "");
  if (ft === "application/pdf") return true;
  return /\.pdf(\?|$)/i.test(u) || /\.pdf$/i.test(fn);
}

export function fileKindLabel({ fileType, fileName }) {
  const ft = String(fileType || "");
  const fn = String(fileName || "");
  if (ft.startsWith("image/")) return "Image";
  if (ft.startsWith("video/")) return "Video";
  if (ft.startsWith("audio/")) return "Audio";
  if (isPdfLike({ fileType: ft, fileName: fn })) return "PDF";
  if (/\.docx$/i.test(fn)) return "DOCX";
  if (/\.xlsx$/i.test(fn)) return "XLSX";
  if (/\.pptx$/i.test(fn)) return "PPTX";
  if (/\.zip$/i.test(fn)) return "ZIP";
  if (/\.rar$/i.test(fn)) return "RAR";
  return ft ? ft : "File";
}

export function resolveAssetUrl(raw) {
  const v = String(raw || "").trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v) || /^data:/i.test(v) || /^blob:/i.test(v)) return v;
  return `${String(API_ORIGIN || "").replace(/\/+$/, "")}${v.startsWith("/") ? "" : "/"}${v}`;
}

export function formatFileSize(bytes) {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n <= 0) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(2)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export async function copyToClipboard(text) {
  const v = String(text || "");
  if (!v) return false;
  try {
    await navigator.clipboard.writeText(v);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = v;
      ta.setAttribute("readonly", "true");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

function resolveDownloadFilename(href, filename) {
  const trimmed = String(filename || "").trim();
  if (trimmed) return trimmed;
  try {
    const base = new URL(href).pathname.split("/").pop();
    if (base) return decodeURIComponent(base);
  } catch {
    /* ignore */
  }
  return "download";
}

function isSameOriginHref(href) {
  if (typeof window === "undefined") return false;
  try {
    return new URL(href).origin === window.location.origin;
  } catch {
    return false;
  }
}

function clickDownloadLink(href, filename) {
  const a = document.createElement("a");
  a.href = href;
  a.download = resolveDownloadFilename(href, filename);
  a.rel = "noreferrer";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function isUploadAssetUrl(href) {
  try {
    return /\/uploads\//i.test(new URL(href).pathname);
  } catch {
    return /\/uploads\//i.test(String(href || ""));
  }
}

function buildAttachmentDownloadUrl(href, filename) {
  try {
    const url = new URL(href);
    url.searchParams.set("download", "1");
    const name = resolveDownloadFilename(href, filename);
    if (name && name !== "download") {
      url.searchParams.set("filename", name);
    }
    return url.toString();
  } catch {
    const sep = String(href || "").includes("?") ? "&" : "?";
    const name = encodeURIComponent(resolveDownloadFilename(href, filename));
    return `${href}${sep}download=1&filename=${name}`;
  }
}

export async function triggerBrowserDownload(url, filename, options = {}) {
  const href = resolveAssetUrl(url);
  if (!href) return;

  const name = resolveDownloadFilename(href, filename);
  const fileType = String(options?.fileType || "");

  if (/^(blob:|data:)/i.test(href)) {
    clickDownloadLink(href, name);
    return;
  }

  const preferAttachment =
    isUploadAssetUrl(href) ||
    !isSameOriginHref(href) ||
    isVideoLike({ url: href, fileName: name, fileType });

  if (preferAttachment) {
    clickDownloadLink(buildAttachmentDownloadUrl(href, name), name);
    return;
  }

  try {
    const res = await fetch(href, { credentials: "include", mode: "cors" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    clickDownloadLink(objectUrl, name);
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  } catch {
    clickDownloadLink(buildAttachmentDownloadUrl(href, name), name);
  }
}

export function mapHrefFromLocation(loc) {
  const lat = Number(loc?.lat);
  const lng = Number(loc?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return "";
  return `https://www.google.com/maps?q=${encodeURIComponent(`${lat},${lng}`)}`;
}

export function safeParseJson(text) {
  try {
    if (!text) return null;
    return JSON.parse(String(text));
  } catch {
    return null;
  }
}

export function replyPreviewText(parent, t, textOverride) {
  if (!parent) return "";
  if (textOverride != null && String(textOverride).trim()) {
    const s = String(textOverride).slice(0, 120);
    return s + (String(textOverride).length > 120 ? "…" : "");
  }
  if (parent.text?.trim()) {
    const s = parent.text.slice(0, 120);
    return s + (parent.text.length > 120 ? "…" : "");
  }
  if (parent.messageType === "audio" || parent.audioData) return `[${t("voiceMessage")}]`;
  if (parent.messageType === "file") {
    return parent.fileName || `[${t("fileAttachment")}]`;
  }
  if (parent.imageUrl) return `[${t("replyBannerMedia")}]`;
  return "";
}

export function replyPreviewKind(parent, t) {
  if (!parent) return "";
  if (parent.messageType === "audio" || parent.audioData) return t("voiceMessage");
  if (parent.messageType === "file") return t("fileAttachment");
  if (parent.imageUrl) return t("replyBannerMedia");
  return t("replyText");
}

/** Text sent to smart-reply context for plain and rich message types. */
export function smartReplyContextText(message, decryptedText, t) {
  if (!message) return "";
  const raw =
    decryptedText != null && String(decryptedText).trim()
      ? decryptedText
      : message.text || "";
  const body = String(raw).trim();
  if (body) return body;
  if (message.messageType === "audio" || message.audioData) {
    return `[${t("voiceMessage")}]`;
  }
  if (message.messageType === "file") {
    return String(message.fileName || t("fileAttachment")).trim();
  }
  if (message.imageUrl) return `[${t("replyBannerMedia")}]`;
  if (message.location) return `[${t("shareLocation")}]`;
  if (message.messageType === "poll") {
    return String(message.text || message.poll?.question || "").trim();
  }
  return "";
}

export function normalizeReactionGroups(message) {
  if (Array.isArray(message?.reactions) && message.reactions.length > 0) {
    return message.reactions
      .map((row) => ({
        emoji: String(row?.emoji || ""),
        users: Array.isArray(row?.users) ? row.users.filter(Boolean) : [],
      }))
      .filter((row) => row.emoji && row.users.length > 0);
  }
  if (message?.reaction) {
    return [{ emoji: String(message.reaction), users: [] }];
  }
  return [];
}

export function countReceiptUsers(arr) {
  if (!Array.isArray(arr)) return 0;
  const ids = new Set();
  for (const row of arr) {
    const id = row?.user?._id || row?.user;
    if (id) ids.add(String(id));
  }
  return ids.size;
}

export function countPollVotes(poll) {
  if (!poll?.options?.length) return 0;
  return poll.options.reduce(
    (sum, option) => sum + (Array.isArray(option?.voterIds) ? option.voterIds.length : 0),
    0
  );
}

export function escapeRegExp(text) {
  return String(text || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const QUICK_REACTIONS = ["👍", "❤️", "😂", "🔥", "😮", "😢", "👏", "🎉"];

export const EMOJI_PICKER = [
  "😀","😃","😄","😁","😆","😅","🤣","😂","🙂","🙃","😉","😊","😍","😘","😗","😙","😚","😋","😛","😝","😜","🤪","🤨","🧐","🤓","😎","🥳","😤","😭","🥺","😱","🤯","😴","🤮","🤧","😷","🤒","🤕",
  "👍","👎","👏","🙏","🤝","💪","🫶","👀","✅","❌","⚠️","🎉","🔥","✨","⭐","💯","❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎",
  "🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐵",
];
