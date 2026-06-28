const { ApiError } = require("../../services/http-error.js");
const mongoose = require("mongoose");
const Message = require("../../models/Message.js");
const Conversation = require("../../models/Conversation.js");
const User = require("../../models/User.js");
const bus = require("../../services/event-bus.js");
const { EVENTS } = bus;
const { assertCanPost, assertCanPin } = require("../../services/conversation-permissions.js");
const {
  safeGetIO,
  nextConversationSeq,
  E2E_LIST_PREVIEW,
  getLatestMessageText,
  notifyAfterMessageSend,
  syncLatestMessageOnEdit,
} = require("./helpers.js");
const { applyMessageDelete } = require("./delete.service.js");
const { editMessageHandler, reactMessageHandler } = require("./socket.handlers.js");

const deleteMessage = async (req, res) => {
  const msgid = req.body.messageid;
  const userids = req.body.userids;
  const forEveryone = Boolean(req.body.forEveryone);
  const result = await applyMessageDelete({
    messageId: msgid,
    deleteFrom: userids || [],
    forEveryone,
    userId: req.user.id,
  });
  if (!result.ok) {
    throw ApiError.badRequest(result.error || "Could not delete message");
  }
  if (result.everyone) {
    if (result.message) {
      const populated = await Message.findById(result.message._id).populate(
        "senderId",
        "name email profilePic",
      );
      bus.publish(EVENTS.MESSAGE_DELETED, {
        message: populated?.toObject?.() || populated,
      });
    }
    return res.json({ ok: true, message: result.message });
  }
  return res.json({ ok: true });
};

/** Create a new message in `toConversationId` pointing at an original (forward). */
const forwardMessage = async (req, res) => {
    const { messageId, toConversationId } = req.body;
    const userId = req.user.id;
    const orig = await Message.findById(messageId);
    const conv = await Conversation.findById(toConversationId);
    if (!orig || !conv) {
      throw ApiError.notFound("Not found");
    }
    if (!conv.members.some((m) => m.toString() === userId.toString())) {
      throw ApiError.forbidden("Not a member");
    }
    const fwdPost = assertCanPost(conv, userId);
    if (!fwdPost.ok) {
      throw new ApiError(fwdPost.code || 403, fwdPost.error);
    }

    const origSender = await User.findById(orig.senderId);
    const origEv = Number(orig.e2eVersion) || 0;
    const targetE2e = Boolean(conv.e2eEnabled);
    const carryE2e = targetE2e && origEv > 0;
    const plainFromClient = String(req.body.plaintext || "").trim();
    let fwdText = orig.text;
    if (origEv > 0 && !carryE2e) {
      fwdText = plainFromClient || E2E_LIST_PREVIEW;
    }
    const latestMessageText = getLatestMessageText({
      messageType: orig.messageType,
      text: fwdText,
      e2eVersion: carryE2e ? origEv : 0,
    });

    const seq = await nextConversationSeq(toConversationId);

    const message = await Message.create({
      conversationId: toConversationId,
      senderId: userId,
      seq,
      text: fwdText,
      imageUrl: orig.imageUrl,
      messageType: orig.messageType || "text",
      fileName: orig.fileName,
      fileType: orig.fileType,
      fileSize: orig.fileSize,
      seenBy: [],
      e2eVersion: carryE2e ? origEv : 0,
      e2eBox: carryE2e ? orig.e2eBox || "" : "",
      e2eNonce: carryE2e ? orig.e2eNonce || "" : "",
      forwardedFrom: {
        conversationId: orig.conversationId,
        messageId: orig._id,
        previewText: (fwdText || "").slice(0, 140),
        originalSenderName: origSender?.name || "",
      },
    });

    conv.latestMessage = latestMessageText;
    conv.unreadCounts = conv.unreadCounts.map((u) => {
      if (u.userId.toString() !== userId.toString()) u.count += 1;
      return u;
    });
    await conv.save();

    const otherMemberIds = conv.members
      .map((m) => String(m))
      .filter((m) => m !== String(userId));

    await notifyAfterMessageSend(message, {
      otherMemberIds,
      inRoomUserIds: [],
      clientTempId: "",
      conversationMeta: {
        isGroup: Boolean(conv.isGroup),
        isChannel: Boolean(conv.isChannel),
      },
    });

    res.json(message);
  
};

/** Pin/unpin messages (multi-pin). */
const togglePinMessage = async (req, res) => {
    const { messageId, conversationId, pinned } = req.body;
    const userId = req.user.id;
    const conv = await Conversation.findById(conversationId);
    if (
      !conv ||
      !conv.members.some((m) => m.toString() === userId.toString())
    ) {
      throw ApiError.forbidden();
    }
    if (conv.isGroup || conv.isChannel) {
      const pinCheck = assertCanPin(conv, userId);
      if (!pinCheck.ok) {
        throw new ApiError(pinCheck.code || 403, pinCheck.error);
      }
    }
    const msg = await Message.findById(messageId);
    if (!msg || msg.conversationId.toString() !== String(conversationId)) {
      throw ApiError.notFound("Not found");
    }
    if (pinned) {
      msg.isPinned = true;
    } else {
      msg.isPinned = false;
    }
    await msg.save();
    res.json(msg);
    try {
      const io = safeGetIO();
      if (io) {
        const pinnedDocs = await Message.find({ conversationId, isPinned: true })
          .sort({ updatedAt: -1, createdAt: -1 })
          .select("_id")
          .lean();
        const pinnedMessageIds = pinnedDocs.map((row) => String(row._id));
        io.to(String(conversationId)).emit("message-pin-sync", {
          conversationId: String(conversationId),
          pinnedMessageIds,
          pinnedMessageId: pinnedMessageIds[0] || null,
        });
      }
    } catch (e) {
      console.warn("message-pin-sync emit:", e.message);
    }
  
};

/** Toggle saved state for the current user on a message. */
const toggleSavedMessage = async (req, res) => {
    const { messageId } = req.body;
    const userId = req.user.id;
    const msg = await Message.findById(messageId);
    if (!msg) {
      throw ApiError.notFound("Not found");
    }
    const conv = await Conversation.findById(msg.conversationId);
    if (
      !conv ||
      !conv.members.some((m) => m.toString() === userId.toString())
    ) {
      throw ApiError.forbidden();
    }
    const sid = userId.toString();
    const has = msg.starredBy.some((s) => s.toString() === sid);
    if (has) {
      msg.starredBy = msg.starredBy.filter((s) => s.toString() !== sid);
    } else {
      msg.starredBy.push(userId);
    }
    await msg.save();
    res.json(msg);
  
};

const httpEditMessage = async (req, res) => {
    const { messageId, text } = req.body || {};
    if (!messageId || text === undefined) {
      throw ApiError.badRequest("messageId and text required");
    }
    const updated = await editMessageHandler({
      messageId,
      text: String(text),
      senderId: req.user.id,
    });
    if (!updated) {
      throw ApiError.badRequest("Cannot edit this message");
    }
    const populated = await Message.findById(updated._id).populate(
      "senderId",
      "name email profilePic",
    );

    try {
      await syncLatestMessageOnEdit(updated, String(text));
    } catch (e) {
      console.warn("edit latestMessage sync:", e.message);
    }

    bus.publish(EVENTS.MESSAGE_EDITED, {
      message: populated?.toObject?.() || populated,
    });
    res.json(populated);
  
};

const httpReactMessage = async (req, res) => {
  const { messageId, reaction } = req.body || {};
  if (!messageId) {
    throw ApiError.badRequest("messageId required");
  }
  const updated = await reactMessageHandler({
    messageId,
    reaction,
    userId: req.user.id,
  });
  if (!updated) {
    throw ApiError.badRequest("Cannot react to this message");
  }
  bus.publish(EVENTS.REACTION_UPDATED, {
    message: updated?.toObject?.() || updated,
  });
  res.json(updated);
};

const votePollMessage = async (req, res) => {
    const { messageId, optionId } = req.body || {};
    if (!messageId || !optionId) {
      throw ApiError.badRequest("messageId and optionId required");
    }

    const message = await Message.findById(messageId);
    if (
      !message ||
      message.messageType !== "poll" ||
      !message.poll?.options?.length
    ) {
      throw ApiError.notFound("Poll not found");
    }

    const conv = await Conversation.findById(message.conversationId);
    if (
      !conv ||
      !conv.members.some((m) => m.toString() === String(req.user.id)) ||
      (!conv.isGroup && !conv.isChannel)
    ) {
      throw ApiError.forbidden();
    }

    if (
      message.poll.closesAt &&
      new Date(message.poll.closesAt).getTime() <= Date.now()
    ) {
      throw ApiError.badRequest("Poll is closed");
    }

    const uid = String(req.user.id);
    const selected = message.poll.options.find(
      (row) => row.id === String(optionId),
    );
    if (!selected) {
      throw ApiError.badRequest("Poll option not found");
    }

    const alreadySelected = selected.voterIds.some((id) => String(id) === uid);

    if (message.poll.allowsMultiple) {
      selected.voterIds = alreadySelected
        ? selected.voterIds.filter((id) => String(id) !== uid)
        : [...selected.voterIds, new mongoose.Types.ObjectId(uid)];
    } else {
      message.poll.options.forEach((row) => {
        row.voterIds = row.voterIds.filter((id) => String(id) !== uid);
      });
      if (!alreadySelected) {
        selected.voterIds.push(new mongoose.Types.ObjectId(uid));
      }
    }

    await message.save();

    const populated = await Message.findById(message._id)
      .populate("senderId", "name email profilePic")
      .populate("reactions.users", "name email profilePic");

    try {
      const { getIO } = require("../../socket/index.js");
      const io = typeof getIO === "function" ? getIO() : null;
      if (io) {
        io.to(String(message.conversationId)).emit(
          "message-updated",
          populated,
        );
      }
    } catch {
      /* ignore */
    }

    return res.json(populated);
  
};

const openViewOnceMessage = async (req, res) => {
    const { messageId } = req.body || {};
    if (!messageId) {
      throw ApiError.badRequest("messageId required");
    }
    const message = await Message.findById(messageId);
    if (!message || !message.viewOnce) {
      throw ApiError.notFound("Message not found");
    }
    const openerId = String(req.user.id);

    // New behavior: view-once disappears for BOTH sides after anyone opens it.
    // We keep the doc for audit/history, but we remove it from all clients.
    if (!message.deletedForEveryone) {
      message.deletedForEveryone = true;
      message.deletedForEveryoneAt = new Date();
      message.text = "";
      message.imageUrl = "";
      message.fileData = "";
      message.audioData = "";
      message.fileName = "";
      message.fileType = "";
      message.fileSize = 0;
      message.location = undefined;
      message.poll = undefined;
      message.messageType = "text";
      message.viewOnce = false;
      await message.save();
    }

    const convId = String(message.conversationId);
    const msgId = String(message._id);

    try {
      const { getIO } = require("../../socket/index.js");
      const io = typeof getIO === "function" ? getIO() : null;
      if (io) {
        try {
          const populated = await Message.findById(message._id).populate(
            "senderId",
            "name email profilePic",
          );
          io.to(convId).emit("message-updated", {
            ...(populated?.toObject?.() || populated),
            viewOnceConsumed: true,
          });
        } catch {
          /* ignore */
        }
        // Remove from all members' UIs immediately.
        io.to(convId).emit("message-deleted", {
          messageId: msgId,
          conversationId: convId,
          openedBy: openerId,
          viewOnce: true,
          forEveryone: true,
        });
      }
    } catch {
      /* ignore */
    }

    return res.json({
      ok: true,
      removeForUser: true,
      removeForEveryone: true,
      messageId: msgId,
      conversationId: convId,
    });
  
};

const cancelScheduledMessage = async (req, res) => {
  const messageId = String(req.body.messageId || "");
  const userId = String(req.user.id);
  if (!mongoose.Types.ObjectId.isValid(messageId)) {
    throw ApiError.badRequest("Invalid message id");
  }

  const message = await Message.findById(messageId);
  if (!message) throw ApiError.notFound("Message not found");
  if (String(message.senderId) !== userId) {
    throw ApiError.forbidden("Only the sender can cancel a scheduled message");
  }
  if (message.scheduledStatus !== "pending") {
    throw ApiError.badRequest("Message is not pending schedule");
  }

  message.scheduledStatus = "cancelled";
  await message.save();

  const populated = await Message.findById(message._id).populate(
    "senderId",
    "name email profilePic",
  );
  bus.publish(EVENTS.MESSAGE_UPDATED, {
    message: populated?.toObject?.() || populated,
  });

  return res.json(populated);
};

module.exports = {
  deleteMessage,
  forwardMessage,
  togglePinMessage,
  toggleSavedMessage,
  httpEditMessage,
  httpReactMessage,
  votePollMessage,
  openViewOnceMessage,
  cancelScheduledMessage,
};
