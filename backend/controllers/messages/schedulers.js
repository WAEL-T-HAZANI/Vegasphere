const Message = require("../../models/Message.js");
const Conversation = require("../../models/Conversation.js");
const { assertCanPost } = require("../../services/conversation-permissions.js");
const bus = require("../../services/event-bus.js");
const { EVENTS } = bus;
const {
  cleanupExpiredStagedUploads,
} = require("../../services/message-upload.js");
const {
  nextConversationSeq,
  getLatestMessageText,
  notifyAfterMessageSend,
} = require("./helpers.js");

async function publishScheduledMessage(messageId) {
  const msg = await Message.findById(messageId).populate(
    "senderId",
    "name email profilePic",
  );
  if (!msg) return null;
  if (msg.scheduledStatus !== "pending") return msg;
  if (!msg.scheduledFor || new Date(msg.scheduledFor).getTime() > Date.now())
    return null;

  const conversation = await Conversation.findById(msg.conversationId).populate(
    "members",
  );
  if (!conversation?.members?.length) return null;

  const senderStr = String(msg.senderId?._id || msg.senderId);
  const postCheck = assertCanPost(conversation, senderStr);
  if (!postCheck.ok) {
    msg.scheduledStatus = "cancelled";
    await msg.save();
    return null;
  }

  msg.scheduledStatus = "sent";
  msg.publishedAt = new Date();
  // Assign the total-order seq at publish time so scheduled messages slot into the
  // live ordering when they actually go out, not when they were drafted.
  msg.seq = await nextConversationSeq(msg.conversationId);
  if (Number(msg.disappearAfterSec) > 0) {
    msg.expiresAt = new Date(
      msg.publishedAt.getTime() + Number(msg.disappearAfterSec) * 1000,
    );
  }
  await msg.save();
  const otherMemberIds = conversation.members
    .filter((m) => m._id.toString() !== senderStr)
    .map((m) => m._id.toString());

  const latestMessageText = getLatestMessageText({
    messageType: msg.messageType || "text",
    text: msg.text,
    e2eVersion: msg.e2eVersion,
  });
  conversation.latestMessage = latestMessageText;
  conversation.unreadCounts = conversation.unreadCounts.map((unread) => {
    const uid = unread.userId.toString();
    if (otherMemberIds.some((otherId) => otherId === uid)) {
      unread.count += 1;
    }
    return unread;
  });
  await conversation.save();

  await notifyAfterMessageSend(msg, {
    otherMemberIds,
    inRoomUserIds: [],
    clientTempId: "",
  });

  return msg;
}

async function publishDueScheduledMessages() {
  const due = await Message.find({
    scheduledStatus: "pending",
    scheduledFor: { $lte: new Date() },
  })
    .sort({ scheduledFor: 1 })
    .limit(25)
    .select("_id")
    .lean();

  for (const row of due) {
    try {
      await publishScheduledMessage(row._id);
    } catch (error) {
      console.error("scheduled publish failed", error);
    }
  }
}

async function expireDisappearingMessages() {
  const due = await Message.find({
    deletedForEveryone: false,
    expiresAt: { $lte: new Date() },
  })
    .sort({ expiresAt: 1 })
    .limit(25)
    .select("_id conversationId")
    .lean();

  for (const row of due) {
    try {
      const message = await Message.findById(row._id);
      if (!message || message.deletedForEveryone) continue;
      message.deletedForEveryone = true;
      message.deletedForEveryoneAt = new Date();
      message.text = "";
      message.imageUrl = "";
      message.fileData = "";
      message.audioData = "";
      message.fileName = "";
      message.poll = undefined;
      message.messageType = "text";
      await message.save();

      try {
        const populated = await Message.findById(message._id).populate(
          "senderId",
          "name email profilePic",
        );
        bus.publish(EVENTS.MESSAGE_DELETED, {
          message: populated?.toObject?.() || populated,
        });
      } catch {
        /* ignore */
      }
    } catch (error) {
      console.error("disappearing expire failed", error);
    }
  }
}

module.exports = {
  publishScheduledMessage,
  publishDueScheduledMessages,
  expireDisappearingMessages,
  cleanupExpiredStagedUploads,
};
