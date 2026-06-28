const { ApiError } = require("../../services/http-error.js");
const Message = require("../../models/Message.js");
const Conversation = require("../../models/Conversation.js");
const { createStagedUpload } = require("../../services/message-upload.js");
const { notifyAfterMessageSend } = require("./helpers.js");
const { sendMessageHandler } = require("./send.service.js");
const {
  createMentionNotifications,
} = require("../../services/notification-service.js");

const httpSendMessage = async (req, res) => {
    const senderId = req.user.id;
    const conversationId = req.body.conversationId;
    const clientTempId = req.body.clientTempId
      ? String(req.body.clientTempId)
      : "";

    if (!conversationId) {
      throw ApiError.badRequest("conversationId required");
    }

    const conversation =
      await Conversation.findById(conversationId).populate("members");

    if (
      !conversation ||
      !conversation.members.some(
        (m) => m._id.toString() === senderId.toString(),
      )
    ) {
      throw ApiError.forbidden();
    }

    const senderStr = String(senderId);
    const otherMemberIds = conversation.members
      .filter((m) => m._id.toString() !== senderStr)
      .map((m) => m._id.toString());

    const result = await sendMessageHandler({
      text: req.body.text,
      imageUrl: req.body.imageUrl,
      messageType: req.body.messageType,
      fileName: req.body.fileName,
      fileType: req.body.fileType,
      fileSize: req.body.fileSize,
      fileData: req.body.fileData,
      location: req.body.location,
      audioData: req.body.audioData,
      audioDuration: req.body.audioDuration,
      senderId,
      conversationId,
      replyTo: req.body.replyTo,
      forwardedFrom: req.body.forwardedFrom,
      otherMemberIds,
      inRoomUserIds: [],
      e2eVersion: req.body.e2eVersion,
      e2eBox: req.body.e2eBox,
      e2eNonce: req.body.e2eNonce,
      mentionedUserIds: req.body.mentionedUserIds,
      scheduledFor: req.body.scheduledFor,
      poll: req.body.poll,
      disappearAfterSec: req.body.disappearAfterSec,
      viewOnce: req.body.viewOnce,
      topicId: req.body.topicId,
      threadRootId: req.body.threadRootId,

      // IMPORTANT: needed for voice/file staged upload
      uploadToken: req.body.uploadToken,
    });

    if (!result?.ok || !result.message) {
      throw new ApiError(
        result?.code || 400,
        result?.error || "Could not send message",
      );
    }

    const message = result.message;

    if (message.scheduledStatus !== "pending") {
      await notifyAfterMessageSend(message, {
        otherMemberIds,
        inRoomUserIds: [],
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

    const populated = await Message.findById(message._id)
      .populate("senderId", "name email profilePic")
      .populate("reactions.users", "name email profilePic");

    res.status(201).json({
      ...(populated.toObject?.() || populated),
      ...(clientTempId ? { clientTempId } : {}),
    });
  
};

const uploadMessageAttachment = async (req, res) => {
    const file = req.file;
    const requestedType = String(req.body?.kind || "")
      .trim()
      .toLowerCase();

    if (!file) {
      throw ApiError.badRequest("file required");
    }

    const mime = String(file.mimetype || "application/octet-stream");
    const isAudio = requestedType === "audio" || mime.startsWith("audio/");
    const isImage = requestedType === "image" || mime.startsWith("image/");
    const isVideo = requestedType === "video" || mime.startsWith("video/");
    const kind = isAudio
      ? "audio"
      : isImage
        ? "image"
        : isVideo
          ? "video"
          : "file";

    const staged = createStagedUpload({
      userId: req.user.id,
      file,
      kind,
    });

    return res.status(201).json({
      ok: true,
      kind,
      uploadToken: staged.token,
      url: `/uploads/messages/${staged.storedName}`,
      fileName: staged.fileName,
      fileType: staged.fileType,
      fileSize: staged.fileSize,
    });
  
};

module.exports = {
  httpSendMessage,
  uploadMessageAttachment,
};
