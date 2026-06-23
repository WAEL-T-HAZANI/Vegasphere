const Conversation = require("../../models/Conversation.js");
const ApiError = require("../../services/http-error.js");
const {
  conversationAvatarUploadPrefix,
  buildAbsoluteAssetUrl,
  removeStoredConversationAvatarFile,
} = require("../../services/avatar-utils.js");
const { publishLocalUpload } = require("../../services/object-storage.js");
const {
  isConversationAdmin,
  isConversationMember,
  assertCanEditInfo,
  getEffectiveMemberRights,
} = require("../../services/conversation-permissions.js");
const { populateConversation } = require("./helpers.js");

function assertCanManageConversationAvatar(conv, uid) {
  if (!conv || !conv.isGroup) {
    throw ApiError.badRequest("Only for groups and channels");
  }
  if (!isConversationMember(conv, uid)) {
    throw ApiError.forbidden("Not a member");
  }
  if (isConversationAdmin(conv, uid)) return;
  const info = assertCanEditInfo(conv, uid);
  if (!info.ok) throw ApiError.forbidden(info.error);
}

function conversationAvatarResponse(req, conv) {
  const uid = String(req.user.id);
  const out = conv.toObject?.() || conv;
  if (!isConversationAdmin(conv, uid)) {
    delete out.bannedUsers;
    delete out.moderationLog;
  }
  return {
    ...out,
    effectiveMemberRights: getEffectiveMemberRights(conv, req.user.id),
  };
}

const uploadConversationAvatar = async (req, res) => {
  const conv = await Conversation.findById(req.params.id);
  if (!conv) {
    throw ApiError.notFound("Conversation not found");
  }
  const uid = String(req.user.id);
  assertCanManageConversationAvatar(conv, uid);
  if (!req.file) {
    throw ApiError.badRequest("avatar file required");
  }

  const relUrl = `${conversationAvatarUploadPrefix}${req.file.filename}`;
  const previous = conv.avatar || "";
  const cloudUrl = await publishLocalUpload(
    req.file.path,
    relUrl,
    req.file.mimetype,
  );
  const absoluteUrl = cloudUrl || buildAbsoluteAssetUrl(req, relUrl);
  conv.avatar = absoluteUrl;
  await conv.save();
  if (previous && previous !== absoluteUrl) {
    await removeStoredConversationAvatarFile(previous);
  }

  await populateConversation(conv);
  await conv.populate("bannedUsers.userId", "name email profilePic username");
  return res.status(201).json({
    ok: true,
    url: absoluteUrl,
    relativeUrl: relUrl,
    conversation: conversationAvatarResponse(req, conv),
  });
};

const removeConversationAvatar = async (req, res) => {
  const conv = await Conversation.findById(req.params.id);
  if (!conv) {
    throw ApiError.notFound("Conversation not found");
  }
  const uid = String(req.user.id);
  assertCanManageConversationAvatar(conv, uid);

  const previous = conv.avatar || "";
  conv.avatar = "";
  await conv.save();
  if (previous) {
    await removeStoredConversationAvatarFile(previous);
  }

  await populateConversation(conv);
  await conv.populate("bannedUsers.userId", "name email profilePic username");
  return res.json({
    ok: true,
    conversation: conversationAvatarResponse(req, conv),
  });
};

module.exports = {
  uploadConversationAvatar,
  removeConversationAvatar,
};
