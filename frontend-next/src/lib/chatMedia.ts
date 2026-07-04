// @ts-nocheck
import { resolveAssetUrl, isVideoLike } from "@/lib/messageFormat";

function resolveMediaUrl(m) {
  const imageUrl = resolveAssetUrl(m?.imageUrl || "");
  const fileUrl = resolveAssetUrl(m?.fileData || m?.mediaUrl || "");
  return imageUrl || fileUrl;
}

export function extractMediaItemsFromMessages(messages) {
  if (!Array.isArray(messages)) return [];

  const items = [];

  for (const m of messages) {
    if (!m) continue;

    const url = resolveMediaUrl(m);
    if (!url) continue;

    const fileType = String(m.fileType || "");
    const fileName = String(m.fileName || "");
    const isVideo =
      m.messageType === "video" ||
      isVideoLike({ url, fileType, fileName });

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
  if (!Array.isArray(items) || !messageId) return -1;

  const id = String(messageId);

  return items.findIndex((it) => it?.messageId === id);
}
