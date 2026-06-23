const { z } = require("zod");
const { objectId } = require("./common.js");

const createConversationSchema = z.object({
  members: z.array(objectId).min(1),
});

const createGroupSchema = z.object({
  name: z.string().trim().min(1).max(80),

  description: z.string().trim().max(180).optional(),

  memberIds: z.array(objectId).optional().default([]),
});

const createChannelSchema = z.object({
  name: z.string().trim().min(1).max(80),

  description: z.string().trim().max(180).optional(),

  channelSlug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]+$/)
    .max(80)
    .optional(),

  visibility: z.enum(["public", "private"]).optional(),

  memberIds: z.array(objectId).optional().default([]),
});

const addGroupMembersSchema = z.object({
  memberIds: z.array(objectId).min(1),
});

const promoteAdminSchema = z.object({
  userId: objectId,
});

const createTopicSchema = z.object({
  name: z.string().trim().min(1).max(60),

  description: z.string().trim().max(180).optional(),
});

const updateTopicSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),

  description: z.string().trim().max(180).optional(),
});

const createInviteLinkSchema = z.object({
  label: z.string().trim().max(80).optional(),

  maxUses: z.union([z.number(), z.string(), z.null()]).optional(),

  expiresAt: z.union([z.string(), z.null()]).optional(),
});

const updateInviteLinkSchema = z.object({
  label: z.string().trim().max(80).optional(),

  maxUses: z.union([z.number(), z.string(), z.null()]).optional(),

  expiresAt: z.union([z.string(), z.null()]).optional(),
});

const banMemberSchema = z.object({
  userId: objectId,

  reason: z.string().trim().max(200).optional(),

  expiresAt: z.union([z.string(), z.null()]).optional(),
});

const patchConversationSettingsSchema = z.object({
  name: z.string().trim().max(80).optional(),

  description: z.string().trim().max(180).optional(),

  channelPostingMode: z.enum(["all", "admins_only"]).optional(),

  defaultMemberRights: z
    .object({
      canPostMessages: z.boolean().optional(),

      canAddMembers: z.boolean().optional(),

      canPinMessages: z.boolean().optional(),

      canEditInfo: z.boolean().optional(),
    })
    .optional(),
});

const patchMemberPermissionsSchema = z.object({
  canPostMessages: z.boolean().optional(),

  canAddMembers: z.boolean().optional(),

  canPinMessages: z.boolean().optional(),

  canEditInfo: z.boolean().optional(),
});

const enableDmE2eSchema = z.object({
  wrappedKeys: z.array(
    z.object({
      userId: objectId,

      box: z.string().min(1),

      nonce: z.string().min(1),
    }),
  ),
});

module.exports = {
  createConversationSchema,
  createGroupSchema,
  createChannelSchema,
  addGroupMembersSchema,
  promoteAdminSchema,
  createTopicSchema,
  updateTopicSchema,
  createInviteLinkSchema,
  updateInviteLinkSchema,
  banMemberSchema,
  patchConversationSettingsSchema,
  patchMemberPermissionsSchema,
  enableDmE2eSchema,
};
