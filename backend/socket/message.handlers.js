/**
 * Real-time message socket handlers (send / react / edit / delete).
 * HTTP routes remain for REST fallback; these mirror that behavior with acks/fan-out.
 */

const Message = require("../models/Message.js");
const Conversation = require("../models/Conversation.js");
const bus = require("../services/event-bus.js");
const { EVENTS } = bus;
const { sendMessageHandler } = require("../controllers/messages/send.service.js");
const { notifyAfterMessageSend, syncLatestMessageOnEdit } = require("../controllers/messages/helpers.js");
const {
  createMentionNotifications,
} = require("../services/notification-service.js");
const {
  reactMessageHandler,
  editMessageHandler,
} = require("../controllers/messages/socket.handlers.js");
const { deleteMessageHandler } = require("../controllers/messages/delete.service.js");

function populateMessage(id) {
  return Message.findById(id)
    .populate("senderId", "name email profilePic")
    .populate("reactions.users", "name email profilePic");
}

module.exports = function registerMessageSocketHandlers(io, socket) {
  const userId = socket.data?.userId;
  if (!userId) return;

  socket.on("send-message", async (data, cb) => {
    try {
      const conversationId = data?.conversationId;
      if (!conversationId) {
        if (typeof cb === "function") {
          cb({ ok: false, error: "conversationId required" });
        }
        return;
      }

      const conversation =
        await Conversation.findById(conversationId).populate("members");
      if (
        !conversation ||
        !conversation.members.some((m) => m._id.toString() === userId)
      ) {
        if (typeof cb === "function") {
          cb({ ok: false, error: "Forbidden" });
        }
        return;
      }

      const otherMemberIds = conversation.members
        .filter((m) => m._id.toString() !== userId)
        .map((m) => m._id.toString());

      const inRoom = io.sockets.adapter.rooms.get(String(conversationId));
      const inRoomUserIds = [];
      if (inRoom) {
        for (const sid of inRoom) {
          const peer = io.sockets.sockets.get(sid);
          const pid = peer?.data?.userId;
          if (pid && pid !== userId) inRoomUserIds.push(pid);
        }
      }

      const clientTempId = data?.clientTempId
        ? String(data.clientTempId)
        : "";

      const result = await sendMessageHandler({
        text: data.text,
        imageUrl: data.imageUrl,
        messageType: data.messageType,
        fileName: data.fileName,
        fileType: data.fileType,
        fileSize: data.fileSize,
        fileData: data.fileData,
        location: data.location,
        audioData: data.audioData,
        audioDuration: data.audioDuration,
        senderId: userId,
        conversationId,
        receiverId: data.receiverId,
        replyTo: data.replyTo,
        forwardedFrom: data.forwardedFrom,
        otherMemberIds,
        inRoomUserIds,
        e2eVersion: data.e2eVersion,
        e2eBox: data.e2eBox,
        e2eNonce: data.e2eNonce,
        mentionedUserIds: data.mentionedUserIds,
        scheduledFor: data.scheduledFor,
        poll: data.poll,
        disappearAfterSec: data.disappearAfterSec,
        viewOnce: data.viewOnce,
        topicId: data.topicId,
        threadRootId: data.threadRootId,
        uploadToken: data.uploadToken,
      });

      if (!result?.ok || !result.message) {
        if (typeof cb === "function") {
          cb({
            ok: false,
            error: result?.error || "Could not send message",
          });
        }
        return;
      }

      const message = result.message;

      if (message.scheduledStatus !== "pending") {
        await notifyAfterMessageSend(message, {
          otherMemberIds,
          inRoomUserIds,
          clientTempId,
          conversationMeta: {
            isGroup: Boolean(conversation.isGroup),
            isChannel: Boolean(conversation.isChannel),
          },
        });
        if (Array.isArray(message.mentionedUserIds) && message.mentionedUserIds.length) {
          await createMentionNotifications({ message, conversation });
        }
      }

      const populated = await populateMessage(message._id);
      const plain = populated?.toObject?.() || populated;
      if (typeof cb === "function") {
        cb({
          ok: true,
          message: {
            ...plain,
            ...(clientTempId ? { clientTempId } : {}),
          },
        });
      }
    } catch (err) {
      if (typeof cb === "function") {
        cb({ ok: false, error: err?.message || "Send failed" });
      }
    }
  });

  socket.on("react-message", async (data) => {
    try {
      const messageId = data?.messageId;
      if (!messageId) return;
      const updated = await reactMessageHandler({
        messageId,
        reaction: data.reaction,
        userId,
      });
      if (!updated) return;
      const cid = String(
        updated.conversationId?._id || updated.conversationId || data.conversationId,
      );
      bus.publish(EVENTS.REACTION_UPDATED, {
        message: updated?.toObject?.() || updated,
      });
      io.to(cid).emit("message-reacted", {
        messageId: String(updated._id),
        conversationId: cid,
        reactions: updated.reactions || [],
      });
    } catch (e) {
      console.warn("react-message:", e.message);
    }
  });

  socket.on("edit-message", async (data) => {
    try {
      const messageId = data?.messageId;
      if (!messageId) return;
      const updated = await editMessageHandler({
        messageId,
        text: data.text,
        senderId: userId,
      });
      if (!updated) return;
      await syncLatestMessageOnEdit(updated, data.text);
      const populated = await populateMessage(updated._id);
      bus.publish(EVENTS.MESSAGE_EDITED, {
        message: populated?.toObject?.() || populated,
      });
    } catch (e) {
      console.warn("edit-message:", e.message);
    }
  });

  socket.on("delete-message", async (data) => {
    try {
      const messageId = data?.messageId;
      if (!messageId) return;
      const forEveryone = Boolean(data.forEveryone);
      const deleteFrom = forEveryone
        ? []
        : (data.deleteFrom || []).map((id) => String(id));

      const result = await deleteMessageHandler({
        messageId,
        deleteFrom,
        forEveryone,
        userId,
      });
      if (!result.ok) return;

      const cid = String(
        result.message?.conversationId?._id ||
          result.message?.conversationId ||
          data.conversationId,
      );
      const msgId = String(messageId);

      if (result.everyone) {
        const populated = await populateMessage(result.message._id);
        bus.publish(EVENTS.MESSAGE_DELETED, {
          message: populated?.toObject?.() || populated,
        });
        io.to(cid).emit("message-deleted", {
          messageId: msgId,
          conversationId: cid,
          forEveryone: true,
        });
        return;
      }

      io.to(userId).emit("message-deleted", {
        messageId: msgId,
        conversationId: cid,
        forEveryone: false,
      });
    } catch (e) {
      console.warn("delete-message:", e.message);
    }
  });
};
