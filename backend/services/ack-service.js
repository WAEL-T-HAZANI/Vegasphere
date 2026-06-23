/**
 * Acknowledgement service: the single source of truth for delivery/read receipts.
 *
 * Both the HTTP endpoints (/message/delivered, /message/read) and the socket ACK
 * events funnel through here, so receipt state and the events emitted to senders
 * are always consistent regardless of transport.
 *
 * Marking is idempotent (a user is added to deliveredTo/seenBy at most once) and
 * each batch publishes a single domain event that the delivery service fans out.
 */
const mongoose = require("mongoose");
const Message = require("../models/Message.js");
const Conversation = require("../models/Conversation.js");
const User = require("../models/User.js");
const bus = require("./event-bus.js");
const { EVENTS } = bus;
const { clearUnreadMirror } = require("./redis-unread-mirror.js");

function uniqIds(raw, cap = 200) {
  return [...new Set((raw || []).map((id) => String(id)).filter(Boolean))].slice(
    0,
    cap,
  );
}

/**
 * Mark messages delivered to `userId`. Groups by conversation, validates membership,
 * and publishes one MESSAGE_DELIVERED event per conversation touched.
 * @returns {Promise<{ delivered: string[], byConversation: Map<string,string[]> }>}
 */
async function markDelivered({ userId, messageIds }) {
  const uid = String(userId || "");
  const ids = uniqIds(messageIds);
  const result = { delivered: [], byConversation: new Map() };
  if (!uid || !ids.length) return result;

  const messages = await Message.find({ _id: { $in: ids } });
  if (!messages.length) return result;

  const byConv = new Map();
  for (const msg of messages) {
    const convId = String(msg.conversationId || "");
    if (!convId) continue;
    if (!byConv.has(convId)) byConv.set(convId, []);
    byConv.get(convId).push(msg);
  }

  const convs = await Conversation.find({
    _id: { $in: [...byConv.keys()] },
  }).select("_id members");
  const convMap = new Map(convs.map((c) => [String(c._id), c]));

  const now = new Date();
  for (const [convId, rows] of byConv.entries()) {
    const conv = convMap.get(convId);
    if (!conv?.members.some((m) => String(m) === uid)) continue;

    const touched = [];
    for (const msg of rows) {
      if (String(msg.senderId) === uid) continue;
      if ((msg.deliveredTo || []).some((d) => String(d.user) === uid)) continue;
      if (!Array.isArray(msg.deliveredTo)) msg.deliveredTo = [];
      msg.deliveredTo.push({ user: uid, deliveredAt: now });
      await msg.save();
      touched.push(String(msg._id));
    }

    if (touched.length) {
      result.byConversation.set(convId, touched);
      result.delivered.push(...touched);
      bus.publish(EVENTS.MESSAGE_DELIVERED, {
        conversationId: convId,
        messageId: touched[0],
        messageIds: touched,
        userId: uid,
        deliveredAt: now.toISOString(),
      });
    }
  }

  return result;
}

/**
 * Mark messages read by `userId` in a conversation. Honors the reader's read-receipt
 * privacy setting, zeroes their unread counter, clears the Redis mirror, and publishes
 * a MESSAGE_READ event.
 * @returns {Promise<{ read: string[] }>}
 */
async function markRead({ userId, conversationId, messageIds }) {
  const uid = String(userId || "");
  const convId = String(conversationId || "");
  const ids = uniqIds(messageIds);
  const result = { read: [] };
  if (!uid || !convId || !ids.length) return result;

  const conv = await Conversation.findById(convId);
  if (!conv?.members.some((m) => String(m) === uid)) return result;

  const me = await User.findById(uid).select("readReceiptsEnabled");
  const receiptsOn = me?.readReceiptsEnabled !== false;

  const messages = await Message.find({
    _id: { $in: ids },
    conversationId: convId,
    deletedFrom: { $ne: uid },
  });

  const now = new Date();
  const touched = [];
  for (const msg of messages) {
    if (String(msg.senderId) === uid) continue;
    if ((msg.seenBy || []).some((row) => String(row.user) === uid)) continue;
    if (receiptsOn) {
      if (!Array.isArray(msg.seenBy)) msg.seenBy = [];
      msg.seenBy.push({ user: uid, seenAt: now });
    }
    if (!Array.isArray(msg.deliveredTo)) msg.deliveredTo = [];
    if (!msg.deliveredTo.some((row) => String(row.user) === uid)) {
      msg.deliveredTo.push({ user: uid, deliveredAt: now });
    }
    await msg.save();
    touched.push(String(msg._id));
  }

  if (touched.length) {
    conv.unreadCounts = (conv.unreadCounts || []).map((row) => {
      if (String(row.userId) === uid) row.count = 0;
      return row;
    });
    await conv.save({ timestamps: false });
    await clearUnreadMirror(uid, convId);

    if (receiptsOn) {
      bus.publish(EVENTS.MESSAGE_READ, {
        conversationId: convId,
        messageIds: touched,
        userId: uid,
        readAt: now.toISOString(),
      });
    }
    result.read = touched;
  }

  return result;
}

module.exports = {
  markDelivered,
  markRead,
};
