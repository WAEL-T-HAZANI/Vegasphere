const mongoose = require("mongoose");
const Message = require("../../models/Message.js");
const Conversation = require("../../models/Conversation.js");
const User = require("../../models/User.js");
const {
  prepareStagedUpload,
  discardStagedUpload,
} = require("../../services/message-upload.js");
const { assertCanPost } = require("../../services/conversation-permissions.js");
const {
  nextConversationSeq,
  normalizeStoredMediaUrl,
  normalizeScheduledFor,
  isFutureSchedule,
  normalizeDisappearAfterSec,
  normalizeMentionIds,
  normalizePollPayload,
  normalizeTopicPayload,
  E2E_LIST_PREVIEW,
  getLatestMessageText,
} = require("./helpers.js");

/**
 * Persists a message; supports 1:1 (legacy fields) and groups/channels via
 * `otherMemberIds` + `inRoomUserIds` from the socket layer.
 */
function sendFail(error, code = 400) {
  return { ok: false, error: String(error || "Could not send message"), code };
}

function sendOk(message) {
  return { ok: true, message };
}

const sendMessageHandler = async (data) => {
  const {
    text,
    imageUrl,
    messageType,
    fileName,
    fileType,
    fileSize,
    fileData,
    location,
    audioData,
    audioDuration,
    senderId,
    conversationId,
    receiverId,
    isReceiverInsideChatRoom,
    replyTo,
    forwardedFrom,
    threadRootId: rawThreadRootId,
    otherMemberIds: explicitOthers,
    inRoomUserIds: explicitInRoom,
    e2eVersion: rawE2eVersion,
    e2eBox,
    e2eNonce,
    mentionedUserIds: rawMentions,
    scheduledFor: rawScheduledFor,
    poll: rawPoll,
    disappearAfterSec: rawDisappearAfterSec,
    viewOnce: rawViewOnce,
    topicId: rawTopicId,
    uploadToken,
  } = data;

  const conversation =
    await Conversation.findById(conversationId).populate("members");
  if (!conversation) return sendFail("Conversation not found", 404);

  const senderStr = senderId.toString();
  const postCheck = assertCanPost(conversation, senderStr);
  if (!postCheck.ok) return sendFail(postCheck.error, postCheck.code || 403);
  let otherMemberIds =
    explicitOthers ||
    conversation.members
      .filter((m) => m._id.toString() !== senderStr)
      .map((m) => m._id.toString());

  if ((!otherMemberIds || !otherMemberIds.length) && receiverId) {
    otherMemberIds = [receiverId.toString()];
  }

  let inRoomUserIds = Array.isArray(explicitInRoom)
    ? [...new Set(explicitInRoom.map((id) => id.toString()))]
    : [];

  if (
    explicitInRoom === undefined &&
    receiverId !== undefined &&
    isReceiverInsideChatRoom !== undefined
  ) {
    inRoomUserIds = isReceiverInsideChatRoom ? [receiverId.toString()] : [];
  }

  const isDirect =
    otherMemberIds.length === 1 &&
    !conversation.isGroup &&
    !conversation.isChannel;

  const mt = messageType || "text";
  const ev = Number(rawE2eVersion) || 0;
  const eb = typeof e2eBox === "string" ? e2eBox : "";
  const en = typeof e2eNonce === "string" ? e2eNonce : "";
  const stagedUpload = uploadToken
    ? prepareStagedUpload({ token: uploadToken, userId: senderId })
    : null;
  if (uploadToken && !stagedUpload) {
    return sendFail("Invalid or expired upload token", 400);
  }

  const scheduledFor = normalizeScheduledFor(rawScheduledFor);
  const isScheduled = isFutureSchedule(scheduledFor);
  const disappearAfterSec = normalizeDisappearAfterSec(rawDisappearAfterSec);
  const viewOnce =
    Boolean(rawViewOnce) && ["image", "video", "file"].includes(mt);

  if (conversation.e2eEnabled && mt === "text") {
    if (!ev || !eb || !en) {
      if (uploadToken)
        discardStagedUpload({ token: uploadToken, userId: senderId });
      return sendFail("End-to-end encryption required for this chat", 400);
    }
  } else if (ev > 0 && !conversation.e2eEnabled) {
    if (uploadToken)
      discardStagedUpload({ token: uploadToken, userId: senderId });
    return sendFail("Encrypted messages are not allowed in this chat", 400);
  }

  if (isDirect) {
    const receiver = await User.findById(otherMemberIds[0]);
    const sender = await User.findById(senderId);
    if (
      sender?.blockedUsers?.some(
        (blockedId) => blockedId.toString() === otherMemberIds[0],
      ) ||
      receiver?.blockedUsers?.some(
        (blockedId) => blockedId.toString() === senderStr,
      )
    ) {
      if (uploadToken)
        discardStagedUpload({ token: uploadToken, userId: senderId });
      return sendFail("You cannot message this user", 403);
    }
  }

  let storedText = text;
  if (conversation.e2eEnabled && mt === "text" && ev > 0) {
    storedText = E2E_LIST_PREVIEW;
  }

  const latestMessageText = getLatestMessageText({
    messageType: mt,
    text: storedText,
    e2eVersion: ev,
  });

  const mentionIds =
    conversation.isGroup || conversation.isChannel
      ? normalizeMentionIds(rawMentions, conversation.members, senderStr)
      : [];
  const poll =
    mt === "poll" ? normalizePollPayload(rawPoll, conversation) : null;
  if (mt === "poll" && !poll) {
    if (uploadToken)
      discardStagedUpload({ token: uploadToken, userId: senderId });
    return sendFail("Invalid poll payload", 400);
  }
  // Minimal validation for structured messages.
  if (mt === "location") {
    const lat = Number(location?.lat);
    const lng = Number(location?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      if (uploadToken)
        discardStagedUpload({ token: uploadToken, userId: senderId });
      return sendFail("Invalid location coordinates", 400);
    }
  }
  const topic = normalizeTopicPayload(rawTopicId, conversation);

  let threadRootId = null;
  if (rawThreadRootId && mongoose.Types.ObjectId.isValid(String(rawThreadRootId))) {
    const rootId = String(rawThreadRootId);
    const rootMsg = await Message.findById(rootId).select(
      "conversationId threadRootId",
    );
    if (
      !rootMsg ||
      String(rootMsg.conversationId) !== String(conversationId)
    ) {
      if (uploadToken)
        discardStagedUpload({ token: uploadToken, userId: senderId });
      return sendFail("Invalid thread root message", 400);
    }
    threadRootId = rootId;
  }

  const finalImageUrl =
    stagedUpload &&
    (stagedUpload.kind === "image" || stagedUpload.kind === "video")
      ? stagedUpload.url
      : normalizeStoredMediaUrl(imageUrl);
  const finalFileData =
    stagedUpload && stagedUpload.kind === "file"
      ? stagedUpload.url
      : mt === "contact"
        ? String(fileData || "")
        : normalizeStoredMediaUrl(fileData);
  const finalAudioData =
    stagedUpload && stagedUpload.kind === "audio"
      ? stagedUpload.url
      : normalizeStoredMediaUrl(audioData);
  const finalFileName = stagedUpload?.fileName || fileName;
  const finalFileType = stagedUpload?.fileType || fileType;
  const finalFileSize = stagedUpload?.fileSize || fileSize;

  // Reserve a total-order seq now for live messages; scheduled drafts get one at publish.
  const seq = isScheduled ? 0 : await nextConversationSeq(conversationId);

  const message = await Message.create({
    conversationId,
    senderId,
    seq,
    text: mt === "poll" ? poll.question : storedText,
    imageUrl: finalImageUrl,
    messageType: mt,
    fileName: finalFileName,
    fileType: finalFileType,
    fileSize: finalFileSize,
    fileData: finalFileData,
    location,
    audioData: finalAudioData,
    audioDuration,
    seenBy: [],
    replyTo: replyTo || null,
    threadRootId: threadRootId || null,
    forwardedFrom: forwardedFrom || undefined,
    e2eVersion: ev,
    e2eBox: eb,
    e2eNonce: en,
    mentionedUserIds: mentionIds,
    topicId: topic.topicId,
    topicName: topic.topicName,
    poll: poll || undefined,
    disappearAfterSec,
    expiresAt:
      !isScheduled && disappearAfterSec > 0
        ? new Date(Date.now() + disappearAfterSec * 1000)
        : null,
    viewOnce,
    scheduledFor,
    scheduledStatus: isScheduled ? "pending" : "sent",
    publishedAt: isScheduled ? null : new Date(),
  });
  if (stagedUpload) {
    await stagedUpload.commit();
  }

  if (threadRootId) {
    await Message.findByIdAndUpdate(threadRootId, {
      $inc: { threadReplyCount: 1 },
    });
  }

  if (!isScheduled) {
    conversation.latestMessage = latestMessageText;
    conversation.unreadCounts = conversation.unreadCounts.map((unread) => {
      const uid = unread.userId.toString();
      const shouldInc = otherMemberIds.some((o) => o.toString() === uid);
      if (shouldInc) {
        unread.count += 1;
      }
      return unread;
    });
    await conversation.save();
  }
  return sendOk(message);
};

module.exports = {
  sendMessageHandler,
  sendFail,
  sendOk,
};
