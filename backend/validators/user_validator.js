const { z } = require("zod");
const { objectId } = require("./common.js");

const subscribePushSchema = z.object({
  endpoint: z.string().trim().min(1),

  keys: z.object({
    p256dh: z.string().trim().min(1),

    auth: z.string().trim().min(1),
  }),
});

const unsubscribePushSchema = z.object({
  endpoint: z.string().trim().min(1),
});

const e2ePublicKeySchema = z.object({
  publicKey: z.string().trim().min(40),
});

const matchContactsSchema = z.object({
  hashes: z.array(z.string().trim().min(1)).max(200),
});

const patchChatInboxSchema = z.object({
  conversationId: objectId,

  action: z.enum([
    "pin",
    "unpin",
    "mute",
    "unmute",
    "archive",
    "unarchive",
    "hide",
    "show",
  ]),
});

const updateProfileSchema = z.object({
  name: z.string().trim().min(3).max(50).optional(),

  username: z
    .string()
    .trim()
    .min(3)
    .max(20)
    .regex(/^[a-z0-9_]+$/i)
    .optional(),

  email: z.string().trim().email().optional(),

  about: z.string().trim().max(300).optional(),

  oldpassword: z.string().min(8).optional(),

  newpassword: z.string().min(8).optional(),

  phone: z.string().trim().max(20).optional(),

  showLastSeen: z.boolean().optional(),

  showOnlineStatus: z.boolean().optional(),

  doNotDisturb: z.boolean().optional(),

  pushNotificationsEnabled: z.boolean().optional(),

  readReceiptsEnabled: z.boolean().optional(),

  typingIndicatorsEnabled: z.boolean().optional(),

  lastSeenVisibility: z.enum(["everyone", "contacts", "nobody"]).optional(),

  onlineVisibility: z.enum(["everyone", "contacts", "nobody"]).optional(),

  profilePhotoVisibility: z.enum(["everyone", "contacts", "nobody"]).optional(),

  aboutVisibility: z.enum(["everyone", "contacts", "nobody"]).optional(),

  callPrivacy: z.enum(["everyone", "contacts", "nobody"]).optional(),

  searchDiscoverable: z.enum(["everyone", "contacts", "nobody"]).optional(),

  groupAddPermission: z.enum(["everyone", "contacts", "nobody"]).optional(),

  loginAlertsEnabled: z.boolean().optional(),

  notificationRules: z
    .object({
      direct: z.boolean().optional(),
      groups: z.boolean().optional(),
      mentions: z.boolean().optional(),
      mutedUntil: z.coerce.date().nullable().optional(),
      sound: z.boolean().optional(),
      vibrate: z.boolean().optional(),
      previews: z.boolean().optional(),
    })
    .partial()
    .optional(),
});

const sendInviteSchema = z.object({});

const reportUserSchema = z.object({
  reason: z.string().trim().min(4).max(500),
});

module.exports = {
  subscribePushSchema,
  unsubscribePushSchema,
  e2ePublicKeySchema,
  matchContactsSchema,
  patchChatInboxSchema,
  updateProfileSchema,
  sendInviteSchema,
  reportUserSchema,
};
