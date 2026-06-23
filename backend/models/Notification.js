const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    type: {
      type: String,
      enum: ["chat_invite", "mention", "call_invite"],
      required: true,
      index: true,
    },

    link: {
      type: String,
      default: "",
      trim: true,
      maxlength: 240,
    },

    data: {
      status: {
        type: String,
        enum: ["pending", "accepted", "declined", "cancelled"],
        default: "pending",
      },
      conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Conversation",
        default: null,
      },
      conversationName: {
        type: String,
        default: "",
        trim: true,
        maxlength: 140,
      },
      messageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message",
        default: null,
      },
      preview: {
        type: String,
        default: "",
        trim: true,
        maxlength: 180,
      },
      callInviteId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CallInvite",
        default: null,
      },
      callToken: {
        type: String,
        default: "",
        trim: true,
        maxlength: 80,
      },
      callMode: {
        type: String,
        enum: ["", "audio", "video"],
        default: "",
      },
      callTitle: {
        type: String,
        default: "",
        trim: true,
        maxlength: 140,
      },
      scheduledFor: {
        type: Date,
        default: null,
      },
    },

    readAt: {
      type: Date,
      default: null,
      index: true,
    },

    dismissedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

NotificationSchema.index({
  recipientId: 1,
  dismissedAt: 1,
  createdAt: -1,
});

NotificationSchema.index({
  recipientId: 1,
  "data.callInviteId": 1,
});

NotificationSchema.index({
  recipientId: 1,
  "data.messageId": 1,
});

NotificationSchema.index({
  recipientId: 1,
  readAt: 1,
  createdAt: -1,
});

NotificationSchema.index(
  {
    recipientId: 1,
    actorId: 1,
    type: 1,
    dismissedAt: 1,
    "data.status": 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      type: "chat_invite",
      dismissedAt: null,
      "data.status": "pending",
    },
  },
);

const Notification = mongoose.model("Notification", NotificationSchema);

module.exports = Notification;
