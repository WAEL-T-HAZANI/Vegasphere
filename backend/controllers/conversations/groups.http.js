const { ApiError } = require("../../services/http-error.js");
const Conversation = require("../../models/Conversation.js");
const User = require("../../models/User.js");
const {
  isConversationAdmin,
  isConversationMember,
  isUserBannedFromConversation,
  assertCanAddMembers,
} = require("../../services/conversation-permissions.js");
const {
  defaultTopics,
  resolveSelectableMemberIds,
  populateConversation,
  ensureAdminSuccession,
} = require("./helpers.js");
const { assertGroupAddsAllowed } = require("../users/helpers.js");

/** Named group chat (WhatsApp-style). */
const createGroup = async (req, res) => {
    const { name, description = "", memberIds = [] } = req.body;
    if (!name) {
      throw ApiError.badRequest("Name is required");
    }
    const resolvedMemberIds = await resolveSelectableMemberIds(
      memberIds,
      req.user.id,
    );

    await assertGroupAddsAllowed(req.user.id, resolvedMemberIds);

    const allMembers = [
      ...new Set([...resolvedMemberIds.map(String), String(req.user.id)]),
    ];
    const newConversation = await Conversation.create({
      members: allMembers,
      isGroup: true,
      name,
      description: String(description || "")
        .trim()
        .slice(0, 180),
      admins: [req.user.id],
      topics: defaultTopics(),
      unreadCounts: allMembers.map((memberId) => ({
        userId: memberId,
        count: 0,
      })),
    });
    await populateConversation(newConversation);
    return res.status(200).json(newConversation);
};

/** Broadcast channel (joinable). */
const createChannel = async (req, res) => {
    const {
      name,
      description = "",
      channelSlug = "",
      visibility = "public",
      memberIds = [],
    } = req.body;
    if (!name) {
      throw ApiError.badRequest("Name is required");
    }
    const resolvedVisibility =
      String(visibility) === "private" ? "private" : "public";
    const slug =
      channelSlug ||
      name
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");
    if (!slug) {
      throw ApiError.badRequest("channelSlug required");
    }
    const existing = await Conversation.exists({
      isChannel: true,
      channelSlug: slug,
    });
    if (existing) {
      throw ApiError.conflict("Channel slug already exists");
    }
    const resolvedMemberIds = await resolveSelectableMemberIds(
      memberIds,
      req.user.id,
    );

    await assertGroupAddsAllowed(req.user.id, resolvedMemberIds);

    const allMembers = [
      ...new Set([...resolvedMemberIds.map(String), String(req.user.id)]),
    ];
    const newConversation = await Conversation.create({
      members: allMembers,
      isGroup: true,
      isChannel: true,
      name,
      description: String(description || "")
        .trim()
        .slice(0, 180),
      channelSlug: slug,
      visibility: resolvedVisibility,
      channelPostingMode: "admins_only",
      admins: [req.user.id],
      topics: defaultTopics(),
      unreadCounts: allMembers.map((memberId) => ({
        userId: memberId,
        count: 0,
      })),
    });
    await populateConversation(newConversation);
    return res.status(200).json(newConversation);
};

const listChannels = async (req, res) => {
    const channels = await Conversation.find({
      isChannel: true,
      visibility: "public",
      members: { $nin: [req.user.id] },
    })
      .select(
        "name description avatar channelSlug members admins updatedAt visibility channelPostingMode",
      )
      .sort({ updatedAt: -1 })
      .limit(100);
    res.json(
      channels.map((channel) => ({
        ...(typeof channel.toObject === "function"
          ? channel.toObject()
          : channel),
        isMember: false,
        isAdmin: false,
      })),
    );
};

const joinChannel = async (req, res) => {
    const conv = await Conversation.findById(req.params.id);
    if (!conv || !conv.isChannel) {
      throw ApiError.notFound("Channel not found");
    }
    const uid = req.user.id;
    if (isUserBannedFromConversation(conv, uid)) {
      throw ApiError.forbidden("You are banned from this channel");
    }
    if (String(conv.visibility || "public") === "private") {
      throw ApiError.forbidden("Private channels are invite only");
    }
    if (!conv.members.some((m) => m.toString() === uid.toString())) {
      conv.members.push(uid);
      conv.unreadCounts.push({ userId: uid, count: 0 });
      await conv.save();
    }
    await populateConversation(conv);
    res.json(conv);
};

const leaveGroup = async (req, res) => {
    const conv = await Conversation.findById(req.params.id);
    if (!conv || (!conv.isGroup && !conv.isChannel)) {
      throw ApiError.badRequest("Not a group or channel");
    }
    const uid = String(req.user.id);
    if (!conv.members.some((m) => m.toString() === uid)) {
      throw ApiError.badRequest("Not a member");
    }
    const isLeavingAdmin = conv.admins.some((a) => a.toString() === uid);
    const otherMembers = conv.members.filter((m) => m.toString() !== uid);
    if (
      conv.isChannel &&
      isLeavingAdmin &&
      conv.admins.length <= 1 &&
      otherMembers.length > 0
    ) {
      throw ApiError.badRequest("Assign another channel admin before leaving");
    }
    conv.members = conv.members.filter((m) => m.toString() !== uid);
    conv.unreadCounts = conv.unreadCounts.filter(
      (u) => u.userId.toString() !== uid,
    );
    conv.admins = conv.admins.filter((a) => a.toString() !== uid);
    if (conv.members.length === 0) {
      await conv.deleteOne();
      return res.json({ left: true, deleted: true });
    }
    if (!conv.admins.length) {
      ensureAdminSuccession(conv);
    }
    await conv.save();
    await populateConversation(conv);
    res.json(conv);
  
};

const addGroupMembers = async (req, res) => {
    const { memberIds = [] } = req.body || {};
    const conv = await Conversation.findById(req.params.id);
    if (!conv || (!conv.isGroup && !conv.isChannel)) {
      throw ApiError.badRequest("Only for groups and channels");
    }
    const uid = String(req.user.id);
    if (!isConversationAdmin(conv, uid)) {
      const addChk = assertCanAddMembers(conv, uid);
      if (!addChk.ok) {
        throw ApiError.forbidden(addChk.error);
      }
    }
    const resolvedMemberIds = await resolveSelectableMemberIds(
      memberIds,
      req.user.id,
    );

    await assertGroupAddsAllowed(req.user.id, resolvedMemberIds);

    const set = new Set(conv.members.map((m) => m.toString()));
    for (const mid of resolvedMemberIds) {
      const s = String(mid);
      if (!set.has(s)) {
        conv.bannedUsers = (conv.bannedUsers || []).filter(
          (b) => String(b.userId?._id || b.userId) !== s,
        );
        conv.members.push(mid);
        conv.unreadCounts.push({ userId: mid, count: 0 });
        set.add(s);
      }
    }
    await conv.save();
    await populateConversation(conv);
    res.json(conv);
};

const removeGroupMember = async (req, res) => {
    const conv = await Conversation.findById(req.params.id);
    if (!conv || (!conv.isGroup && !conv.isChannel)) {
      throw ApiError.badRequest("Only for groups and channels");
    }
    const uid = String(req.user.id);
    const targetId = String(req.params.userId);
    const isAdmin = isConversationAdmin(conv, uid);
    if (targetId !== uid && !isAdmin) {
      throw ApiError.forbidden();
    }
    if (!conv.members.some((m) => m.toString() === targetId)) {
      throw ApiError.notFound("Member not in group");
    }
    conv.members = conv.members.filter((m) => m.toString() !== targetId);
    conv.unreadCounts = conv.unreadCounts.filter(
      (u) => u.userId.toString() !== targetId,
    );
    conv.admins = conv.admins.filter((a) => a.toString() !== targetId);
    if (conv.members.length === 0) {
      await conv.deleteOne();
      return res.json({ removed: true, deleted: true });
    }
    if (!conv.admins.length) {
      ensureAdminSuccession(conv);
    }
    await conv.save();
    await populateConversation(conv);
    res.json(conv);
  
};

const promoteGroupAdmin = async (req, res) => {
    const { userId: targetId } = req.body || {};
    if (!targetId) {
      throw ApiError.badRequest("userId required");
    }
    const conv = await Conversation.findById(req.params.id);
    if (!conv || !conv.isGroup) {
      throw ApiError.badRequest("Only for groups and channels");
    }
    const uid = String(req.user.id);
    if (!isConversationAdmin(conv, uid)) {
      throw ApiError.forbidden("Admin only");
    }
    if (!conv.members.some((m) => m.toString() === String(targetId))) {
      throw ApiError.badRequest("User not in group");
    }
    if (!conv.admins.some((a) => a.toString() === String(targetId))) {
      conv.admins.push(targetId);
    }
    await conv.save();
    await populateConversation(conv);
    res.json(conv);
  
};

const demoteGroupAdmin = async (req, res) => {
    const targetId = String(req.params.userId);
    const conv = await Conversation.findById(req.params.id);
    if (!conv || !conv.isGroup) {
      throw ApiError.badRequest("Only for groups and channels");
    }
    const uid = String(req.user.id);
    if (!isConversationAdmin(conv, uid)) {
      throw ApiError.forbidden("Admin only");
    }
    if (!conv.admins.some((a) => a.toString() === targetId)) {
      throw ApiError.badRequest("User is not an admin");
    }
    if (conv.admins.length <= 1) {
      throw ApiError.badRequest("Cannot demote the only admin");
    }
    conv.admins = conv.admins.filter((a) => a.toString() !== targetId);
    await conv.save();
    await populateConversation(conv);
    res.json(conv);
  
};

module.exports = {
  createGroup,
  createChannel,
  listChannels,
  joinChannel,
  leaveGroup,
  addGroupMembers,
  removeGroupMember,
  promoteGroupAdmin,
  demoteGroupAdmin,
};
