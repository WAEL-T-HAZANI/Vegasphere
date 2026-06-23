const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },

    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    /**
     * Monotonic per-conversation sequence (from Conversation.msgSeq). Authoritative
     * ordering key for clients; 0 until the message is published (scheduled drafts).
     */
    seq: {
      type: Number,
      default: 0,
    },

    messageType: {
      type: String,
      default: "text",
    },

    text: {
      type: String,
      default: "",
    },

    imageUrl: {
      type: String,
      default: "",
    },

    fileName: {
      type: String,
      default: "",
    },

    fileType: {
      type: String,
      default: "",
    },

    fileSize: {
      type: Number,
      default: 0,
    },

    fileData: {
      type: String,
      default: "",
    },

    audioData: {
      type: String,
      default: "",
    },

    audioDuration: {
      type: Number,
      default: 0,
    },

    location: {
      lat: { type: Number },
      lng: { type: Number },
      label: { type: String, default: "" },
    },

    reactions: {
      type: [
        {
          emoji: {
            type: String,
            required: true,
          },

          users: {
            type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
            default: [],
          },
        },
      ],

      default: [],
    },

    isEdited: {
      type: Boolean,
      default: false,
    },

    editedAt: {
      type: Date,
      default: null,
    },

    seenBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },

        seenAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    /** Delivered status */
    deliveredTo: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },

        deliveredAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    deletedFrom: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    deletedForEveryone: {
      type: Boolean,
      default: false,
    },

    deletedForEveryoneAt: {
      type: Date,
      default: null,
    },

    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      ref: "Message",
    },

    /** Thread root message id (replies in a sub-thread share this). */
    threadRootId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
      index: true,
    },

    /** Reply count on the root message only. */
    threadReplyCount: {
      type: Number,
      default: 0,
    },

    /** Forward metadata */
    forwardedFrom: {
      conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Conversation",
        default: null,
      },

      messageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message",
        default: null,
      },

      previewText: {
        type: String,
        default: "",
      },

      originalSenderName: {
        type: String,
        default: "",
      },
    },

    isPinned: {
      type: Boolean,
      default: false,
    },

    starredBy: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },

    /** E2E */
    e2eVersion: {
      type: Number,
      default: 0,
    },

    e2eBox: {
      type: String,
      default: "",
    },

    e2eNonce: {
      type: String,
      default: "",
    },

    /** Mentions */
    mentionedUserIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },

    topicId: {
      type: String,
      default: "",
      index: true,
    },

    topicName: {
      type: String,
      default: "",
    },

    /** Polls */
    poll: {
      question: {
        type: String,
        default: "",
      },

      allowsMultiple: {
        type: Boolean,
        default: false,
      },

      closesAt: {
        type: Date,
        default: null,
      },

      options: {
        type: [
          {
            id: {
              type: String,
              required: true,
            },

            text: {
              type: String,
              required: true,
            },

            voterIds: {
              type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
              default: [],
            },
          },
        ],

        default: [],
      },
    },

    disappearAfterSec: {
      type: Number,
      default: 0,
      index: true,
    },

    expiresAt: {
      type: Date,
      default: null,
      index: true,
    },

    viewOnce: {
      type: Boolean,
      default: false,
    },

    scheduledFor: {
      type: Date,
      default: null,
      index: true,
    },

    scheduledStatus: {
      type: String,
      enum: ["pending", "sent", "cancelled"],
      default: "sent",
      index: true,
    },

    publishedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// =========================
// Indexes
// =========================

// Main chat pagination
MessageSchema.index({
  conversationId: 1,
  createdAt: -1,
});

// Total-order pagination / consistency (authoritative ordering)
MessageSchema.index({
  conversationId: 1,
  seq: -1,
});

// Offline sync: undelivered lookups per recipient
MessageSchema.index({
  "deliveredTo.user": 1,
  createdAt: -1,
});

// Fast sender lookups
MessageSchema.index({
  senderId: 1,
  createdAt: -1,
});

// Scheduled messages
MessageSchema.index({
  conversationId: 1,
  scheduledStatus: 1,
  scheduledFor: 1,
});

// Pinned messages
MessageSchema.index({
  conversationId: 1,
  isPinned: 1,
  createdAt: -1,
});

// Expiring messages
MessageSchema.index({
  conversationId: 1,
  expiresAt: 1,
});

// Mention queries
MessageSchema.index({
  mentionedUserIds: 1,
  createdAt: -1,
});

// Topic navigation
MessageSchema.index({
  topicId: 1,
  createdAt: -1,
});

// Search optimization
MessageSchema.index({
  text: "text",
  fileName: "text",
  topicName: "text",
});

// Poll activity
MessageSchema.index({
  "poll.options.voterIds": 1,
});

// View-once + disappearing
MessageSchema.index({
  viewOnce: 1,
  expiresAt: 1,
});

// Delivery/read optimization
MessageSchema.index({
  "seenBy.user": 1,
});

const Message = mongoose.model("Message", MessageSchema);

module.exports = Message;
