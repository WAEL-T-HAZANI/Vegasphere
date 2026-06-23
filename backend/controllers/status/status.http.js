const { ApiError } = require("../../services/http-error.js");
const Status = require("../../models/Status.js");
const Conversation = require("../../models/Conversation.js");
const {
  getChatPeerIds,
  serializeReply,
  serializeStatus,
} = require("./helpers.js");
const { publishStatusUpdated } = require("../../services/status-notify.js");

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;
const STATUS_TEXT_MAX = 280;

async function notifyStatusPeers(ownerId, statusId, kind) {
  const peerIds = await getChatPeerIds(ownerId);
  publishStatusUpdated({ ownerId, statusId, kind, peerIds });
}

async function canAccessStatus(status, viewerId) {
  const ownerId = String(status?.userId?._id || status?.userId || "");
  const uid = String(viewerId || "");
  if (!ownerId || !uid) return false;
  if (ownerId === uid) return true;

  const shared = await Conversation.exists({
    members: { $all: [ownerId, uid] },
  });
  return Boolean(shared);
}

async function getAccessibleStatus(statusId, viewerId) {
  const status = await Status.findById(statusId);
  if (!status || status.expiresAt <= new Date()) {
    throw ApiError.notFound("Not found");
  }
  if (!(await canAccessStatus(status, viewerId))) {
    throw ApiError.notFound("Not found");
  }
  return status;
}

const postStatus = async (req, res) => {
    const { text = "", imageUrl = "" } = req.body || {};

    const uploadedUrl = req.file?.filename
      ? `/uploads/status/${req.file.filename}`
      : "";

    const finalImageUrl = uploadedUrl || String(imageUrl || "");

    if (!String(text || "").trim() && !String(finalImageUrl || "").trim()) {
      throw ApiError.badRequest("text or image required");
    }

    const expiresAt = new Date(Date.now() + DEFAULT_TTL_MS);

    const doc = await Status.create({
      userId: req.user.id,
      text: String(text).slice(0, STATUS_TEXT_MAX),
      imageUrl: String(finalImageUrl).slice(0, 2000),
      expiresAt,
    });

    await doc.populate("userId", "name profilePic");
    await notifyStatusPeers(req.user.id, String(doc._id), "posted");
    res.status(201).json(serializeStatus(doc.toObject(), req.user.id));
};

/** Who can see your statuses (people you already share a chat with). */
const getStatusAudience = async (req, res) => {
    const peerIds = await getChatPeerIds(req.user.id);
    res.json({ peerCount: peerIds.length });
};

/** Statuses from users you share at least one conversation with (not including yourself). */
const listStatusFeed = async (req, res) => {
    const uid = String(req.user.id);
    const ids = await getChatPeerIds(uid);

    if (!ids.length) {
      return res.json([]);
    }

    const now = new Date();

    const items = await Status.find({
      userId: { $in: ids },
      expiresAt: { $gt: now },
    })
      .sort({ createdAt: -1 })
      .limit(120)
      .populate("userId", "name profilePic")
      .populate("replies.userId", "name profilePic")
      .lean();

    res.json(items.map((item) => serializeStatus(item, uid)));
};

const listMyStatus = async (req, res) => {
    const uid = String(req.user.id);
    const now = new Date();

    const items = await Status.find({
      userId: uid,
      expiresAt: { $gt: now },
    })
      .sort({ createdAt: -1 })
      .populate("userId", "name profilePic")
      .populate("replies.userId", "name profilePic")
      .lean();

    res.json(items.map((item) => serializeStatus(item, uid)));
};

const deleteStatus = async (req, res) => {
    const status = await Status.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!status) {
      throw ApiError.notFound("Not found");
    }

    const statusId = String(status._id);
    const ownerId = String(req.user.id);
    await status.deleteOne();
    await notifyStatusPeers(ownerId, statusId, "deleted");

    res.json({
      ok: true,
    });
};

const viewStatus = async (req, res) => {
    const uid = req.user.id;
    const status = await getAccessibleStatus(req.params.id, uid);
    const exists = (status.viewers || []).some(
      (v) => String(v.userId) === String(uid),
    );
    const ownerId = String(status.userId?._id || status.userId || "");
    if (!exists) {
      status.viewers.push({ userId: uid, viewedAt: new Date() });
      await status.save();
      if (ownerId && ownerId !== String(uid)) {
        publishStatusUpdated({
          ownerId,
          statusId: String(status._id),
          kind: "viewed",
          peerIds: [],
        });
      }
    }
    const payload = { ok: true };
    if (ownerId === String(uid)) {
      payload.viewerCount = status.viewers.length;
    }
    return res.json(payload);
};

const reactStatus = async (req, res) => {
    const emoji = String(req.body?.emoji || "")
      .trim()
      .slice(0, 16);
    if (!emoji) throw ApiError.badRequest("emoji required");

    const uid = req.user.id;
    const status = await getAccessibleStatus(req.params.id, uid);
    const ownerId = String(status.userId?._id || status.userId || "");
    if (ownerId === String(uid)) {
      throw ApiError.badRequest("Cannot react to your own status");
    }
    if (!Array.isArray(status.reactions)) status.reactions = [];
    status.reactions = status.reactions.filter(
      (r) => String(r.userId) !== String(uid),
    );
    status.reactions.push({ emoji, userId: uid });
    await status.save();
    if (ownerId) {
      publishStatusUpdated({
        ownerId,
        statusId: String(status._id),
        kind: "reacted",
        peerIds: [],
      });
    }
    return res.json({
      ok: true,
      reactionCount: status.reactions.length,
      myReactionEmoji: emoji,
    });
};

const replyStatus = async (req, res) => {
    const text = String(req.body?.text || "").trim().slice(0, 500);
    if (!text) throw ApiError.badRequest("text required");

    const uid = req.user.id;
    const status = await getAccessibleStatus(req.params.id, uid);
    const ownerId = String(status.userId?._id || status.userId || "");
    if (ownerId === String(uid)) {
      throw ApiError.badRequest("Cannot reply to your own status");
    }
    if (!Array.isArray(status.replies)) status.replies = [];

    const replyDoc = { userId: uid, text, createdAt: new Date() };
    status.replies.push(replyDoc);
    await status.save();
    if (ownerId) {
      publishStatusUpdated({
        ownerId,
        statusId: String(status._id),
        kind: "replied",
        peerIds: [uid],
      });
    }

    await status.populate("replies.userId", "name profilePic");
    const latest = status.replies[status.replies.length - 1];

    return res.status(201).json({
      ok: true,
      replyCount: status.replies.length,
      reply: serializeReply(
        latest?.toObject ? latest.toObject() : latest,
      ),
    });
};

const listStatusViewers = async (req, res) => {
    const status = await Status.findOne({
      _id: req.params.id,
      userId: req.user.id,
    })
      .populate("viewers.userId", "name profilePic")
      .lean();
    if (!status) throw ApiError.notFound("Not found");
    return res.json(status.viewers || []);
};

const { wrapHttpHandlers } = require("../../services/async-handler.js");

module.exports = wrapHttpHandlers({
  postStatus,
  getStatusAudience,
  listStatusFeed,
  listMyStatus,
  deleteStatus,
  viewStatus,
  reactStatus,
  replyStatus,
  listStatusViewers,
});
