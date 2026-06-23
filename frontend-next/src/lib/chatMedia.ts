// @ts-nocheck
import { API_ORIGIN } from "@/lib/constants";

function isVideoUrl(url, fileType = "", fileName = "") {
  const ft = String(fileType || "");
  if (ft.startsWith("video/")) return true;
  const u = String(url || "");
  const fn = String(fileName || "");
  return (
    /\.(mp4|webm|ogg|mov|m4v)(\?|$)/i.test(u) ||
    /\.(mp4|webm|ogg|mov|m4v)$/i.test(fn)
  );
}

function resolveAssetUrl(raw) {
  const v = String(raw ?? "").trim();
  if (!v) return "";

  if (/^https?:\/\//i.test(v) || /^data:/i.test(v) || /^blob:/i.test(v)) {
    return v;
  }

  const base = String(API_ORIGIN ?? "").replace(/\/+$/, "");
  const path = v.startsWith("/") ? v : `/${v}`;

  return `${base}${path}`;
}

export function extractMediaItemsFromMessages(messages) {
  if (!Array.isArray(messages)) return [];

  const items = [];

  for (const m of messages) {
    if (!m) continue;

    const url = resolveAssetUrl(m.imageUrl || m.fileData || m.mediaUrl);
    if (!url) continue;

    const isVideo =
      m.messageType === "video" ||
      isVideoUrl(url, m.fileType, m.fileName);

    items.push({
      url,
      type: isVideo ? "video" : "image",
      title: m.text || undefined,
      messageId: m._id ? String(m._id) : undefined,
      conversationId: m.conversationId ? String(m.conversationId) : undefined,
      viewOnce: Boolean(m.viewOnce),
    });
  }

  return items;
}

export function findMediaGalleryIndex(items, messageId) {
  if (!Array.isArray(items) || !messageId) return 0;

  const id = String(messageId);

  const index = items.findIndex((it) => it?.messageId === id);

  return index >= 0 ? index : 0;
}
