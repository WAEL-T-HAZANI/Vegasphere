const { z } = require("zod");

const translateSchema = z.object({
  text: z.string().trim().min(1).max(5000),
  targetLanguage: z.string().trim().optional(),
  sourceLanguage: z.string().trim().optional(),
});

const smartReplyMessageSchema = z
  .object({
    role: z.string().trim().optional(),
    sender: z.string().trim().optional(),
    content: z.string().trim().max(1000).optional(),
    text: z.string().trim().max(1000).optional(),
  })
  .refine((item) => Boolean(String(item.content || item.text || "").trim()), {
    message: "Each message needs text or content",
  });

const smartRepliesSchema = z.object({
  language: z.string().trim().optional(),

  subject: z.string().trim().max(120).optional(),

  tone: z.string().trim().max(40).optional(),

  regenerate: z.boolean().optional(),

  variationSeed: z.number().int().min(0).max(9999).optional(),

  conversationKind: z
    .enum(["dm", "group", "channel", "self", "preview"])
    .optional(),

  messages: z.array(smartReplyMessageSchema).max(20).optional(),

  recentMessages: z
    .array(
      z.object({
        sender: z.string().trim().optional(),
        text: z.string().trim().max(1000),
      }),
    )
    .max(20)
    .optional(),
});

module.exports = {
  translateSchema,
  smartRepliesSchema,
};
