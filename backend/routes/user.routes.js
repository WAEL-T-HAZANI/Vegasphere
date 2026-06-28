const express = require("express");

const router = express.Router();

const fetchuser = require("../middleware/fetch_user.js");
const validate = require("../middleware/validate.js");
const { avatarUpload } = require("../services/avatar-upload.js");

const {
  idParamSchema,
  fromUserIdParamSchema,
  searchQuerySchema,
  presenceQuerySchema,
} = require("../validators/common.js");

const {
  updateProfileSchema,
  subscribePushSchema,
  unsubscribePushSchema,
  e2ePublicKeySchema,
  matchContactsSchema,
  patchChatInboxSchema,
  sendInviteSchema,
  reportUserSchema,
} = require("../validators/user_validator.js");

const {
  getPublicProfile,
  getOnlineStatus,
  blockUser,
  unblockUser,
  getBlockedUsers,
  searchUsers,
  sendChatInvite,
  listIncomingInvites,
  acceptChatInvite,
  declineChatInvite,
  getPresenceBatch,
  getVapidPublicKeyHandler,
  subscribePush,
  unsubscribePush,
  sendTestPush,
  setE2ePublicKey,
  getE2ePublicKey,
  matchContacts,
  patchChatInbox,
  ignoreUser,
  unignoreUser,
  listIgnoredUsers,
  uploadAvatar,
  removeAvatar,
  downloadContactVcard,
  deleteMyAccount,
  reportUser,
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  dismissNotification,
  dismissAllNotifications,
} = require("../controllers/users/index.js");

const {
  getNonFriendsList,
  updateProfile,
} = require("../controllers/auth/index.js");

router.get(
  "/online-status/:id",
  fetchuser,
  validate(idParamSchema, "params"),
  getOnlineStatus,
);

router.get(
  "/public/:id",
  fetchuser,
  validate(idParamSchema, "params"),
  getPublicProfile,
);

router.get(
  "/:id/contact.vcf",
  fetchuser,
  validate(idParamSchema, "params"),
  downloadContactVcard,
);

router.get(
  "/presence",
  fetchuser,
  validate(presenceQuerySchema, "query"),
  getPresenceBatch,
);

router.get("/push/vapid-public", getVapidPublicKeyHandler);

router.post(
  "/push/subscribe",
  fetchuser,
  validate(subscribePushSchema),
  subscribePush,
);

router.post(
  "/push/unsubscribe",
  fetchuser,
  validate(unsubscribePushSchema),
  unsubscribePush,
);

router.post("/push/test", fetchuser, sendTestPush);

router.put(
  "/e2e-public-key",
  fetchuser,
  validate(e2ePublicKeySchema),
  setE2ePublicKey,
);

router.get("/e2e-public-key", fetchuser, getE2ePublicKey);

router.post(
  "/contacts/match",
  fetchuser,
  validate(matchContactsSchema),
  matchContacts,
);

router.patch(
  "/chat-inbox",
  fetchuser,
  validate(patchChatInboxSchema),
  patchChatInbox,
);

router.get("/ignored", fetchuser, listIgnoredUsers);

router.get("/notifications", fetchuser, listNotifications);

router.patch("/notifications/read-all", fetchuser, markAllNotificationsRead);

router.delete("/notifications", fetchuser, dismissAllNotifications);

router.patch(
  "/notifications/:id/read",
  fetchuser,
  validate(idParamSchema, "params"),
  markNotificationRead,
);

router.delete(
  "/notifications/:id",
  fetchuser,
  validate(idParamSchema, "params"),
  dismissNotification,
);

router.post(
  "/ignore/:id",
  fetchuser,
  validate(idParamSchema, "params"),
  ignoreUser,
);

router.post(
  "/unignore/:id",
  fetchuser,
  validate(idParamSchema, "params"),
  unignoreUser,
);

router.post(
  "/avatar/upload",
  fetchuser,
  avatarUpload.single("avatar"),
  uploadAvatar,
);

router.delete("/avatar", fetchuser, removeAvatar);

router.get(
  "/search",
  fetchuser,
  validate(searchQuerySchema, "query"),
  searchUsers,
);

router.get("/non-friends", fetchuser, getNonFriendsList);

router.get("/invites/incoming", fetchuser, listIncomingInvites);

router.post(
  "/invite/:id",
  fetchuser,
  validate(idParamSchema, "params"),
  validate(sendInviteSchema),
  sendChatInvite,
);

router.post(
  "/invites/:fromUserId/accept",
  fetchuser,
  validate(fromUserIdParamSchema, "params"),
  acceptChatInvite,
);

router.post(
  "/invites/:fromUserId/decline",
  fetchuser,
  validate(fromUserIdParamSchema, "params"),
  declineChatInvite,
);

router.put("/update", fetchuser, validate(updateProfileSchema), updateProfile);

router.get("/blocked", fetchuser, getBlockedUsers);

router.post(
  "/block/:id",
  fetchuser,
  validate(idParamSchema, "params"),
  blockUser,
);

router.post(
  "/unblock/:id",
  fetchuser,
  validate(idParamSchema, "params"),
  unblockUser,
);

router.delete("/me", fetchuser, deleteMyAccount);

router.post(
  "/report/:id",
  fetchuser,
  validate(idParamSchema, "params"),
  validate(reportUserSchema),
  reportUser,
);

module.exports = router;
