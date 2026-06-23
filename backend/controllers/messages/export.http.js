const Message = require("../../models/Message.js");
const Conversation = require("../../models/Conversation.js");
const User = require("../../models/User.js");
const { sendExport } = require("../../services/api-response.js");
const { ApiError } = require("../../services/http-error.js");

const exportConversation = async (req, res) => {
  const convId = String(req.params.conversationId || "");
  const userId = String(req.user.id);

  const conv = await Conversation.findById(convId).lean();
  if (!conv || !conv.members?.some((m) => String(m) === userId)) {
    throw ApiError.forbidden();
  }

  const messages = await Message.find({
    conversationId: convId,
    deletedFrom: { $ne: userId },
    scheduledStatus: { $ne: "pending" },
  })
    .sort({ seq: 1, createdAt: 1 })
    .limit(5000)
    .populate("senderId", "name email")
    .lean();

  const me = await User.findById(userId).select("name email").lean();

  const payload = {
    exportedAt: new Date().toISOString(),
    exportedBy: { name: me?.name, email: me?.email },
    conversation: {
      _id: conv._id,
      name: conv.name || "",
      isGroup: Boolean(conv.isGroup),
      isChannel: Boolean(conv.isChannel),
    },
    messageCount: messages.length,
    messages: messages.map((m) => ({
      _id: m._id,
      seq: m.seq,
      messageType: m.messageType,
      text: m.text,
      sender: m.senderId
        ? { name: m.senderId.name, email: m.senderId.email }
        : null,
      createdAt: m.createdAt,
      isEdited: m.isEdited,
      threadRootId: m.threadRootId || null,
    })),
  };

  const filename = `vegasphere-export-${convId.slice(-8)}.json`;
  return sendExport(res, payload, filename);
};

module.exports = { exportConversation };
