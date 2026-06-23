const Message = require("../../models/Message.js");
const { DELETE_FOR_EVERYONE_MS } = require("./helpers.js");

async function applyMessageDelete({
  messageId,
  deleteFrom,
  forEveryone,
  userId,
}) {
  const message = await Message.findById(messageId);
  if (!message) return { ok: false, error: "Message not found" };

  if (forEveryone) {
    if (message.senderId.toString() !== String(userId)) {
      return { ok: false, error: "Only the sender can unsend for everyone" };
    }
    if (message.deletedForEveryone) {
      return { ok: true, everyone: true, message };
    }
    if (Number(message.e2eVersion) > 0) {
      return {
        ok: false,
        error: "Cannot unsend encrypted messages for everyone",
      };
    }
    if (
      Date.now() - new Date(message.createdAt).getTime() >
      DELETE_FOR_EVERYONE_MS
    ) {
      return { ok: false, error: "Unsend window expired" };
    }
    message.deletedForEveryone = true;
    message.deletedForEveryoneAt = new Date();
    message.text = "";
    message.imageUrl = "";
    message.fileData = "";
    message.audioData = "";
    message.fileName = "";
    message.e2eBox = "";
    message.e2eNonce = "";
    message.e2eVersion = 0;
    message.messageType = "text";
    await message.save();
    return { ok: true, everyone: true, message };
  }

  for (const userid of deleteFrom || []) {
    const uid = userid?.toString?.() || userid;
    if (uid && !message.deletedFrom.some((d) => d.toString() === String(uid))) {
      message.deletedFrom.push(uid);
    }
  }
  await message.save();
  return { ok: true, everyone: false };
}

const deleteMessageHandler = async (data) => {
  const { messageId, deleteFrom, forEveryone, userId } = data;
  const result = await applyMessageDelete({
    messageId,
    deleteFrom: forEveryone ? [] : deleteFrom || [],
    forEveryone: Boolean(forEveryone),
    userId,
  });
  if (!result.ok) return { ok: false };
  return {
    ok: true,
    everyone: result.everyone,
    message: result.message,
  };
};

module.exports = {
  applyMessageDelete,
  deleteMessageHandler,
};
