const { ApiError } = require("../../services/http-error.js");
const mongoose = require("mongoose");
const CallLog = require("../../models/CallLog.js");
const CallInvite = require("../../models/CallInvite.js");
const Conversation = require("../../models/Conversation.js");
const User = require("../../models/User.js");
const { notifyUserPush } = require("../../services/push-notify.js");
const { publishCallsUpdated } = require("../../services/call-notify.js");
const {
  createCallInviteNotifications,
  resolveCallInviteNotifications,
} = require("../../services/notification-service.js");
const { canViewerSeeUserField } = require("../users/helpers.js");

const STALE_RINGING_MS = 90 * 1000;

function toObjectId(value) {
  if (!value || !mongoose.Types.ObjectId.isValid(String(value))) return null;
  return new mongoose.Types.ObjectId(String(value));
}

function computeStatusFromDoc(doc) {
  if (!doc) return "missed";
  if (doc.status === "declined") return "declined";
  if (doc.status === "cancelled") return "cancelled";
  if (doc.answeredAt) return "completed";
  return "missed";
}

function isStaleRingingDoc(doc) {
  if (!doc || doc.status !== "ringing" || doc.answeredAt) return false;
  const last = doc.lastSignalAt || doc.updatedAt || doc.createdAt;
  if (!last) return false;
  return Date.now() - new Date(last).getTime() > STALE_RINGING_MS;
}

function presentationStatus(doc) {
  if (isStaleRingingDoc(doc)) return "missed";
  return doc?.status || "missed";
}

/** Whether `initiatorId` may ring `targetId` (1:1 calls only). */
async function canInitiateCallToUser(initiatorId, targetId, options = {}) {
  const from = String(initiatorId || "");
  const to = String(targetId || "");
  if (!from || !to || from === to) return false;
  if (options.groupCall) return true;

  const [initiator, target] = await Promise.all([
    User.findById(from).select("blockedUsers"),
    User.findById(to).select("callPrivacy blockedUsers"),
  ]);
  if (!target) return false;

  if ((target.blockedUsers || []).some((id) => String(id) === from)) {
    return false;
  }
  if ((initiator?.blockedUsers || []).some((id) => String(id) === to)) {
    return false;
  }

  return canViewerSeeUserField(from, target, "calls");
}

function normalizeSchedule(raw) {
  if (!raw) return null;
  const date = raw instanceof Date ? raw : new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

async function notifyIncomingCallPush({
  targetId,
  conversationId,
  mode,
  groupCall,
}) {
  if (!targetId) return;
  const cid = conversationId ? String(conversationId) : "";
  await notifyUserPush(String(targetId), {
    title: "Vegasphere",
    body: groupCall
      ? mode === "video"
        ? "Incoming group video call"
        : "Incoming group voice call"
      : mode === "video"
        ? "Incoming video call"
        : "Incoming voice call",
    tag: cid ? `call-${cid}` : `call-${targetId}`,
    category: "direct",
    data: {
      conversationId: cid,
      url: cid ? `/chat/${cid}?incomingCall=1` : "/calls",
    },
  }).catch(() => {});
}

async function noteCallSignal(payload) {
  const sessionId = String(payload?.callSessionId || "").trim();
  if (!sessionId) return;

  const initiatorId = toObjectId(payload.from);
  const targetId = toObjectId(payload.to);
  const conversationId = toObjectId(payload.conversationId);
  if (!initiatorId || !targetId) return;

  if (
    !(await canInitiateCallToUser(initiatorId, targetId, {
      groupCall: Boolean(payload.groupCall),
    }))
  ) {
    return;
  }

  const now = new Date();
  const participantIds = [
    ...new Set([initiatorId.toString(), targetId.toString()]),
  ].map((id) => new mongoose.Types.ObjectId(id));

  const baseSet = {
    lastSignalAt: now,
  };

  const setOnInsert = {
    sessionId,
    conversationId,
    initiatorId,
    participantIds,
    mode: payload.callType === "video" ? "video" : "audio",
    groupCall: Boolean(payload.groupCall),
    status: "ringing",
  };

  let doc = await CallLog.findOne({ sessionId });
  if (!doc) {
    try {
      doc = await CallLog.create(setOnInsert);
    } catch (error) {
      if (error?.code === 11000) {
        doc = await CallLog.findOne({ sessionId });
      } else {
        throw error;
      }
    }
  }

  if (!doc) return;

  const update = {
    $set: baseSet,
    $addToSet: {
      participantIds: { $each: participantIds },
    },
  };

  if (payload.type === "answer") {
    update.$set.status = "active";
    update.$set.answeredAt = now;
    update.$addToSet = {
      ...(update.$addToSet || {}),
      answeredByIds: targetId,
    };
  }

  if (payload.type === "call-decline") {
    update.$set.status = "declined";
    update.$set.endedAt = now;
    update.$set.endedById = targetId;
  }

  if (payload.type === "call-hangup") {
    update.$set.endedAt = now;
    update.$set.endedById = initiatorId;
  }

  doc = await CallLog.findOneAndUpdate({ sessionId }, update, {
    new: true,
  });

  if (!doc) return;

  if (payload.type === "call-hangup") {
    let nextStatus = computeStatusFromDoc(doc);
    if (!doc.answeredAt && String(doc.initiatorId) === String(initiatorId)) {
      nextStatus = "cancelled";
    }
    const answeredAtMs = doc.answeredAt
      ? new Date(doc.answeredAt).getTime()
      : 0;
    const endedAtMs = now.getTime();
    await CallLog.updateOne(
      { _id: doc._id },
      {
        $set: {
          status: nextStatus,
          durationSec:
            answeredAtMs && endedAtMs > answeredAtMs
              ? Math.max(0, Math.round((endedAtMs - answeredAtMs) / 1000))
              : 0,
        },
      },
    );
  }

  if (payload.type === "offer") {
    await notifyIncomingCallPush({
      targetId,
      conversationId,
      mode: setOnInsert.mode,
      groupCall: Boolean(payload.groupCall),
    });
  }

  publishCallsUpdated({
    kind: payload.type || "signal",
    sessionId,
    userId: String(initiatorId),
  });
}

async function expireStaleRingingCalls() {
  const cutoff = new Date(Date.now() - STALE_RINGING_MS);
  const result = await CallLog.updateMany(
    {
      status: "ringing",
      answeredAt: null,
      $or: [
        { lastSignalAt: { $lte: cutoff } },
        { lastSignalAt: null, updatedAt: { $lte: cutoff } },
      ],
    },
    { $set: { status: "missed", endedAt: new Date() } },
  );
  if (result.modifiedCount > 0) {
    publishCallsUpdated({ kind: "expire", userId: "" });
  }
  return result.modifiedCount;
}

async function sendDueCallInviteReminders() {
  const now = new Date();
  const cutoff = new Date(Date.now() + 15 * 60 * 1000);
  const invites = await CallInvite.find({
    isActive: true,
    scheduledFor: { $gt: now, $lte: cutoff },
    reminderSentAt: null,
  })
    .populate("conversationId", "name members")
    .populate("creatorId", "name")
    .limit(25);

  for (const invite of invites) {
    const conv = invite.conversationId;
    if (!conv?._id) continue;
    const members = Array.isArray(conv.members) ? conv.members.map(String) : [];
    const creatorId = String(invite.creatorId?._id || invite.creatorId || "");
    const targets = members.filter((id) => id && id !== creatorId);
    for (const uid of targets) {
      await notifyUserPush(uid, {
        title: "Vegasphere",
        body:
          invite.title ||
          `${invite.mode === "video" ? "Video" : "Voice"} call starts soon in ${conv.name || "your chat"}`,
        tag: `call-reminder-${invite.token}`,
        category: "group",
        data: {
          conversationId: String(conv._id),
          url: `/call/${invite.token}`,
        },
      }).catch(() => {});
    }
    invite.reminderSentAt = now;
    await invite.save();
  }
}

const listCallHistory = async (req, res) => {
    const uid = String(req.user.id);
    const docs = await CallLog.find({
      participantIds: { $in: [uid] },
    })
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(80)
      .populate("initiatorId", "name profilePic")
      .populate("participantIds", "name profilePic")
      .populate("conversationId", "name isGroup isChannel members")
      .lean();

    const items = docs.map((doc) => {
      const participants = (doc.participantIds || []).map((user) => ({
        _id: String(user?._id || ""),
        name: user?.name || "Unknown",
        profilePic: user?.profilePic || "",
      }));

      const others = participants.filter((user) => user._id !== uid);
      return {
        _id: String(doc._id),
        sessionId: doc.sessionId,
        conversationId: doc.conversationId
          ? {
              _id: String(doc.conversationId._id),
              name: doc.conversationId.name || "",
              isGroup: Boolean(doc.conversationId.isGroup),
              isChannel: Boolean(doc.conversationId.isChannel),
            }
          : null,
        initiatorId: doc.initiatorId
          ? {
              _id: String(doc.initiatorId._id),
              name: doc.initiatorId.name || "Unknown",
              profilePic: doc.initiatorId.profilePic || "",
            }
          : null,
        participants,
        peers: others,
        mode: doc.mode || "audio",
        groupCall: Boolean(doc.groupCall),
        status: presentationStatus(doc),
        answeredAt: doc.answeredAt || null,
        endedAt: doc.endedAt || null,
        durationSec: Number(doc.durationSec || 0),
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      };
    });

    res.json(items);
  
};

const listCallInvites = async (req, res) => {
    const uid = String(req.user.id);
    const convs = await Conversation.find({ members: uid })
      .select("_id")
      .lean();
    const convIds = convs.map((row) => row._id);

    const docs = await CallInvite.find({
      conversationId: { $in: convIds },
      isActive: true,
    })
      .sort({ scheduledFor: 1, updatedAt: -1 })
      .limit(80)
      .populate("conversationId", "name isGroup isChannel members")
      .populate("creatorId", "name profilePic")
      .lean();

    res.json(
      docs.map((doc) => ({
        _id: String(doc._id),
        token: doc.token,
        mode: doc.mode,
        title: doc.title || "",
        scheduledFor: doc.scheduledFor || null,
        isActive: Boolean(doc.isActive),
        conversationId: doc.conversationId
          ? {
              _id: String(doc.conversationId._id),
              name: doc.conversationId.name || "",
              isGroup: Boolean(doc.conversationId.isGroup),
              isChannel: Boolean(doc.conversationId.isChannel),
            }
          : null,
        creatorId: doc.creatorId
          ? {
              _id: String(doc.creatorId._id),
              name: doc.creatorId.name || "Unknown",
              profilePic: doc.creatorId.profilePic || "",
            }
          : null,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      })),
    );
  
};

const createCallInvite = async (req, res) => {
    const { conversationId, mode, title, scheduledFor } = req.body || {};
    if (!conversationId) {
      throw ApiError.badRequest("conversationId required");
    }
    const conv = await Conversation.findById(conversationId).select(
      "_id members name isGroup isChannel",
    );
    if (!conv || !conv.members.some((m) => String(m) === String(req.user.id))) {
      throw ApiError.forbidden();
    }

    const token = new mongoose.Types.ObjectId().toString();
    const schedule = normalizeSchedule(scheduledFor);
    const invite = await CallInvite.create({
      token,
      conversationId,
      creatorId: req.user.id,
      mode: mode === "video" ? "video" : "audio",
      title: String(title || "")
        .trim()
        .slice(0, 120),
      scheduledFor: schedule,
      isActive: true,
    });

    const hydrated = await CallInvite.findById(invite._id)
      .populate("conversationId", "name isGroup isChannel members")
      .populate("creatorId", "name profilePic")
      .lean();

    await createCallInviteNotifications({
      invite: hydrated,
      conversation: hydrated.conversationId,
    });

    publishCallsUpdated({
      kind: "invite_created",
      inviteId: String(hydrated._id),
      userId: String(req.user.id),
    });

    return res.status(201).json({
      _id: String(hydrated._id),
      token: hydrated.token,
      mode: hydrated.mode,
      title: hydrated.title || "",
      scheduledFor: hydrated.scheduledFor || null,
      isActive: Boolean(hydrated.isActive),
      conversationId: hydrated.conversationId
        ? {
            _id: String(hydrated.conversationId._id),
            name: hydrated.conversationId.name || "",
            isGroup: Boolean(hydrated.conversationId.isGroup),
            isChannel: Boolean(hydrated.conversationId.isChannel),
          }
        : null,
      creatorId: hydrated.creatorId
        ? {
            _id: String(hydrated.creatorId._id),
            name: hydrated.creatorId.name || "Unknown",
            profilePic: hydrated.creatorId.profilePic || "",
          }
        : null,
      createdAt: hydrated.createdAt,
      updatedAt: hydrated.updatedAt,
    });
  
};

const cancelCallInvite = async (req, res) => {
    const inviteId = String(req.params.inviteId || "").trim();
    if (!inviteId || !mongoose.Types.ObjectId.isValid(inviteId)) {
      throw ApiError.badRequest("inviteId required");
    }

    const invite = await CallInvite.findById(inviteId);
    if (!invite || !invite.isActive) {
      throw ApiError.notFound("Call invite not found");
    }

    if (String(invite.creatorId) !== String(req.user.id)) {
      throw ApiError.forbidden();
    }

    invite.isActive = false;
    await invite.save();
    await resolveCallInviteNotifications({
      callInviteId: inviteId,
      status: "cancelled",
    });

    publishCallsUpdated({
      kind: "invite_cancelled",
      inviteId,
      userId: String(req.user.id),
    });

    return res.json({ ok: true, inviteId });
  
};

function shapeCallInviteResponse(invite) {
  return {
    token: invite.token,
    mode: invite.mode,
    title: invite.title || "",
    scheduledFor: invite.scheduledFor || null,
    conversationId: invite.conversationId?._id
      ? {
          _id: String(invite.conversationId._id),
          name: invite.conversationId.name || "",
          isGroup: Boolean(invite.conversationId.isGroup),
          isChannel: Boolean(invite.conversationId.isChannel),
        }
      : null,
    creatorId: invite.creatorId
      ? {
          _id: String(invite.creatorId._id),
          name: invite.creatorId.name || "Unknown",
          profilePic: invite.creatorId.profilePic || "",
        }
      : null,
  };
}

/** Public preview for `/call/[token]` (no auth). */
const previewCallInvite = async (req, res) => {
  const token = String(req.params.token || "").trim();
  if (!token) {
    throw ApiError.badRequest("token required");
  }
  const invite = await CallInvite.findOne({ token, isActive: true })
    .populate("conversationId", "name isGroup isChannel")
    .populate("creatorId", "name profilePic")
    .lean();
  if (!invite?.conversationId?._id) {
    throw ApiError.notFound("Call invite not found");
  }
  return res.json({
    ...shapeCallInviteResponse(invite),
    requiresLogin: true,
  });
};

/** Authenticated resolve — member must belong to the conversation. */
const resolveCallInvite = async (req, res) => {
  const token = String(req.params.token || "").trim();
  if (!token) {
    throw ApiError.badRequest("token required");
  }
  const invite = await CallInvite.findOne({ token, isActive: true })
    .populate("conversationId", "name isGroup isChannel members")
    .populate("creatorId", "name profilePic")
    .lean();
  if (!invite?.conversationId?._id) {
    throw ApiError.notFound("Call invite not found");
  }
  if (
    !(invite.conversationId.members || []).some(
      (memberId) => String(memberId) === String(req.user.id),
    )
  ) {
    throw ApiError.forbidden();
  }

  return res.json(shapeCallInviteResponse(invite));
};

const { getIceServers, getIceServerMeta } = require("../../config/env.js");

const getIceServersHandler = (req, res) => {
  const iceServers = getIceServers();
  res.json({
    iceServers,
    meta: getIceServerMeta(iceServers),
  });
};

const { wrapHttpHandlers } = require("../../services/async-handler.js");

module.exports = wrapHttpHandlers(
  {
    listCallHistory,
    noteCallSignal,
    listCallInvites,
    createCallInvite,
    cancelCallInvite,
    previewCallInvite,
    resolveCallInvite,
    sendDueCallInviteReminders,
    expireStaleRingingCalls,
    getIceServersHandler,
  },
  ["noteCallSignal", "sendDueCallInviteReminders", "expireStaleRingingCalls"],
);

module.exports.canInitiateCallToUser = canInitiateCallToUser;
