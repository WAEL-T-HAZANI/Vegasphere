const express = require("express");

const router = express.Router();

const fetchuser = require("../middleware/fetch_user.js");
const validate = require("../middleware/validate.js");

const {
  idParamSchema,
  conversationMemberParamsSchema,
  conversationTopicParamsSchema,
  conversationInviteTokenParamsSchema,
  joinTokenParamSchema,
} = require("../validators/common.js");

const {
  createConversationSchema,
  createGroupSchema,
  createChannelSchema,
  addGroupMembersSchema,
  promoteAdminSchema,
  createTopicSchema,
  updateTopicSchema,
  createInviteLinkSchema,
  updateInviteLinkSchema,
  banMemberSchema,
  patchConversationSettingsSchema,
  patchMemberPermissionsSchema,
  enableDmE2eSchema,
} = require("../validators/conversation_validator.js");

const { conversationAvatarUpload } = require("../services/conversation-avatar-upload.js");

const {
  createConversation,
  getConversation,
  getSelfConversation,
  getConversationList,
  createGroup,
  createChannel,
  listChannels,
  joinChannel,
  leaveGroup,
  addGroupMembers,
  removeGroupMember,
  promoteGroupAdmin,
  demoteGroupAdmin,
  createConversationTopic,
  archiveConversationTopic,
  updateConversationTopic,
  restoreConversationTopic,
  listHiddenConversations,
  enableDmE2e,
  disableDmE2e,
  purgeAiChatbotConversations,
  createInviteLink,
  listInviteLinks,
  updateInviteLink,
  revokeInviteLink,
  banMember,
  unbanMember,
  getModerationLog,
  patchConversationSettings,
  patchMemberPermissions,
  uploadConversationAvatar,
  removeConversationAvatar,
} = require("../controllers/conversations/index.js");

router.post(
  "/",
  fetchuser,
  validate(createConversationSchema),
  createConversation,
);

router.get("/self", fetchuser, getSelfConversation);

router.post("/group", fetchuser, validate(createGroupSchema), createGroup);

router.post(
  "/channel",
  fetchuser,
  validate(createChannelSchema),
  createChannel,
);

router.get("/channels/list", fetchuser, listChannels);

router.get("/hidden", fetchuser, listHiddenConversations);

router.post(
  "/channel/:id/join",
  fetchuser,
  validate(idParamSchema, "params"),
  joinChannel,
);

router.post(
  "/:id/leave",
  fetchuser,
  validate(idParamSchema, "params"),
  leaveGroup,
);

router.post(
  "/:id/members",
  fetchuser,
  validate(idParamSchema, "params"),
  validate(addGroupMembersSchema),
  addGroupMembers,
);

router.delete(
  "/:id/members/:userId",
  fetchuser,
  validate(conversationMemberParamsSchema, "params"),
  removeGroupMember,
);

router.post(
  "/:id/admins",
  fetchuser,
  validate(idParamSchema, "params"),
  validate(promoteAdminSchema),
  promoteGroupAdmin,
);

router.delete(
  "/:id/admins/:userId",
  fetchuser,
  validate(conversationMemberParamsSchema, "params"),
  demoteGroupAdmin,
);

router.post(
  "/:id/topics",
  fetchuser,
  validate(idParamSchema, "params"),
  validate(createTopicSchema),
  createConversationTopic,
);

router.patch(
  "/:id/topics/:topicId",
  fetchuser,
  validate(conversationTopicParamsSchema, "params"),
  validate(updateTopicSchema),
  updateConversationTopic,
);

router.post(
  "/:id/topics/:topicId/restore",
  fetchuser,
  validate(conversationTopicParamsSchema, "params"),
  restoreConversationTopic,
);

router.delete(
  "/:id/topics/:topicId",
  fetchuser,
  validate(conversationTopicParamsSchema, "params"),
  archiveConversationTopic,
);

router.post(
  "/:id/e2e-enable",
  fetchuser,
  validate(idParamSchema, "params"),
  validate(enableDmE2eSchema),
  enableDmE2e,
);

router.post(
  "/:id/e2e-disable",
  fetchuser,
  validate(idParamSchema, "params"),
  disableDmE2e,
);

router.delete("/purge/ai-chatbot", fetchuser, purgeAiChatbotConversations);

router.post(
  "/:id/invites",
  fetchuser,
  validate(idParamSchema, "params"),
  validate(createInviteLinkSchema),
  createInviteLink,
);

router.get(
  "/:id/invites",
  fetchuser,
  validate(idParamSchema, "params"),
  listInviteLinks,
);

router.patch(
  "/:id/invites/:token",
  fetchuser,
  validate(conversationInviteTokenParamsSchema, "params"),
  validate(updateInviteLinkSchema),
  updateInviteLink,
);

router.delete(
  "/:id/invites/:token",
  fetchuser,
  validate(conversationInviteTokenParamsSchema, "params"),
  revokeInviteLink,
);

router.get(
  "/:id/audit",
  fetchuser,
  validate(idParamSchema, "params"),
  getModerationLog,
);

router.patch(
  "/:id/settings",
  fetchuser,
  validate(idParamSchema, "params"),
  validate(patchConversationSettingsSchema),
  patchConversationSettings,
);

router.post(
  "/:id/avatar/upload",
  fetchuser,
  validate(idParamSchema, "params"),
  conversationAvatarUpload.single("avatar"),
  uploadConversationAvatar,
);

router.delete(
  "/:id/avatar",
  fetchuser,
  validate(idParamSchema, "params"),
  removeConversationAvatar,
);

router.patch(
  "/:id/members/:userId/permissions",
  fetchuser,
  validate(conversationMemberParamsSchema, "params"),
  validate(patchMemberPermissionsSchema),
  patchMemberPermissions,
);

router.post(
  "/:id/ban",
  fetchuser,
  validate(idParamSchema, "params"),
  validate(banMemberSchema),
  banMember,
);

router.delete(
  "/:id/ban/:userId",
  fetchuser,
  validate(conversationMemberParamsSchema, "params"),
  unbanMember,
);

router.get(
  "/:id",
  fetchuser,
  validate(idParamSchema, "params"),
  getConversation,
);

router.get("/", fetchuser, getConversationList);

module.exports = router;
