const { z } = require("zod");

const objectId = z
  .string()
  .trim()
  .regex(/^[a-f\d]{24}$/i, "Invalid id");

const idParamSchema = z.object({ id: objectId });

const sessionIdParamSchema = z.object({
  sessionId: z.string().trim().min(1).max(128),
});

const joinTokenParamSchema = z.object({
  token: z.string().trim().min(8).max(128),
});

const callTokenParamSchema = z.object({ token: objectId });

const conversationMemberParamsSchema = z.object({
  id: objectId,
  userId: objectId,
});

const conversationTopicParamsSchema = z.object({
  id: objectId,
  topicId: z.string().trim().min(1).max(80),
});

const conversationInviteTokenParamsSchema = z.object({
  id: objectId,
  token: z.string().trim().min(8).max(128),
});

const messageListParamsSchema = z.object({
  id: objectId,
  userid: objectId,
});

const fromUserIdParamSchema = z.object({ fromUserId: objectId });

const inviteIdParamSchema = z.object({ inviteId: objectId });

const searchQuerySchema = z.object({
  q: z.string().trim().max(80).optional().default(""),
});

const messageSearchQuerySchema = z.object({
  q: z.string().trim().max(80).optional().default(""),
  conversationId: objectId.optional(),
});

const presenceQuerySchema = z.object({
  ids: z.string().trim().max(2000).optional().default(""),
});

const syncQuerySchema = z.object({
  since: z.string().trim().max(40).optional().default(""),
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

const linkPreviewQuerySchema = z.object({
  url: z.string().trim().min(1).max(2000),
});

const threadRootParamSchema = z.object({ rootId: objectId });

const conversationIdParamSchema = z.object({ conversationId: objectId });

module.exports = {
  objectId,
  idParamSchema,
  sessionIdParamSchema,
  joinTokenParamSchema,
  callTokenParamSchema,
  conversationMemberParamsSchema,
  conversationTopicParamsSchema,
  conversationInviteTokenParamsSchema,
  messageListParamsSchema,
  fromUserIdParamSchema,
  inviteIdParamSchema,
  searchQuerySchema,
  messageSearchQuerySchema,
  presenceQuerySchema,
  syncQuerySchema,
  linkPreviewQuerySchema,
  threadRootParamSchema,
  conversationIdParamSchema,
};
