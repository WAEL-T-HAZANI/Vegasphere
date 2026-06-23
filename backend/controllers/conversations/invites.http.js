const { ApiError } = require("../../services/http-error.js");
const crypto = require("crypto");
const Conversation = require("../../models/Conversation.js");
const {
  isConversationAdmin,
  isUserBannedFromConversation,
} = require("../../services/conversation-permissions.js");
const {
  pruneExpiredBans,
  findActiveInvite,
  appendModerationLog,
  populateConversation,
} = require("./helpers.js");

const getJoinPreview = async (req, res) => {
    const token = String(req.params.token || "").trim();
    if (!token) {
      throw ApiError.badRequest("Invalid link");
    }
    const conv = await Conversation.findOne({
      "inviteLinks.token": token,
    }).select(
      "name isGroup isChannel visibility description members channelSlug inviteLinks",
    );
    if (!conv) {
      throw ApiError.notFound("Invalid or expired invite");
    }
    if (!findActiveInvite(conv, token)) {
      throw ApiError.notFound("Invalid or expired invite");
    }
    return res.json({
      name: conv.name,
      isChannel: Boolean(conv.isChannel),
      isGroup: Boolean(conv.isGroup),
      visibility: conv.visibility || "public",
      description: conv.description || "",
      channelSlug: conv.channelSlug || "",
      memberCount: (conv.members || []).length,
    });
  
};

const joinWithInviteToken = async (req, res) => {
    const token = String(req.params.token || "").trim();
    if (!token) {
      throw ApiError.badRequest("Invalid link");
    }
    const uid = req.user.id;
    const conv = await Conversation.findOne({
      "inviteLinks.token": token,
    });
    if (!conv || (!conv.isGroup && !conv.isChannel)) {
      throw ApiError.notFound("Invalid invite");
    }
    if (pruneExpiredBans(conv)) {
      // Best-effort cleanup; do not block join flow if save fails.
      await conv.save().catch(() => {});
    }
    const link = findActiveInvite(conv, token);
    if (!link) {
      throw ApiError.notFound("Invalid or expired invite");
    }
    if (isUserBannedFromConversation(conv, uid)) {
      throw ApiError.forbidden("You are banned from this chat");
    }
    const uidStr = String(uid);
    if (conv.members.some((m) => m.toString() === uidStr)) {
      await populateConversation(conv);
      return res.json(conv);
    }
    conv.bannedUsers = (conv.bannedUsers || []).filter(
      (b) => String(b.userId?._id || b.userId) !== uidStr,
    );
    conv.members.push(uid);
    conv.unreadCounts.push({ userId: uid, count: 0 });
    link.usesCount = (Number(link.usesCount) || 0) + 1;
    link.lastUsedAt = new Date();
    link.lastUsedBy = uid;
    conv.markModified("inviteLinks");
    appendModerationLog(conv, {
      action: "invite_used",
      actorId: uid,
      token,
      meta: { usesCount: link.usesCount },
    });
    await conv.save();
    await populateConversation(conv);
    return res.json(conv);
  
};

const createInviteLink = async (req, res) => {
    const conv = await Conversation.findById(req.params.id);
    if (!conv || (!conv.isGroup && !conv.isChannel)) {
      throw ApiError.badRequest("Only for groups and channels");
    }
    if (!isConversationAdmin(conv, String(req.user.id))) {
      throw ApiError.forbidden("Admin only");
    }
    const token = crypto.randomBytes(24).toString("hex");
    const { label = "", maxUses = null, expiresAt = null } = req.body || {};
    const mu =
      maxUses != null && maxUses !== ""
        ? Math.min(10000, Math.max(1, Number(maxUses)))
        : null;
    if (maxUses != null && maxUses !== "" && !Number.isFinite(mu)) {
      throw ApiError.badRequest("Invalid maxUses");
    }
    let exp = null;
    if (expiresAt) {
      const d = new Date(expiresAt);
      if (Number.isNaN(d.getTime())) {
        throw ApiError.badRequest("Invalid expiresAt");
      }
      if (d.getTime() <= Date.now()) {
        throw ApiError.badRequest("expiresAt must be in the future");
      }
      exp = d;
    }
    conv.inviteLinks = Array.isArray(conv.inviteLinks) ? conv.inviteLinks : [];
    conv.inviteLinks.push({
      token,
      label: String(label || "").slice(0, 80),
      createdBy: req.user.id,
      maxUses: Number.isFinite(mu) ? mu : null,
      expiresAt: exp,
      usesCount: 0,
    });
    appendModerationLog(conv, {
      action: "invite_created",
      actorId: req.user.id,
      token,
      meta: {
        label: String(label || "").slice(0, 80),
        maxUses: Number.isFinite(mu) ? mu : null,
        expiresAt: exp,
      },
    });
    await conv.save();
    return res.status(201).json({
      token,
      path: `/join/${token}`,
    });
  
};

const listInviteLinks = async (req, res) => {
    const conv = await Conversation.findById(req.params.id)
      .select("inviteLinks isGroup isChannel")
      .populate("inviteLinks.createdBy", "name email profilePic username")
      .populate("inviteLinks.revokedBy", "name email profilePic username")
      .populate("inviteLinks.lastUsedBy", "name email profilePic username");
    if (!conv || (!conv.isGroup && !conv.isChannel)) {
      throw ApiError.badRequest("Only for groups and channels");
    }
    if (!isConversationAdmin(conv, String(req.user.id))) {
      throw ApiError.forbidden("Admin only");
    }
    const rows = (conv.inviteLinks || []).map((l) => ({
      token: l.token,
      label: l.label || "",
      createdAt: l.createdAt,
      createdBy: l.createdBy || null,
      revokedAt: l.revokedAt || null,
      revokedBy: l.revokedBy || null,
      maxUses: l.maxUses,
      usesCount: l.usesCount || 0,
      lastUsedAt: l.lastUsedAt || null,
      lastUsedBy: l.lastUsedBy || null,
      expiresAt: l.expiresAt || null,
      path: l.revokedAt ? null : `/join/${l.token}`,
    }));
    return res.json(rows);
  
};

const updateInviteLink = async (req, res) => {
    const conv = await Conversation.findById(req.params.id);
    if (!conv || (!conv.isGroup && !conv.isChannel)) {
      throw ApiError.badRequest("Only for groups and channels");
    }
    if (!isConversationAdmin(conv, String(req.user.id))) {
      throw ApiError.forbidden("Admin only");
    }

    const tok = String(req.params.token || "").trim();
    const link = (conv.inviteLinks || []).find((l) => String(l.token) === tok);
    if (!link) {
      throw ApiError.notFound("Invite not found");
    }
    if (link.revokedAt) {
      throw ApiError.badRequest("Invite is revoked");
    }

    const body = req.body || {};
    if (body.label !== undefined) {
      link.label = String(body.label || "").slice(0, 80);
    }

    if (body.maxUses !== undefined) {
      if (body.maxUses == null || body.maxUses === "") {
        link.maxUses = null;
      } else {
        const mu = Math.min(10000, Math.max(1, Number(body.maxUses)));
        if (!Number.isFinite(mu)) {
          throw ApiError.badRequest("Invalid maxUses");
        }
        link.maxUses = mu;
      }
    }

    if (body.expiresAt !== undefined) {
      if (!body.expiresAt) {
        link.expiresAt = null;
      } else {
        const d = new Date(body.expiresAt);
        if (Number.isNaN(d.getTime())) {
          throw ApiError.badRequest("Invalid expiresAt");
        }
        if (d.getTime() <= Date.now()) {
          throw ApiError.badRequest("expiresAt must be in the future");
        }
        link.expiresAt = d;
      }
    }

    conv.markModified("inviteLinks");
    appendModerationLog(conv, {
      action: "invite_updated",
      actorId: req.user.id,
      token: tok,
      meta: {
        label: link.label || "",
        maxUses: link.maxUses ?? null,
        expiresAt: link.expiresAt || null,
      },
    });
    await conv.save();
    return res.json({ ok: true });
  
};

const revokeInviteLink = async (req, res) => {
    const conv = await Conversation.findById(req.params.id);
    if (!conv || (!conv.isGroup && !conv.isChannel)) {
      throw ApiError.badRequest("Only for groups and channels");
    }
    if (!isConversationAdmin(conv, String(req.user.id))) {
      throw ApiError.forbidden("Admin only");
    }
    const tok = String(req.params.token || "").trim();
    const link = (conv.inviteLinks || []).find((l) => String(l.token) === tok);
    if (!link) {
      throw ApiError.notFound("Invite not found");
    }
    link.revokedAt = new Date();
    link.revokedBy = req.user.id;
    conv.markModified("inviteLinks");
    appendModerationLog(conv, {
      action: "invite_revoked",
      actorId: req.user.id,
      token: tok,
      meta: { label: link.label || "" },
    });
    await conv.save();
    return res.json({ ok: true });
  
};

module.exports = {
  getJoinPreview,
  joinWithInviteToken,
  createInviteLink,
  listInviteLinks,
  updateInviteLink,
  revokeInviteLink,
};
