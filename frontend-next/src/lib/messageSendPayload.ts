import type { Message } from "@/types";

/** Build a send payload that satisfies backend Zod (omit null/invalid optionals). */
export function buildRetrySendPayload(
  msg: Message,
  conversationId: string,
  senderId: string,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    conversationId,
    senderId,
    text: String(msg.text || ""),
    messageType: msg.messageType || "text",
  };

  if (msg.imageUrl) payload.imageUrl = msg.imageUrl;
  if (msg.fileName) payload.fileName = msg.fileName;
  if (msg.fileType) payload.fileType = msg.fileType;
  const fileSize = Number(msg.fileSize);
  if (fileSize > 0) payload.fileSize = fileSize;
  if (msg.fileData) payload.fileData = msg.fileData;
  if (msg.audioData) payload.audioData = msg.audioData;
  const audioDuration = Number(msg.audioDuration);
  if (audioDuration > 0) payload.audioDuration = audioDuration;

  const loc = msg.location as { lat?: number; lng?: number; label?: string } | null;
  if (
    loc &&
    Number.isFinite(Number(loc.lat)) &&
    Number.isFinite(Number(loc.lng))
  ) {
    payload.location = loc;
  }

  const replyId = msg.replyTo
    ? String((msg.replyTo as { _id?: string })?._id || msg.replyTo)
    : "";
  if (replyId) payload.replyTo = replyId;

  if (msg.forwardedFrom) payload.forwardedFrom = msg.forwardedFrom;

  const e2eVersion = Number(msg.e2eVersion) || 0;
  if (e2eVersion > 0) {
    payload.e2eVersion = e2eVersion;
    if (msg.e2eBox) payload.e2eBox = msg.e2eBox;
    if (msg.e2eNonce) payload.e2eNonce = msg.e2eNonce;
  }

  if (Array.isArray(msg.mentionedUserIds) && msg.mentionedUserIds.length) {
    payload.mentionedUserIds = msg.mentionedUserIds;
  }
  if (msg.poll) payload.poll = msg.poll;

  const disappearAfterSec = Number(msg.disappearAfterSec);
  if (disappearAfterSec >= 1) payload.disappearAfterSec = disappearAfterSec;

  if (msg.viewOnce) payload.viewOnce = true;
  if (msg.topicId) payload.topicId = msg.topicId;
  if (msg.threadRootId) payload.threadRootId = msg.threadRootId;
  if (msg.uploadToken) payload.uploadToken = msg.uploadToken;

  return payload;
}
