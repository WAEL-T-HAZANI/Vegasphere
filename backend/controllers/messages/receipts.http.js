const { ApiError } = require("../../services/http-error.js");
const ackService = require("../../services/ack-service.js");

const markDeliveredMessage = async (req, res) => {
  const rawIds = Array.isArray(req.body?.messageIds)
    ? req.body.messageIds
    : req.body?.messageId
      ? [req.body.messageId]
      : [];
  if (!rawIds.length) {
    throw ApiError.badRequest("messageId or messageIds required");
  }
  const out = await ackService.markDelivered({
    userId: req.user.id,
    messageIds: rawIds,
  });
  return res.json({ ok: true, messageIds: out.delivered });
};

const markReadMessage = async (req, res) => {
  const conversationId = req.body?.conversationId;
  const messageIds = Array.isArray(req.body?.messageIds)
    ? req.body.messageIds
    : [];
  if (!conversationId || !messageIds.length) {
    throw ApiError.badRequest("conversationId and messageIds required");
  }
  const out = await ackService.markRead({
    userId: req.user.id,
    conversationId,
    messageIds,
  });
  return res.json({ ok: true, messageIds: out.read });
};

module.exports = {
  markDeliveredMessage,
  markReadMessage,
};
