const { wrapHttpHandlers } = require("../../services/async-handler.js");
const { notifyAfterMessageSend } = require("./helpers.js");
const { sendMessageHandler } = require("./send.service.js");
const { deleteMessageHandler } = require("./delete.service.js");
const { reactMessageHandler, editMessageHandler } = require("./socket.handlers.js");
const {
  publishDueScheduledMessages,
  expireDisappearingMessages,
  cleanupExpiredStagedUploads,
} = require("./schedulers.js");
const { allMessage, searchMessages, syncMessages, listSavedMessages } =
  require("./query.http.js");
const {
  deleteMessage,
  forwardMessage,
  togglePinMessage,
  toggleSavedMessage,
  httpEditMessage,
  votePollMessage,
  openViewOnceMessage,
  cancelScheduledMessage,
  httpReactMessage,
} = require("./actions.http.js");
const { httpSendMessage, uploadMessageAttachment } = require("./send.http.js");
const { markDeliveredMessage, markReadMessage } = require("./receipts.http.js");
const { listThreadMessages } = require("./threads.http.js");
const { exportConversation } = require("./export.http.js");
const { listLiveLocations } = require("./live-location.http.js");

module.exports = wrapHttpHandlers(
  {
    allMessage,
    deleteMessage,
    sendMessageHandler,
    deleteMessageHandler,
    notifyAfterMessageSend,
    httpSendMessage,
    uploadMessageAttachment,
    markDeliveredMessage,
    markReadMessage,
    syncMessages,
    reactMessageHandler,
    editMessageHandler,
    searchMessages,
    forwardMessage,
    togglePinMessage,
    toggleSavedMessage,
    listSavedMessages,
    httpEditMessage,
    publishDueScheduledMessages,
    expireDisappearingMessages,
    cleanupExpiredStagedUploads,
    votePollMessage,
    openViewOnceMessage,
    cancelScheduledMessage,
    httpReactMessage,
    listThreadMessages,
    exportConversation,
    listLiveLocations,
  },
  [
    "sendMessageHandler",
    "deleteMessageHandler",
    "reactMessageHandler",
    "editMessageHandler",
    "notifyAfterMessageSend",
    "publishDueScheduledMessages",
    "expireDisappearingMessages",
    "cleanupExpiredStagedUploads",
  ],
);
