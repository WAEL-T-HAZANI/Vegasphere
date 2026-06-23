const Notification = require("../models/Notification.js");

function truncate(value, max = 160) {
  const text = String(value || "").trim().replace(/\s+/g, " ");
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 3)).trim()}...`;
}

function getIO() {
  try {
    const socket = require("../socket/index.js");
    return typeof socket.getIO === "function" ? socket.getIO() : null;
  } catch {
    return null;
  }
}

function emitNotificationEvent(userId, eventName, payload) {
  const io = getIO();
  const uid = String(userId || "");
  if (!io || !uid) return;
  io.to(uid).emit(eventName, payload);
  if (eventName !== "notifications-updated") {
    io.to(uid).emit("notifications-updated", {
      at: new Date().toISOString(),
    });
  }
}

function serializeNotification(doc) {
  if (!doc) return null;
  const raw = typeof doc.toObject === "function" ? doc.toObject() : doc;
  return {
    _id: raw._id,
    recipientId: raw.recipientId,
    actorId: raw.actorId,
    type: raw.type,
    link: raw.link,
    data: raw.data || {},
    readAt: raw.readAt,
    dismissedAt: raw.dismissedAt,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

async function populateNotification(query) {
  return query.populate("actorId", "name username email profilePic");
}

async function createChatInviteNotification({ recipientId, actorId }) {
  const recipient = String(recipientId || "");
  const actor = String(actorId || "");
  if (!recipient || !actor || recipient === actor) return null;

  const existing = await Notification.findOne({
    recipientId: recipient,
    actorId: actor,
    type: "chat_invite",
    dismissedAt: null,
    "data.status": "pending",
  });

  if (existing) return existing;

  const doc = await Notification.create({
    recipientId: recipient,
    actorId: actor,
    type: "chat_invite",
    link: `/user/${actor}`,
    data: { status: "pending" },
  });

  const populated = await populateNotification(
    Notification.findById(doc._id),
  );
  const payload = serializeNotification(populated);
  emitNotificationEvent(recipient, "notification-created", payload);
  return populated;
}

async function createMentionNotifications({ message, conversation }) {
  const mentioned = Array.isArray(message?.mentionedUserIds)
    ? [...new Set(message.mentionedUserIds.map(String).filter(Boolean))]
    : [];
  const sender = String(message?.senderId?._id || message?.senderId || "");
  const conversationId = String(
    conversation?._id || message?.conversationId?._id || message?.conversationId || "",
  );
  if (!mentioned.length || !sender || !conversationId) return [];

  const conversationName = String(
    conversation?.name || message?.conversationId?.name || "",
  ).trim();
  const preview = truncate(message?.text || "", 160);
  const created = [];

  for (const recipient of mentioned) {
    if (!recipient || recipient === sender) continue;
    const existing = await Notification.findOne({
      recipientId: recipient,
      type: "mention",
      "data.messageId": message._id,
      dismissedAt: null,
    });
    if (existing) continue;

    const doc = await Notification.create({
      recipientId: recipient,
      actorId: sender,
      type: "mention",
      link: `/chats/${conversationId}`,
      data: {
        status: "pending",
        conversationId,
        conversationName,
        messageId: message._id,
        preview,
      },
    });
    const populated = await populateNotification(Notification.findById(doc._id));
    const payload = serializeNotification(populated);
    emitNotificationEvent(recipient, "notification-created", payload);
    created.push(populated);
  }

  return created;
}

async function createCallInviteNotifications({ invite, conversation }) {
  const creator = String(invite?.creatorId?._id || invite?.creatorId || "");
  const conversationId = String(
    conversation?._id || invite?.conversationId?._id || invite?.conversationId || "",
  );
  const members = Array.isArray(conversation?.members)
    ? conversation.members.map(String).filter(Boolean)
    : [];
  if (!creator || !conversationId || !members.length) return [];

  const conversationName = String(conversation?.name || "").trim();
  const inviteId = invite?._id;
  const token = String(invite?.token || "");
  const created = [];

  for (const recipient of members) {
    if (!recipient || recipient === creator) continue;
    const existing = await Notification.findOne({
      recipientId: recipient,
      type: "call_invite",
      "data.callInviteId": inviteId,
      dismissedAt: null,
    });
    if (existing) continue;

    const doc = await Notification.create({
      recipientId: recipient,
      actorId: creator,
      type: "call_invite",
      link: token ? `/call/${token}` : "/calls",
      data: {
        status: "pending",
        conversationId,
        conversationName,
        callInviteId: inviteId,
        callToken: token,
        callMode: invite?.mode === "video" ? "video" : "audio",
        callTitle: truncate(invite?.title || "", 140),
        scheduledFor: invite?.scheduledFor || null,
      },
    });
    const populated = await populateNotification(Notification.findById(doc._id));
    const payload = serializeNotification(populated);
    emitNotificationEvent(recipient, "notification-created", payload);
    created.push(populated);
  }

  return created;
}

async function resolveChatInviteNotifications({ recipientId, actorId, status }) {
  const recipient = String(recipientId || "");
  const actor = String(actorId || "");
  if (!recipient || !actor) return;

  const now = new Date();
  await Notification.updateMany(
    {
      recipientId: recipient,
      actorId: actor,
      type: "chat_invite",
      dismissedAt: null,
      "data.status": "pending",
    },
    {
      $set: {
        readAt: now,
        "data.status": status,
      },
    },
  );

  emitNotificationEvent(recipient, "notifications-updated", {
    at: now.toISOString(),
  });
}

async function resolveCallInviteNotifications({ callInviteId, status }) {
  const id = String(callInviteId || "");
  if (!id) return;
  const now = new Date();
  const rows = await Notification.find({
    type: "call_invite",
    "data.callInviteId": id,
    dismissedAt: null,
  }).select("recipientId");

  await Notification.updateMany(
    {
      type: "call_invite",
      "data.callInviteId": id,
      dismissedAt: null,
    },
    {
      $set: {
        readAt: now,
        "data.status": status,
      },
    },
  );

  for (const row of rows) {
    emitNotificationEvent(row.recipientId, "notifications-updated", {
      at: now.toISOString(),
    });
  }
}

module.exports = {
  createChatInviteNotification,
  createCallInviteNotifications,
  createMentionNotifications,
  emitNotificationEvent,
  populateNotification,
  resolveCallInviteNotifications,
  resolveChatInviteNotifications,
  serializeNotification,
};
