const express = require("express");

const router = express.Router();

const fetchuser = require("../middleware/fetch_user.js");
const validate = require("../middleware/validate.js");

const {
  messageListParamsSchema,
  messageSearchQuerySchema,
  syncQuerySchema,
  threadRootParamSchema,
  conversationIdParamSchema,
} = require("../validators/common.js");

const {
  sendMessageSchema,
  editMessageSchema,
  deleteMessageSchema,
  forwardMessageSchema,
  pinMessageSchema,
  saveMessageSchema,
  markDeliveredSchema,
  markReadSchema,
  votePollSchema,
  openViewOnceSchema,
  cancelScheduledSchema,
  reactMessageSchema,
} = require("../validators/message_validator.js");

const {
  allMessage,
  deleteMessage,
  searchMessages,
  forwardMessage,
  togglePinMessage,
  toggleSavedMessage,
  listSavedMessages,
  httpSendMessage,
  uploadMessageAttachment,
  markDeliveredMessage,
  markReadMessage,
  syncMessages,
  httpEditMessage,
  votePollMessage,
  openViewOnceMessage,
  cancelScheduledMessage,
  httpReactMessage,
  listThreadMessages,
  exportConversation,
  listLiveLocations,
} = require("../controllers/messages/index.js");

const { messageUpload } = require("../services/message-upload.js");

router.get("/saved", fetchuser, listSavedMessages);

router.get("/starred", fetchuser, listSavedMessages);

router.get(
  "/export/:conversationId",
  fetchuser,
  validate(conversationIdParamSchema, "params"),
  exportConversation,
);

router.get(
  "/thread/:rootId",
  fetchuser,
  validate(threadRootParamSchema, "params"),
  listThreadMessages,
);

router.get(
  "/live-location/:conversationId",
  fetchuser,
  validate(conversationIdParamSchema, "params"),
  listLiveLocations,
);

router.get(
  "/sync",
  fetchuser,
  validate(syncQuerySchema, "query"),
  syncMessages,
);

router.get(
  "/search",
  fetchuser,
  validate(messageSearchQuerySchema, "query"),
  searchMessages,
);

router.post(
  "/upload",
  fetchuser,
  messageUpload.single("file"),
  uploadMessageAttachment,
);

router.post("/edit", fetchuser, validate(editMessageSchema), httpEditMessage);

router.post(
  "/react",
  fetchuser,
  validate(reactMessageSchema),
  httpReactMessage,
);

router.post("/send", fetchuser, validate(sendMessageSchema), httpSendMessage);

router.post("/poll-vote", fetchuser, validate(votePollSchema), votePollMessage);

router.post(
  "/view-once-open",
  fetchuser,
  validate(openViewOnceSchema),
  openViewOnceMessage,
);

router.post(
  "/cancel-scheduled",
  fetchuser,
  validate(cancelScheduledSchema),
  cancelScheduledMessage,
);

router.post(
  "/delivered",
  fetchuser,
  validate(markDeliveredSchema),
  markDeliveredMessage,
);

router.post("/read", fetchuser, validate(markReadSchema), markReadMessage);

router.post(
  "/forward",
  fetchuser,
  validate(forwardMessageSchema),
  forwardMessage,
);

router.post("/pin", fetchuser, validate(pinMessageSchema), togglePinMessage);

router.post(
  "/save",
  fetchuser,
  validate(saveMessageSchema),
  toggleSavedMessage,
);

router.post(
  "/star",
  fetchuser,
  validate(saveMessageSchema),
  toggleSavedMessage,
);

router.post("/delete", fetchuser, validate(deleteMessageSchema), deleteMessage);

router.get(
  "/:id/:userid",
  fetchuser,
  validate(messageListParamsSchema, "params"),
  allMessage,
);

module.exports = router;
