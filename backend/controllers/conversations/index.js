const { wrapHttpHandlers } = require("../../services/async-handler.js");
const { cleanupExpiredBans } = require("./helpers.js");
const {
  createConversation,
  getConversation,
  getSelfConversation,
  getConversationList,
  listHiddenConversations,
  enableDmE2e,
  disableDmE2e,
  purgeAiChatbotConversations,
} = require("./direct.http.js");
const {
  createGroup,
  createChannel,
  listChannels,
  joinChannel,
  leaveGroup,
  addGroupMembers,
  removeGroupMember,
  promoteGroupAdmin,
  demoteGroupAdmin,
} = require("./groups.http.js");
const {
  createConversationTopic,
  archiveConversationTopic,
  updateConversationTopic,
  restoreConversationTopic,
} = require("./topics.http.js");
const {
  getJoinPreview,
  joinWithInviteToken,
  createInviteLink,
  listInviteLinks,
  updateInviteLink,
  revokeInviteLink,
} = require("./invites.http.js");
const {
  getModerationLog,
  banMember,
  unbanMember,
  patchConversationSettings,
  patchMemberPermissions,
} = require("./moderation.http.js");
const {
  uploadConversationAvatar,
  removeConversationAvatar,
} = require("./avatar.http.js");

module.exports = wrapHttpHandlers(
  {
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
    getJoinPreview,
    joinWithInviteToken,
    createInviteLink,
    listInviteLinks,
    updateInviteLink,
    revokeInviteLink,
    getModerationLog,
    banMember,
    unbanMember,
    patchConversationSettings,
    patchMemberPermissions,
    uploadConversationAvatar,
    removeConversationAvatar,
    cleanupExpiredBans,
  },
  ["cleanupExpiredBans"],
);
