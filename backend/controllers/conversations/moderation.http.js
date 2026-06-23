const { ApiError } = require("../../services/http-error.js");
const Conversation = require("../../models/Conversation.js");
const {
  isConversationAdmin,
  getEffectiveMemberRights,
  assertCanEditInfo,
} = require("../../services/conversation-permissions.js");
const { appendModerationLog, populateConversation, ensureAdminSuccession } = require("./helpers.js");

const getModerationLog = async (req, res) => {
    const conv = await Conversation.findById(req.params.id)
      .select("moderationLog isGroup isChannel")
      .populate("moderationLog.actorId", "name email profilePic username")
      .populate("moderationLog.targetUserId", "name email profilePic username");
    if (!conv || (!conv.isGroup && !conv.isChannel)) {
      throw ApiError.badRequest("Only for groups and channels");
    }
    if (!isConversationAdmin(conv, String(req.user.id))) {
      throw ApiError.forbidden("Admin only");
    }
    return res.json(conv.moderationLog || []);
  
};

const banMember = async (req, res) => {
    const { userId: targetId, reason = "", expiresAt = null } = req.body || {};
    const tid = String(targetId || "").trim();
    if (!tid) {
      throw ApiError.badRequest("userId required");
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
    const conv = await Conversation.findById(req.params.id);
    if (!conv || (!conv.isGroup && !conv.isChannel)) {
      throw ApiError.badRequest("Only for groups and channels");
    }
    const uid = String(req.user.id);
    if (!isConversationAdmin(conv, uid)) {
      throw ApiError.forbidden("Admin only");
    }
    if (tid === uid) {
      throw ApiError.badRequest("Cannot ban yourself");
    }
    if (!conv.members.some((m) => m.toString() === tid)) {
      throw ApiError.notFound("Member not in chat");
    }
    conv.members = conv.members.filter((m) => m.toString() !== tid);
    conv.unreadCounts = conv.unreadCounts.filter(
      (u) => u.userId.toString() !== tid,
    );
    conv.admins = conv.admins.filter((a) => a.toString() !== tid);
    conv.bannedUsers = Array.isArray(conv.bannedUsers) ? conv.bannedUsers : [];
    conv.bannedUsers.push({
      userId: tid,
      bannedBy: uid,
      reason: String(reason || "").slice(0, 200),
      expiresAt: exp,
    });
    appendModerationLog(conv, {
      action: "member_banned",
      actorId: uid,
      targetUserId: tid,
      reason,
      meta: { expiresAt: exp },
    });
    if (conv.members.length === 0) {
      await conv.deleteOne();
      return res.json({ banned: true, deleted: true });
    }
    if (!conv.admins.length) {
      ensureAdminSuccession(conv);
    }
    await conv.save();
    await populateConversation(conv);
    await conv.populate("bannedUsers.userId", "name email profilePic username");
    const bannedObj = conv.toObject?.() || conv;
    return res.json({
      ...bannedObj,
      effectiveMemberRights: getEffectiveMemberRights(conv, req.user.id),
    });
  
};

const unbanMember = async (req, res) => {
    const tid = String(req.params.userId || "").trim();
    const conv = await Conversation.findById(req.params.id);
    if (!conv || (!conv.isGroup && !conv.isChannel)) {
      throw ApiError.badRequest("Only for groups and channels");
    }
    if (!isConversationAdmin(conv, String(req.user.id))) {
      throw ApiError.forbidden("Admin only");
    }
    const before = (conv.bannedUsers || []).length;
    conv.bannedUsers = (conv.bannedUsers || []).filter(
      (b) => String(b.userId?._id || b.userId) !== tid,
    );
    if (conv.bannedUsers.length === before) {
      throw ApiError.notFound("Ban not found");
    }
    appendModerationLog(conv, {
      action: "member_unbanned",
      actorId: req.user.id,
      targetUserId: tid,
    });
    await conv.save();
    await populateConversation(conv);
    await conv.populate("bannedUsers.userId", "name email profilePic username");
    const unbanObj = conv.toObject?.() || conv;
    return res.json({
      ...unbanObj,
      effectiveMemberRights: getEffectiveMemberRights(conv, req.user.id),
    });
  
};

const patchConversationSettings = async (req, res) => {
    const conv = await Conversation.findById(req.params.id);
    if (!conv || !conv.isGroup) {
      throw ApiError.badRequest("Only for groups and channels");
    }
    const uid = String(req.user.id);
    const admin = isConversationAdmin(conv, uid);
    const body = req.body || {};

    if (body.name != null || body.description != null) {
      if (!admin) {
        const info = assertCanEditInfo(conv, uid);
        if (!info.ok) throw ApiError.forbidden(info.error);
      }
      if (body.name != null) {
        conv.name = String(body.name || "")
          .trim()
          .slice(0, 80);
        if (!conv.name) {
          throw ApiError.badRequest("Name required");
        }
      }
      if (body.description != null) {
        conv.description = String(body.description || "")
          .trim()
          .slice(0, 180);
      }
    }

    if (body.channelPostingMode != null || body.defaultMemberRights != null) {
      if (!admin) {
        throw ApiError.forbidden("Admin only");
      }
      if (conv.isChannel && body.channelPostingMode != null) {
        const m = String(body.channelPostingMode);
        if (m === "all" || m === "admins_only") {
          conv.channelPostingMode = m;
        }
      }
      if (body.defaultMemberRights != null) {
        const d = body.defaultMemberRights;
        conv.defaultMemberRights = conv.defaultMemberRights || {};
        if (d.canPostMessages !== undefined) {
          conv.defaultMemberRights.canPostMessages = Boolean(d.canPostMessages);
        }
        if (d.canAddMembers !== undefined) {
          conv.defaultMemberRights.canAddMembers = Boolean(d.canAddMembers);
        }
        if (d.canPinMessages !== undefined) {
          conv.defaultMemberRights.canPinMessages = Boolean(d.canPinMessages);
        }
        if (d.canEditInfo !== undefined) {
          conv.defaultMemberRights.canEditInfo = Boolean(d.canEditInfo);
        }
      }
    }

    await conv.save();
    await populateConversation(conv);
    await conv.populate("bannedUsers.userId", "name email profilePic username");
    const rights = getEffectiveMemberRights(conv, req.user.id);
    const settingsObj = conv.toObject?.() || conv;
    if (!isConversationAdmin(conv, uid)) {
      delete settingsObj.bannedUsers;
    }
    return res.json({
      ...settingsObj,
      effectiveMemberRights: rights,
    });
  
};

const patchMemberPermissions = async (req, res) => {
    const conv = await Conversation.findById(req.params.id);
    if (!conv || !conv.isGroup) {
      throw ApiError.badRequest("Only for groups and channels");
    }
    if (!isConversationAdmin(conv, String(req.user.id))) {
      throw ApiError.forbidden("Admin only");
    }
    const targetId = String(req.params.userId || "").trim();
    if (!targetId || !conv.members.some((m) => m.toString() === targetId)) {
      throw ApiError.notFound("Member not found");
    }
    if (isConversationAdmin(conv, targetId)) {
      throw ApiError.badRequest("Use admin role for admins");
    }
    const body = req.body || {};
    conv.memberPermissionOverrides = Array.isArray(
      conv.memberPermissionOverrides,
    )
      ? conv.memberPermissionOverrides
      : [];
    let idx = conv.memberPermissionOverrides.findIndex(
      (o) => String(o.userId?._id || o.userId) === targetId,
    );
    if (idx < 0) {
      conv.memberPermissionOverrides.push({ userId: targetId });
      idx = conv.memberPermissionOverrides.length - 1;
    }
    const row = conv.memberPermissionOverrides[idx];
    const keys = [
      "canPostMessages",
      "canAddMembers",
      "canPinMessages",
      "canEditInfo",
    ];
    let any = false;
    for (const k of keys) {
      if (body[k] !== undefined) {
        row[k] = Boolean(body[k]);
        any = true;
      }
    }
    if (!any) {
      conv.memberPermissionOverrides.splice(idx, 1);
    }
    await conv.save();
    await populateConversation(conv);
    await conv.populate("bannedUsers.userId", "name email profilePic username");
    const out = conv.toObject?.() || conv;
    return res.json({
      ...out,
      effectiveMemberRights: getEffectiveMemberRights(conv, req.user.id),
    });
  
};

module.exports = {
  getModerationLog,
  banMember,
  unbanMember,
  patchConversationSettings,
  patchMemberPermissions,
};
