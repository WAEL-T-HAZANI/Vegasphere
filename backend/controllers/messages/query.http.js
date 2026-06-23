const { ApiError } = require("../../services/http-error.js");
const mongoose = require("mongoose");
const Message = require("../../models/Message.js");
const Conversation = require("../../models/Conversation.js");
const ackService = require("../../services/ack-service.js");
const {
  isSearchQueryLongEnough,
  makeSearchRegex,
} = require("../../services/search-normalize.js");

/** Paginated history: newest page first; `beforeSeq` (preferred) or legacy `before` (_id). */
const allMessage = async (req, res) => {
    const convId = req.params.id;
    const userId = req.user.id;
    const memberConv = await Conversation.findById(convId);
    if (
      !memberConv ||
      !memberConv.members.some((m) => m.toString() === String(userId))
    ) {
      throw ApiError.forbidden();
    }

    const limit = Math.min(
      100,
      Math.max(1, parseInt(String(req.query.limit || "40"), 10) || 40),
    );
    const beforeSeqRaw = req.query.beforeSeq;
    const before = req.query.before;

    const baseFilter = {
      conversationId: convId,
      deletedFrom: { $ne: userId },
      $and: [
        { $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] },
      ],
      $or: [{ scheduledStatus: { $ne: "pending" } }, { senderId: userId }],
    };
    const query = { ...baseFilter };

    const beforeSeq = beforeSeqRaw != null && beforeSeqRaw !== ""
      ? parseInt(String(beforeSeqRaw), 10)
      : NaN;

    if (Number.isFinite(beforeSeq) && beforeSeq > 0) {
      query.seq = { $lt: beforeSeq };
    } else if (before && mongoose.Types.ObjectId.isValid(before)) {
      query._id = { $lt: new mongoose.Types.ObjectId(before) };
    }

    const batch = await Message.find(query)
      .sort(Number.isFinite(beforeSeq) && beforeSeq > 0 ? { seq: -1, _id: -1 } : { _id: -1 })
      .limit(limit + 1)
      .populate("senderId", "name email profilePic")
      .populate("reactions.users", "name email profilePic")
      .lean();

    const hasMore = batch.length > limit;
    const slice = hasMore ? batch.slice(0, limit) : batch;
    const chronological = slice.slice().reverse();

    const oldest = chronological.length > 0 ? chronological[0] : null;

    res.json({
      messages: chronological,
      hasMore,
      nextBefore: oldest ? String(oldest._id) : null,
      nextBeforeSeq: oldest?.seq != null ? Number(oldest.seq) : null,
    });
  
};

/** Search messages across conversations the user belongs to (or one conversation). */
const searchMessages = async (req, res) => {
    const q = (req.query.q || "").trim();
    if (!isSearchQueryLongEnough(q)) return res.json([]);

    const userId = req.user.id;
    const mine = await Conversation.find({ members: userId }).select("_id");
    const ids = mine.map((c) => c._id);
    const { conversationId } = req.query;

    if (
      conversationId &&
      !ids.some((id) => id.toString() === String(conversationId))
    ) {
      throw ApiError.forbidden();
    }

    const safeRegex = makeSearchRegex(q);
    if (!safeRegex) return res.json([]);

    const filter = {
      conversationId: conversationId ? conversationId : { $in: ids },
      deletedFrom: { $ne: userId },
      $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
      $and: [
        {
          $or: [
            { text: safeRegex },
            { fileName: safeRegex },
            { topicName: safeRegex },
          ],
        },
      ],
    };

    const messages = await Message.find(filter)
      .sort({ createdAt: -1 })
      .limit(60)
      .lean();
    res.json(messages);
  
};

const syncMessages = async (req, res) => {
  const userId = req.user.id;
  const limit = Math.min(
    500,
    Math.max(1, parseInt(String(req.query.limit || "200"), 10) || 200),
  );
  const sinceRaw = String(req.query.since || "").trim();
  const since = sinceRaw ? new Date(sinceRaw) : null;
  const sinceValid = since && !Number.isNaN(since.getTime());

  const convs = await Conversation.find({ members: userId })
    .select("_id")
    .lean();
  const convIds = convs.map((c) => c._id);
  if (!convIds.length) {
    return res.json({
      messages: [],
      serverTime: new Date().toISOString(),
      hasMore: false,
    });
  }

  const filter = {
    conversationId: { $in: convIds },
    deletedFrom: { $ne: userId },
    scheduledStatus: { $ne: "pending" },
    $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
  };
  if (sinceValid) {
    filter.createdAt = { $gt: since };
  }

  const messages = await Message.find(filter)
    .sort({ createdAt: 1, seq: 1 })
    .limit(limit)
    .populate("senderId", "name email profilePic")
    .populate("reactions.users", "name email profilePic")
    .lean();

  if (messages.length) {
    ackService
      .markDelivered({ userId, messageIds: messages.map((m) => String(m._id)) })
      .catch((e) => console.warn("sync markDelivered:", e.message));
  }

  return res.json({
    messages,
    serverTime: new Date().toISOString(),
    hasMore: messages.length === limit,
  });
};

/** Messages saved by the current user across conversations they belong to. */
const listSavedMessages = async (req, res) => {
    const userId = req.user.id;
    const convs = await Conversation.find({ members: userId }).select("_id");
    const convIds = convs.map((c) => c._id);
    const messages = await Message.find({
      conversationId: { $in: convIds },
      starredBy: userId,
      deletedFrom: { $ne: userId },
    })
      .sort({ createdAt: -1 })
      .limit(150)
      .populate("senderId", "name email profilePic")
      .populate("reactions.users", "name email profilePic")
      .populate("conversationId", "name isGroup isChannel")
      .lean();
    res.json(messages);
  
};

module.exports = {
  allMessage,
  searchMessages,
  syncMessages,
  listSavedMessages,
};
