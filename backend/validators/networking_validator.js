const { z } = require("zod");
const { objectId } = require("./common.js");

const tagSchema = z
  .string()
  .trim()
  .min(1)
  .max(32)
  .transform((value) => value.toLowerCase());

const tagListSchema = z
  .array(tagSchema)
  .max(16)
  .optional()
  .default([])
  .transform((items) => Array.from(new Set(items)));

const networkingProfileSchema = z.object({
  headline: z.string().trim().max(120).optional().default(""),
  skills: tagListSchema,
  interests: tagListSchema,
  lookingFor: z.string().trim().max(220).optional().default(""),
  openToCollaborate: z.boolean().optional().default(false),
});

const networkingPostSchema = z.object({
  title: z.string().trim().min(3).max(120),
  summary: z.string().trim().min(10).max(360),
  tags: z
    .array(tagSchema)
    .max(12)
    .optional()
    .default([])
    .transform((items) => Array.from(new Set(items))),
  roleNeeded: z.string().trim().max(80).optional().default(""),
});

const networkingPostUpdateSchema = networkingPostSchema.partial().refine(
  (body) =>
    body.title !== undefined ||
    body.summary !== undefined ||
    body.tags !== undefined ||
    body.roleNeeded !== undefined,
  { message: "At least one field is required" },
);

const introSchema = z.object({
  targetUserId: objectId,
  context: z.string().trim().max(240).optional().default(""),
  tone: z.enum(["friendly", "formal", "short"]).optional().default("friendly"),
  locale: z.string().trim().max(12).optional().default("en"),
});

const networkingQuerySchema = z.object({
  q: z.string().trim().max(80).optional().default(""),
  tag: z.string().trim().max(32).optional().default(""),
});

module.exports = {
  networkingProfileSchema,
  networkingPostSchema,
  networkingPostUpdateSchema,
  introSchema,
  networkingQuerySchema,
};
