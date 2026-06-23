const { z } = require("zod");
const { objectId } = require("./common.js");

const createCallInviteSchema = z.object({
  conversationId: objectId,
  mode: z.enum(["audio", "video"]).optional(),
  title: z.string().max(120).optional(),
  scheduledFor: z.union([z.string(), z.date(), z.null()]).optional(),
});

module.exports = {
  createCallInviteSchema,
};
