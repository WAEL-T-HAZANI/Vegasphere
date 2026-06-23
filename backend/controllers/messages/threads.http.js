const { ApiError } = require("../../services/http-error.js");
const mongoose = require("mongoose");
const Message = require("../../models/Message.js");
const Conversation = require("../../models/Conversation.js");

const listThreadMessages = async (req, res) => {
  const rootId = String(req.params.rootId || "");
  const userId = String(req.user.id);
  if (!mongoose.Types.ObjectId.isValid(rootId)) {
    throw ApiError.badRequest("Invalid thread id");
  }

  const root = await Message.findById(rootId)
    .populate("senderId", "name email profilePic")
    .lean();
  if (!root) throw ApiError.notFound("Thread not found");

  const conv = await Conversation.findById(root.conversationId).select("members");
  if (!conv?.members?.some((m) => String(m) === userId)) {
    throw ApiError.forbidden();
  }

  const limit = Math.min(
    100,
    Math.max(1, parseInt(String(req.query.limit || "50"), 10) || 50),
  );
  const before = req.query.before;

  const query = {
    conversationId: root.conversationId,
    threadRootId: rootId,
    deletedFrom: { $ne: userId },
    $or: [{ scheduledStatus: { $ne: "pending" } }, { senderId: userId }],
  };
  if (before && mongoose.Types.ObjectId.isValid(before)) {
    query._id = { $lt: new mongoose.Types.ObjectId(before) };
  }

  const batch = await Message.find(query)
    .sort({ _id: -1 })
    .limit(limit + 1)
    .populate("senderId", "name email profilePic")
    .lean();

  const hasMore = batch.length > limit;
  const slice = hasMore ? batch.slice(0, limit) : batch;
  const chronological = slice.slice().reverse();

  return res.json({
    root: {
      _id: root._id,
      conversationId: root.conversationId,
      threadRootId: root.threadRootId,
      threadReplyCount: root.threadReplyCount || 0,
      text: root.text || "",
      messageType: root.messageType || "text",
      imageUrl: root.imageUrl || "",
      fileName: root.fileName || "",
      senderId: root.senderId,
      createdAt: root.createdAt,
      e2eVersion: root.e2eVersion || 0,
    },
    messages: chronological,
    hasMore,
    nextBefore:
      chronological.length > 0 ? String(chronological[0]._id) : null,
  });
};

module.exports = { listThreadMessages };
