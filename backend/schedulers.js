const {
  publishDueScheduledMessages,
  expireDisappearingMessages,
  cleanupExpiredStagedUploads,
} = require("./controllers/messages/index.js");

const {
  sendDueCallInviteReminders,
  expireStaleRingingCalls,
} = require("./controllers/calls/index.js");

const {
  cleanupExpiredBans,
} = require("./controllers/conversations/index.js");

const {
  redeliverUndeliveredMessages,
} = require("./services/delivery-service.js");

const startSchedulers = () => {
  setInterval(() => {
    publishDueScheduledMessages().catch((error) => {
      console.error("scheduled delivery tick failed", error);
    });
  }, 15000);

  setInterval(() => {
    expireDisappearingMessages().catch((error) => {
      console.error("disappearing cleanup tick failed", error);
    });
  }, 15000);

  setInterval(
    () => {
      try {
        cleanupExpiredStagedUploads();
      } catch (error) {
        console.error("staged upload cleanup tick failed", error);
      }
    },
    15 * 60 * 1000,
  );

  setInterval(() => {
    sendDueCallInviteReminders().catch((error) => {
      console.error("call reminder tick failed", error);
    });
  }, 60 * 1000);

  setInterval(() => {
    expireStaleRingingCalls().catch((error) => {
      console.error("stale call cleanup tick failed", error);
    });
  }, 60 * 1000);

  setInterval(
    () => {
      cleanupExpiredBans().catch((error) => {
        console.error("ban cleanup tick failed", error);
      });
    },
    10 * 60 * 1000,
  );

  // Reliability sweep: re-deliver messages recipients never acked as delivered.
  setInterval(() => {
    redeliverUndeliveredMessages().catch((error) => {
      console.error("redelivery tick failed", error);
    });
  }, 30 * 1000);
};

module.exports = startSchedulers;
