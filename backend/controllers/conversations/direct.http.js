const { ApiError } = require("../../services/http-error.js");
const Conversation = require("../../models/Conversation.js");
const User = require("../../models/User.js");
const Message = require("../../models/Message.js");
const {
  mergeUnreadMirrorIntoConversations,
} = require("../../services/redis-unread-mirror.js");
const {
  isConversationAdmin,
  isConversationMember,
  getEffectiveMemberRights,
} = require("../../services/conversation-permissions.js");
const {
  pruneExpiredBans,
  ensureSelfConversation,
} = require("./helpers.js");

function emitConversationE2eSync(conv) {
  try {
    const io = require("../../socket/index.js").getIO();
    if (!io || !conv?._id) return;
    const payload = {
      conversationId: String(conv._id),
      e2eEnabled: Boolean(conv.e2eEnabled),
      e2eWrappedKeys: Array.isArray(conv.e2eWrappedKeys)
        ? conv.e2eWrappedKeys
        : [],
      e2eIssuerId: conv.e2eIssuerId,
      e2eIssuerPublicKey: conv.e2eIssuerPublicKey || "",
    };
    io.to(String(conv._id)).emit("conversation-e2e-sync", payload);
    for (const member of conv.members || []) {
      const uid = String(member?._id || member || "");
      if (uid) io.to(uid).emit("conversation-e2e-sync", payload);
    }
  } catch {
    /* non-fatal */
  }
}

const { isDestructiveMaintenanceAllowed } = require("../../config/env.js");

function isMaintenanceAllowed(req) {
  return isDestructiveMaintenanceAllowed(req.user);
}

/**
 * Permanent purge of the built-in AI chatbot 1:1 conversations (global).
 * Deletes the conversations and all messages inside them.
 *
 * NOTE: This affects all users because those conversations are shared with the bot user.
 */
const purgeAiChatbotConversations = async (req, res) => {
    if (!isMaintenanceAllowed(req)) {
      throw ApiError.forbidden("Maintenance endpoint disabled");
    }

    // Identify the bot user (created during register()).
    const bot =
      (await User.findOne({ email: /bot$/i }).select("_id email name")) ||
      (await User.findOne({ name: /ai chatbot/i }).select("_id email name"));

    if (!bot?._id) {
      return res.json({
        ok: true,
        removedConversations: 0,
        removedMessages: 0,
      });
    }

    // Only delete direct-message conversations (not groups/channels) containing the bot.
    const convIds = await Conversation.find({
      isGroup: { $ne: true },
      isChannel: { $ne: true },
      members: bot._id,
    }).distinct("_id");

    if (!convIds.length) {
      return res.json({
        ok: true,
        removedConversations: 0,
        removedMessages: 0,
      });
    }

    const msgDel = await Message.deleteMany({
      conversationId: { $in: convIds },
    });
    const convDel = await Conversation.deleteMany({ _id: { $in: convIds } });

    res.json({
      ok: true,
      removedConversations: convDel.deletedCount || 0,
      removedMessages: msgDel.deletedCount || 0,
    });
};

const createConversation = async (req, res) => {
    const { members: requestedMemberIds } = req.body;
    const requesterId = String(req.user.id);

    if (!Array.isArray(requestedMemberIds) || !requestedMemberIds.length) {
      throw ApiError.badRequest("Please fill all the fields");
    }

    const memberIds = [
      ...new Set([...requestedMemberIds.map(String), requesterId]),
    ];

    if (memberIds.length < 2) {
      throw ApiError.badRequest("Conversation must include another member");
    }

    const conv = await Conversation.findOne({
      members: { $all: memberIds },
      $expr: { $eq: [{ $size: "$members" }, memberIds.length] },
      isGroup: { $ne: true },
      isChannel: { $ne: true },
    }).populate("members", "-password -phoneHash");

    if (conv) {
      conv.members = conv.members.filter(
        (memberId) => String(memberId._id || memberId) !== requesterId,
      );
      return res.status(200).json(conv);
    }

    if (memberIds.length === 2) {
      throw ApiError.forbidden("Chat invite required");
    }

    const newConversation = await Conversation.create({
      members: memberIds,
      unreadCounts: memberIds.map((memberId) => ({
        userId: memberId,
        count: 0,
      })),
    });

    await newConversation.populate("members", "-password -phoneHash");

    newConversation.members = newConversation.members.filter(
      (member) => member.id !== requesterId,
    );

    return res.status(200).json(newConversation);
  
};

function sanitizeGroupChannelView(obj, conversation, viewerId) {
  const isGc = Boolean(conversation.isGroup || conversation.isChannel);
  if (!isGc) {
    return { viewerIsAdmin: false };
  }
  const viewerIsAdmin = isConversationAdmin(conversation, viewerId);
  if (viewerIsAdmin) {
    return { viewerIsAdmin: true };
  }
  delete obj.admins;
  delete obj.inviteLinks;
  delete obj.bannedUsers;
  delete obj.moderationLog;
  delete obj.defaultMemberRights;
  delete obj.memberPermissionOverrides;
  if (conversation.isChannel) {
    delete obj.channelSlug;
    delete obj.channelPostingMode;
  }
  return { viewerIsAdmin: false };
}

const getConversation = async (req, res) => {
    const viewer = await User.findById(req.user.id).select(
      "blockedUsers archivedConversationIds mutedConversationIds hiddenConversationIds pinnedConversationIds",
    );
    const blockedUsers = viewer?.blockedUsers || [];
    const conversation = await Conversation.findById(req.params.id)
      .populate("members", "-password -phoneHash")
      .populate("bannedUsers.userId", "name email profilePic username");

    if (!conversation) {
      throw ApiError.notFound("No conversation found");
    }

    if (!isConversationMember(conversation, req.user.id)) {
      throw ApiError.notFound("No conversation found");
    }

    // Keep bans correct server-side (expired bans should not linger).
    if (pruneExpiredBans(conversation)) {
      await conversation.save().catch(() => {});
    }

    if (
      conversation.isChannel &&
      conversation.visibility === "private" &&
      !isConversationMember(conversation, req.user.id)
    ) {
      throw ApiError.forbidden("Private channel access denied");
    }

    if (
      !conversation.isGroup &&
      !conversation.isChannel &&
      !conversation.isSelfChat
    ) {
      const otherMember = conversation.members.find(
        (member) => member.id !== req.user.id,
      );
      // Hide built-in AI chatbot DMs (they can break some client assumptions and are deprecated).
      if (otherMember?.email && /bot$/i.test(String(otherMember.email))) {
        throw ApiError.notFound("No conversation found");
      }
      if (
        otherMember &&
        blockedUsers.some(
          (blockedId) => blockedId.toString() === otherMember.id.toString(),
        )
      ) {
        throw ApiError.forbidden("User is blocked");
      }
    }

    const cid = String(conversation._id);
    const obj = conversation.toObject
      ? { ...conversation.toObject() }
      : { ...conversation };
    const gcView = sanitizeGroupChannelView(obj, conversation, req.user.id);
    if (!gcView.viewerIsAdmin) {
      if (conversation.isGroup || conversation.isChannel) {
        obj.memberCount = (conversation.members || []).length;
        delete obj.members;
      }
    }
    res.status(200).json({
      ...obj,
      ...gcView,
      effectiveMemberRights: getEffectiveMemberRights(
        conversation,
        req.user.id,
      ),
      isArchivedForMe: (viewer?.archivedConversationIds || []).some(
        (x) => String(x) === cid,
      ),
      isMutedForMe: (viewer?.mutedConversationIds || []).some(
        (x) => String(x) === cid,
      ),
      isHiddenForMe: (viewer?.hiddenConversationIds || []).some(
        (x) => String(x) === cid,
      ),
      isPinnedForMe: (viewer?.pinnedConversationIds || []).some(
        (x) => String(x) === cid,
      ),
    });
};

const getSelfConversation = async (req, res) => {
    const conv = await ensureSelfConversation(req.user.id);
    if (!conv) {
      throw new ApiError(500, "Could not create self conversation");
    }
    return res.status(200).json(conv);
  
};

const getConversationList = async (req, res) => {
  const userId = req.user.id;

    const viewer = await User.findById(userId).select(
      "blockedUsers hiddenConversationIds archivedConversationIds mutedConversationIds pinnedConversationIds",
    );
    const blockedUsers = viewer?.blockedUsers || [];
    const hidden = new Set((viewer?.hiddenConversationIds || []).map(String));
    const archived = new Set(
      (viewer?.archivedConversationIds || []).map(String),
    );
    const muted = new Set((viewer?.mutedConversationIds || []).map(String));
    const pinned = new Set((viewer?.pinnedConversationIds || []).map(String));
    await ensureSelfConversation(userId);
    const conversationList = await Conversation.find({
      members: { $in: userId },
    }).populate("members", "-password -phoneHash");

    if (!conversationList) {
      throw ApiError.notFound("No conversation found");
    }

    // remove user from members and also other chatbots
    for (let i = 0; i < conversationList.length; i++) {
      if (conversationList[i].isSelfChat) continue;
      conversationList[i].members = conversationList[i].members.filter(
        (member) => member.id !== userId,
      );
    }

    const filtered = conversationList.filter((conv) => {
      if (conv.isSelfChat) return true;
      if (conv.isGroup || conv.isChannel) return true;
      const otherMember = conv.members[0];
      if (!otherMember) return false;
      // Drop the built-in AI chatbot conversation from lists.
      if (otherMember?.email && /bot$/i.test(String(otherMember.email))) {
        return false;
      }
      return !blockedUsers.some(
        (blockedId) => blockedId.toString() === otherMember.id.toString(),
      );
    });

    const visible = filtered.filter((c) => !hidden.has(String(c._id)));

    visible.sort((a, b) => {
      const aPinned = pinned.has(String(a._id)) ? 1 : 0;
      const bPinned = pinned.has(String(b._id)) ? 1 : 0;
      if (aPinned !== bPinned) return bPinned - aPinned;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    const withMirror = await mergeUnreadMirrorIntoConversations(
      userId,
      visible,
    );
    const enriched = withMirror.map((c) => {
      const o = typeof c.toObject === "function" ? c.toObject() : { ...c };
      const id = String(o._id);
      const row = {
        ...o,
        isArchivedForMe: archived.has(id),
        isMutedForMe: muted.has(id),
        isPinnedForMe: pinned.has(id),
      };
      row.effectiveMemberRights = getEffectiveMemberRights(c, userId);
      if (c.isGroup || c.isChannel) {
        const viewerIsAdmin = isConversationAdmin(c, userId);
        row.viewerIsAdmin = viewerIsAdmin;
        if (!viewerIsAdmin) {
          delete row.admins;
          delete row.inviteLinks;
          delete row.bannedUsers;
          delete row.moderationLog;
          delete row.defaultMemberRights;
          delete row.memberPermissionOverrides;
          if (c.isChannel) {
            delete row.channelSlug;
            delete row.channelPostingMode;
          }
        }
      }
      return row;
    });
    res.status(200).json(enriched);
  
};

/** Conversations the user hid from the main list (for restore UI). */
const listHiddenConversations = async (req, res) => {
  const userId = req.user.id;
    const viewer = await User.findById(userId).select(
      "hiddenConversationIds blockedUsers archivedConversationIds mutedConversationIds pinnedConversationIds",
    );
    const hidden = viewer?.hiddenConversationIds || [];
    if (!hidden.length) return res.json([]);

    const conversationList = await Conversation.find({
      _id: { $in: hidden },
      members: userId,
    }).populate("members", "-password -phoneHash");

    const filtered = [];
    for (let i = 0; i < conversationList.length; i++) {
      const conv = conversationList[i];
      if (conv.isSelfChat) {
        filtered.push(conv);
        continue;
      }
      conv.members = conv.members.filter((m) => m.id !== userId);
      if (!conv.isGroup && !conv.isChannel) {
        const other = conv.members[0];
        if (!other) continue;
        if (
          viewer.blockedUsers.some((b) => b.toString() === other.id.toString())
        ) {
          continue;
        }
      }
      filtered.push(conv);
    }

    const withMirror = await mergeUnreadMirrorIntoConversations(
      userId,
      filtered,
    );
    const archived = new Set(
      (viewer?.archivedConversationIds || []).map(String),
    );
    const muted = new Set((viewer?.mutedConversationIds || []).map(String));
    const pinned = new Set((viewer?.pinnedConversationIds || []).map(String));
    const enriched = withMirror.map((c) => {
      const o = typeof c.toObject === "function" ? c.toObject() : { ...c };
      const id = String(o._id);
      return {
        ...o,
        isArchivedForMe: archived.has(id),
        isMutedForMe: muted.has(id),
        isHiddenForMe: true,
        isPinnedForMe: pinned.has(id),
        effectiveMemberRights: getEffectiveMemberRights(c, userId),
      };
    });
    res.status(200).json(enriched);
  
};

/** Direct chat only: issuer wraps a random 32-byte session key for each member (NaCl box). */
const enableDmE2e = async (req, res) => {
    const convId = req.params.id;
    const { wrappedKeys } = req.body || {};
    const uid = String(req.user.id);
    const conv = await Conversation.findById(convId);
    if (!conv) {
      throw ApiError.notFound("No conversation found");
    }
    if (conv.isGroup || conv.isChannel) {
      throw ApiError.badRequest("E2E is only for direct chats");
    }
    const memberIds = (conv.members || []).map((m) => m.toString());
    if (memberIds.length !== 2 || !memberIds.includes(uid)) {
      throw ApiError.badRequest("Invalid conversation");
    }
    if (conv.e2eEnabled) {
      throw ApiError.badRequest("E2E already enabled");
    }
    if (!Array.isArray(wrappedKeys) || wrappedKeys.length !== 2) {
      throw ApiError.badRequest("wrappedKeys must include both members");
    }
    const me = await User.findById(uid).select("e2ePublicKey");
    if (!me?.e2ePublicKey) {
      throw ApiError.badRequest(
        "Register an E2E public key on your account first",
      );
    }
    const allowed = new Set(memberIds);
    const seen = new Set();
    for (const row of wrappedKeys) {
      const id = row.userId?.toString?.() || String(row.userId);
      if (!id || !allowed.has(id) || !row.box || !row.nonce) {
        throw ApiError.badRequest("Invalid wrappedKeys entry");
      }
      seen.add(id);
    }
    if (seen.size !== 2) {
      throw ApiError.badRequest("Duplicate or missing member wrap");
    }
    conv.e2eEnabled = true;
    conv.e2eWrappedKeys = wrappedKeys.map((r) => ({
      userId: r.userId,
      box: String(r.box),
      nonce: String(r.nonce),
    }));
    conv.e2eIssuerId = req.user.id;
    conv.e2eIssuerPublicKey = me.e2ePublicKey;
    await conv.save();
    await conv.populate("members", "-password -phoneHash");
    emitConversationE2eSync(conv);
    return res.status(200).json(conv);
  
};

const disableDmE2e = async (req, res) => {
    const convId = req.params.id;
    const uid = String(req.user.id);
    const conv = await Conversation.findById(convId);
    if (!conv) {
      throw ApiError.notFound("No conversation found");
    }
    if (conv.isGroup || conv.isChannel) {
      throw ApiError.badRequest("E2E is only for direct chats");
    }
    const memberIds = (conv.members || []).map((m) => m.toString());
    if (memberIds.length !== 2 || !memberIds.includes(uid)) {
      throw ApiError.badRequest("Invalid conversation");
    }
    if (!conv.e2eEnabled) {
      throw ApiError.badRequest("E2E is not enabled");
    }
    conv.e2eEnabled = false;
    conv.e2eWrappedKeys = [];
    conv.e2eIssuerId = undefined;
    conv.e2eIssuerPublicKey = "";
    await conv.save();
    await conv.populate("members", "-password -phoneHash");
    emitConversationE2eSync(conv);
    return res.status(200).json(conv);
  
};

module.exports = {
  createConversation,
  getConversation,
  getSelfConversation,
  getConversationList,
  listHiddenConversations,
  enableDmE2e,
  disableDmE2e,
  purgeAiChatbotConversations,
};
