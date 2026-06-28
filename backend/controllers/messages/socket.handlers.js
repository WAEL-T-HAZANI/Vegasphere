const mongoose = require("mongoose");
const Message = require("../../models/Message.js");
const Conversation = require("../../models/Conversation.js");

const reactMessageHandler = async (data) => {
  const { messageId, reaction, userId } = data;
  if (!messageId || !userId) {
    return null;
  }
  const emoji = String(reaction || "")
    .trim()
    .slice(0, 16);
  if (!emoji) return null;

  const message = await Message.findById(messageId);
  if (!message) return null;

  const uid = String(userId);
  const conv = await Conversation.findById(message.conversationId).select(
    "members",
  );
  if (!conv?.members?.some((m) => String(m) === uid)) {
    return null;
  }

  const next = Array.isArray(message.reactions)
    ? message.reactions.map((row) => ({
        emoji: String(row?.emoji || ""),
        users: Array.isArray(row?.users) ? row.users.map((u) => String(u)) : [],
      }))
    : [];

  let bucket = next.find((row) => row.emoji === emoji);
  if (!bucket) {
    bucket = { emoji, users: [] };
    next.push(bucket);
  }

  if (bucket.users.includes(uid)) {
    bucket.users = bucket.users.filter((id) => id !== uid);
  } else {
    for (const row of next) {
      row.users = row.users.filter((id) => id !== uid);
    }
    bucket.users.push(uid);
  }

  message.reactions = next
    .filter((row) => row.emoji && row.users.length > 0)
    .map((row) => ({
      emoji: row.emoji,
      users: row.users.map((id) => new mongoose.Types.ObjectId(id)),
    }));
  await message.save();

  return Message.findById(messageId)
    .populate("senderId", "name email profilePic")
    .populate("reactions.users", "name email profilePic");
};

const editMessageHandler = async (data) => {
  const { messageId, text, senderId } = data;
  if (!messageId) return null;
  const message = await Message.findById(messageId);
  if (!message) return null;
  if (Number(message.e2eVersion) > 0) {
    return null;
  }
  if (senderId && message.senderId.toString() !== senderId.toString()) {
    return null;
  }
  message.text = text;
  message.isEdited = true;
  message.editedAt = new Date();
  await message.save();
  return message;
};

module.exports = {
  reactMessageHandler,
  editMessageHandler,
};
