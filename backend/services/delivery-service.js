/**
 * Delivery service: the single owner of message fan-out.
 *
 * Subscribes to the domain event bus and performs all side effects that used to be
 * inlined into controllers:
 *   - socket room broadcast (cross-node via the Socket.io Redis adapter)
 *   - per-recipient notifications + Web Push (respecting mute / ignore / mention rules)
 *   - unread mirror bumps
 *   - bounded retry with exponential backoff for transient push failures
 *
 * Controllers publish domain events and return immediately; this module turns those
 * events into delivery. That keeps the write path fast and lets delivery scale and
 * fail independently of persistence.
 */
const mongoose = require("mongoose");
const bus = require("./event-bus.js");
const { EVENTS } = bus;
const Message = require("../models/Message.js");
const User = require("../models/User.js");
const Conversation = require("../models/Conversation.js");
const { notifyUserPush } = require("./push-notify.js");
const { bumpUnreadMirror } = require("./redis-unread-mirror.js");
const ackService = require("./ack-service.js");

const E2E_PREVIEW = "🔒 Encrypted message";

let started = false;

function getIO() {
  try {
    const socket = require("../socket/index.js");
    return typeof socket.getIO === "function" ? socket.getIO() : null;
  } catch {
    return null;
  }
}

async function withRetry(fn, { attempts = 3, baseMs = 250 } = {}) {
  let lastErr = null;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const delay = baseMs * 2 ** i;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  if (lastErr) {
    console.warn("delivery retry exhausted:", lastErr.message);
  }
  return null;
}

function buildPreview(msg) {
  if (Number(msg.e2eVersion) > 0) return E2E_PREVIEW;
  if (msg.text && String(msg.text).trim()) {
    return String(msg.text).slice(0, 120);
  }
  switch (msg.messageType) {
    case "image":
      return "Image";
    case "video":
      return "Video";
    case "audio":
      return "Voice message";
    case "file":
      return "File";
    case "location":
      return "Location";
    case "poll":
      return "Poll";
    default:
      return "New message";
  }
}

/**
 * Core fan-out for a freshly created (and published) message.
 * payload: { message, otherMemberIds, inRoomUserIds, clientTempId }
 */
async function handleMessageCreated(payload) {
  const io = getIO();
  if (!io || !payload?.message) return;

  const { message, clientTempId } = payload;
  const otherMemberIds = (payload.otherMemberIds || []).map(String);
  const inRoom = new Set((payload.inRoomUserIds || []).map(String));
  const cid = String(message.conversationId?._id || message.conversationId);

  const outbound = {
    ...message,
    ...(clientTempId ? { clientTempId: String(clientTempId) } : {}),
  };

  io.to(cid).emit("receive-message", outbound);

  await bumpUnreadMirror(otherMemberIds, [...inRoom], cid);

  if (!otherMemberIds.length) return;

  const preview = buildPreview(message);
  const convOid = mongoose.Types.ObjectId.isValid(cid)
    ? new mongoose.Types.ObjectId(cid)
    : null;

  const senderOid = message.senderId?._id || message.senderId;
  const senderStr = senderOid ? String(senderOid) : "";
  const meta = payload.conversationMeta || {};
  const category = meta.isChannel
    ? "channel"
    : meta.isGroup
      ? "group"
      : "direct";
  const mentionIds = new Set((message.mentionedUserIds || []).map(String));

  let muted = new Set();
  let ignoredSenders = new Set();
  if (convOid) {
    const mutedRows = await User.find({
      _id: { $in: otherMemberIds },
      mutedConversationIds: convOid,
    })
      .select("_id")
      .lean();
    muted = new Set(mutedRows.map((r) => String(r._id)));
  }
  if (senderStr && mongoose.Types.ObjectId.isValid(senderStr)) {
    const ign = await User.find({
      _id: { $in: otherMemberIds },
      ignoredUserIds: new mongoose.Types.ObjectId(senderStr),
    })
      .select("_id")
      .lean();
    ignoredSenders = new Set(ign.map((r) => String(r._id)));
  }

  for (const uid of otherMemberIds) {
    if (inRoom.has(uid) || muted.has(uid) || ignoredSenders.has(uid)) continue;
    io.to(uid).emit("new-message-notification", outbound);
    withRetry(() =>
      notifyUserPush(uid, {
        title: "Vegasphere",
        body: preview,
        tag: cid,
        category,
        isMention: mentionIds.has(uid),
        data: { conversationId: cid, url: `/chat/${cid}` },
      }),
    );
  }
}

function emitToConversation(message, eventName) {
  const io = getIO();
  if (!io || !message) return;
  const cid = String(message.conversationId?._id || message.conversationId);
  io.to(cid).emit(eventName, message);
}

function handleAck(payload, eventName) {
  const io = getIO();
  if (!io || !payload?.conversationId) return;
  io.to(String(payload.conversationId)).emit(eventName, payload);
}

function handlePresence(payload) {
  const io = getIO();
  if (!io || !payload?.userId || !payload?.event) return;
  for (const room of payload.rooms || []) {
    io.to(String(room)).emit(payload.event, {
      userId: String(payload.userId),
      at: payload.at || Date.now(),
    });
  }
}

function start() {
  if (started) return;
  started = true;

  bus.subscribe(EVENTS.MESSAGE_CREATED, handleMessageCreated);
  bus.subscribe(EVENTS.MESSAGE_UPDATED, (p) =>
    emitToConversation(p?.message, "message-updated"),
  );
  bus.subscribe(EVENTS.MESSAGE_EDITED, (p) =>
    emitToConversation(p?.message, "message-edited"),
  );
  bus.subscribe(EVENTS.MESSAGE_DELETED, (p) => {
    const msg = p?.message;
    if (!msg) return;
    const io = getIO();
    if (!io) return;
    const cid = String(msg.conversationId?._id || msg.conversationId);
    const msgId = String(msg._id);
    io.to(cid).emit("message-deleted", {
      messageId: msgId,
      conversationId: cid,
      forEveryone: true,
    });
    emitToConversation(msg, "message-updated");
  });
  bus.subscribe(EVENTS.REACTION_UPDATED, (p) => {
    const msg = p?.message;
    if (!msg) return;
    const io = getIO();
    if (!io) return;
    const cid = String(msg.conversationId?._id || msg.conversationId);
    io.to(cid).emit("message-reacted", {
      messageId: String(msg._id),
      conversationId: cid,
      reactions: msg.reactions || [],
    });
  });
  bus.subscribe(EVENTS.MESSAGE_DELIVERED, (p) =>
    handleAck(p, "message-delivered"),
  );
  bus.subscribe(EVENTS.MESSAGE_READ, (p) => handleAck(p, "message-read"));
  bus.subscribe(EVENTS.PRESENCE_CHANGED, handlePresence);

  console.log("Delivery service started");
}

/**
 * Reliability sweep: re-deliver messages that recipients never acked as delivered.
 * Re-emits to each lagging recipient's personal room and re-pushes. Idempotent on
 * the client (same message id), and bounded so it can run on an interval at scale.
 */
async function redeliverUndeliveredMessages({
  olderThanMs = 20000,
  windowMs = 10 * 60 * 1000,
  limit = 200,
} = {}) {
  const io = getIO();
  if (!io) return 0;

  const now = Date.now();
  const cutoff = new Date(now - olderThanMs);
  const windowStart = new Date(now - windowMs);

  const candidates = await Message.find({
    createdAt: { $gte: windowStart, $lte: cutoff },
    scheduledStatus: { $ne: "pending" },
    deletedForEveryone: false,
    $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("senderId", "name email profilePic")
    .populate("conversationId", "members isGroup isChannel")
    .lean();

  let redelivered = 0;

  for (const msg of candidates) {
    const conv = msg.conversationId;
    if (!conv?.members?.length) continue;

    const senderStr = String(msg.senderId?._id || msg.senderId);
    const deliveredSet = new Set(
      (msg.deliveredTo || []).map((d) => String(d.user)),
    );
    const seenSet = new Set((msg.seenBy || []).map((s) => String(s.user)));

    const lagging = conv.members
      .map((m) => String(m._id || m))
      .filter(
        (uid) =>
          uid !== senderStr && !deliveredSet.has(uid) && !seenSet.has(uid),
      );

    if (!lagging.length) continue;

    const outbound = {
      ...msg,
      conversationId: String(conv._id || conv),
    };

    for (const uid of lagging) {
      io.to(uid).emit("receive-message", outbound);
    }
    redelivered += 1;
  }

  return redelivered;
}

/**
 * Offline sync (push side): when a user reconnects, replay messages they missed
 * while disconnected straight to their personal room, then mark them delivered.
 * The HTTP /message/sync endpoint is the pull-side counterpart for cold starts.
 */
async function flushUndeliveredForUser(userId, { windowMs = 7 * 24 * 60 * 60 * 1000, limit = 300 } = {}) {
  const io = getIO();
  const uid = String(userId || "");
  if (!io || !uid || !mongoose.Types.ObjectId.isValid(uid)) return 0;

  const myConvs = await Conversation.find({ members: uid })
    .select("_id")
    .lean();
  if (!myConvs.length) return 0;
  const convIds = myConvs.map((c) => c._id);

  const senderOid = new mongoose.Types.ObjectId(uid);
  const windowStart = new Date(Date.now() - windowMs);

  const missed = await Message.find({
    conversationId: { $in: convIds },
    senderId: { $ne: senderOid },
    createdAt: { $gte: windowStart },
    scheduledStatus: { $ne: "pending" },
    deletedForEveryone: false,
    deletedFrom: { $ne: senderOid },
    "deliveredTo.user": { $ne: senderOid },
    $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
  })
    .sort({ seq: 1, createdAt: 1 })
    .limit(limit)
    .populate("senderId", "name email profilePic")
    .lean();

  if (!missed.length) return 0;

  for (const msg of missed) {
    io.to(uid).emit("receive-message", {
      ...msg,
      conversationId: String(msg.conversationId),
    });
  }

  // Mark delivered through the ACK service so senders get delivery receipts.
  await ackService
    .markDelivered({ userId: uid, messageIds: missed.map((m) => String(m._id)) })
    .catch((e) => console.warn("flush markDelivered:", e.message));

  return missed.length;
}

module.exports = {
  start,
  redeliverUndeliveredMessages,
  flushUndeliveredForUser,
  withRetry,
};
