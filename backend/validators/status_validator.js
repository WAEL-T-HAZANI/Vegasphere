const { z } = require("zod");

const createStatusSchema = z
  .object({
    text: z.string().trim().max(280).optional().default(""),

    imageUrl: z.string().trim().max(2000).optional().default(""),
  })
  .passthrough();

const statusReactSchema = z.object({
  emoji: z.string().trim().min(1).max(16),
});

const statusReplySchema = z.object({
  text: z.string().trim().min(1).max(500),
});

module.exports = {
  createStatusSchema,
  statusReactSchema,
  statusReplySchema,
};
