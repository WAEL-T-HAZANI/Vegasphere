const { z } = require("zod");
const { objectId } = require("./common.js");

const messageTypeSchema = z.enum([
  "text",
  "image",
  "video",
  "file",
  "audio",
  "location",
  "poll",
  "contact",
]);

const locationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  label: z.string().trim().max(200).optional(),
});

const pollSchema = z.object({
  question: z.string().trim().min(1).max(300),
  options: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(80).optional(),
        text: z.string().trim().min(1).max(160),
      }),
    )
    .min(2)
    .max(12),
  multiple: z.boolean().optional(),
  allowsMultiple: z.boolean().optional(),
  closesAt: z.coerce.date().optional(),
});

const forwardedFromSchema = z.object({
  conversationId: objectId.optional(),
  messageId: objectId.optional(),
  previewText: z.string().trim().max(140).optional(),
  originalSenderName: z.string().trim().max(80).optional(),
});

const sendMessageSchema = z.object({
  conversationId: objectId,
  text: z.string().max(5000).optional().default(""),
  imageUrl: z.string().max(2000).optional().default(""),
  messageType: messageTypeSchema.optional().default("text"),
  fileName: z.string().trim().max(255).optional(),
  fileType: z.string().trim().max(120).optional(),
  fileSize: z.number().int().min(0).max(100 * 1024 * 1024).optional(),
  fileData: z.string().max(2_000_000).optional(),
  location: locationSchema.optional(),
  audioData: z.string().max(2_000_000).optional(),
  audioDuration: z.number().min(0).max(60 * 60).optional(),
  replyTo: objectId.optional().nullable(),
  forwardedFrom: forwardedFromSchema.optional(),
  e2eVersion: z.number().int().min(0).optional(),
  e2eBox: z.string().max(20000).optional(),
  e2eNonce: z.string().max(512).optional(),
  mentionedUserIds: z.array(objectId).optional(),
  scheduledFor: z.coerce.date().optional(),
  poll: pollSchema.optional(),
  disappearAfterSec: z.number().int().min(1).max(60 * 60 * 24 * 30).optional(),
  viewOnce: z.boolean().optional(),
  topicId: z.string().trim().max(80).optional(),
  threadRootId: objectId.optional().nullable(),
  uploadToken: z.string().trim().regex(/^[a-zA-Z0-9._-]{8,120}$/).optional(),
  clientTempId: z.string().trim().max(120).optional(),
});

const editMessageSchema = z.object({
  messageId: objectId,
  text: z.string(),
});

const deleteMessageSchema = z.object({
  messageid: objectId,
  userids: z.array(objectId).optional(),
  forEveryone: z.boolean().optional(),
});

const forwardMessageSchema = z.object({
  messageId: objectId,
  toConversationId: objectId,
});

const pinMessageSchema = z.object({
  messageId: objectId,
  conversationId: objectId,
  pinned: z.boolean().optional(),
});

const saveMessageSchema = z.object({
  messageId: objectId,
});

const votePollSchema = z.object({
  messageId: objectId,
  optionId: z.string().trim().min(1),
});

const openViewOnceSchema = z.object({
  messageId: objectId,
});

const cancelScheduledSchema = z.object({
  messageId: objectId,
});

const reactMessageSchema = z.object({
  messageId: objectId,
  reaction: z.string().trim().min(1).max(16),
});

const markReadSchema = z.object({
  conversationId: objectId,
  messageIds: z.array(objectId).min(1),
});

const markDeliveredSchema = z
  .object({
    messageId: objectId.optional(),
    messageIds: z.array(objectId).optional(),
  })
  .refine((data) => data.messageId || data.messageIds?.length, {
    message: "messageId or messageIds required",
  });

module.exports = {
  sendMessageSchema,
  editMessageSchema,
  deleteMessageSchema,
  forwardMessageSchema,
  pinMessageSchema,
  saveMessageSchema,
  votePollSchema,
  openViewOnceSchema,
  cancelScheduledSchema,
  reactMessageSchema,
  markDeliveredSchema,
  markReadSchema,
};
