const mongoose = require("mongoose");

const ConversationSchema = new mongoose.Schema(
  {
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    latestMessage: {
      type: String,
      default: "",
    },

    /**
     * Monotonic per-conversation message counter. Atomically incremented on each
     * delivered message ($inc) and stamped onto the message as `seq`, giving a
     * total order that is stable even when createdAt timestamps collide.
     */
    msgSeq: {
      type: Number,
      default: 0,
    },

    isGroup: {
      type: Boolean,
      default: false,
    },

    /** Broadcast-style rooms */
    isChannel: {
      type: Boolean,
      default: false,
    },

    /** Personal self chat */
    isSelfChat: {
      type: Boolean,
      default: false,
    },

    channelSlug: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
      maxlength: 80,
    },

    visibility: {
      type: String,
      enum: ["public", "private"],
      default: "public",
    },

    description: {
      type: String,
      default: "",
      maxlength: 500,
    },

    /** Custom photo for groups/channels (absolute or relative upload URL). */
    avatar: {
      type: String,
      default: "",
      trim: true,
    },

    admins: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    topics: {
      type: [
        {
          id: {
            type: String,
            required: true,
          },

          name: {
            type: String,
            required: true,
          },

          description: {
            type: String,
            default: "",
          },

          createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
          },

          archived: {
            type: Boolean,
            default: false,
          },
        },
      ],

      default: [],
    },

    name: {
      type: String,
      trim: true,
      maxlength: 80,
      required: function () {
        return this.isGroup || this.isChannel;
      },
    },

    unreadCounts: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },

        count: {
          type: Number,
          default: 0,
        },
      },
    ],

    /** E2E */
    e2eEnabled: {
      type: Boolean,
      default: false,
    },

    e2eWrappedKeys: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },

        box: {
          type: String,
          required: true,
        },

        nonce: {
          type: String,
          required: true,
        },
      },
    ],

    e2eIssuerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    e2eIssuerPublicKey: {
      type: String,
      default: "",
    },

    /** Channel permissions */
    channelPostingMode: {
      type: String,
      enum: ["all", "admins_only"],
      default: "all",
    },

    defaultMemberRights: {
      canPostMessages: {
        type: Boolean,
        default: true,
      },

      canAddMembers: {
        type: Boolean,
        default: true,
      },

      canPinMessages: {
        type: Boolean,
        default: false,
      },

      canEditInfo: {
        type: Boolean,
        default: false,
      },
    },

    memberPermissionOverrides: {
      type: [
        {
          userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
          },

          canPostMessages: {
            type: Boolean,
          },

          canAddMembers: {
            type: Boolean,
          },

          canPinMessages: {
            type: Boolean,
          },

          canEditInfo: {
            type: Boolean,
          },
        },
      ],

      default: [],
    },

    bannedUsers: {
      type: [
        {
          userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
          },

          bannedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
          },

          bannedAt: {
            type: Date,
            default: Date.now,
          },

          reason: {
            type: String,
            default: "",
          },

          expiresAt: {
            type: Date,
            default: null,
          },
        },
      ],

      default: [],
    },

    inviteLinks: {
      type: [
        {
          token: {
            type: String,
            required: true,
          },

          label: {
            type: String,
            default: "",
          },

          createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
          },

          createdAt: {
            type: Date,
            default: Date.now,
          },

          revokedAt: {
            type: Date,
            default: null,
          },

          revokedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
          },

          maxUses: {
            type: Number,
            default: null,
          },

          usesCount: {
            type: Number,
            default: 0,
          },

          lastUsedAt: {
            type: Date,
            default: null,
          },

          lastUsedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
          },

          expiresAt: {
            type: Date,
            default: null,
          },
        },
      ],

      default: [],
    },

    moderationLog: {
      type: [
        {
          action: {
            type: String,
            required: true,
          },

          actorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
          },

          targetUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
          },

          token: {
            type: String,
            default: "",
          },

          reason: {
            type: String,
            default: "",
          },

          at: {
            type: Date,
            default: Date.now,
          },

          meta: {
            type: Object,
            default: {},
          },
        },
      ],

      default: [],
    },
  },
  {
    timestamps: true,
  },
);

// =========================
// Indexes
// =========================

// Membership/list lookups
ConversationSchema.index({ members: 1 });

ConversationSchema.index({
  members: 1,
  updatedAt: -1,
});

// Admin lookups
ConversationSchema.index({
  admins: 1,
});

// Conversation type filters
ConversationSchema.index({
  isGroup: 1,
  isChannel: 1,
});

ConversationSchema.index({
  isSelfChat: 1,
  members: 1,
});

// Channel discovery
ConversationSchema.index({
  isChannel: 1,
  visibility: 1,
  updatedAt: -1,
});

ConversationSchema.index(
  {
    channelSlug: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      isChannel: true,
      channelSlug: { $type: "string", $gt: "" },
    },
  },
);

// Invite token lookup
ConversationSchema.index({
  "inviteLinks.token": 1,
});

ConversationSchema.index({
  "inviteLinks.expiresAt": 1,
});

ConversationSchema.index({
  "inviteLinks.revokedAt": 1,
});

// Moderation cleanup
ConversationSchema.index({
  "bannedUsers.expiresAt": 1,
});

// User unread lookups
ConversationSchema.index({
  "unreadCounts.userId": 1,
});

// Topic lookup
ConversationSchema.index({
  "topics.id": 1,
});

const Conversation = mongoose.model("Conversation", ConversationSchema);

module.exports = Conversation;
