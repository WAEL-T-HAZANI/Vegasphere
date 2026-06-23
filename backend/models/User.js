const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 50,
    },

    about: {
      type: String,
      default: "",
      trim: true,
      maxlength: 300,
    },

    networkingHeadline: {
      type: String,
      default: "",
      trim: true,
      maxlength: 120,
    },

    networkingSkills: {
      type: [String],
      default: [],
      set: (items) =>
        Array.from(
          new Set(
            (Array.isArray(items) ? items : [])
              .map((item) => String(item || "").trim().toLowerCase())
              .filter(Boolean)
              .slice(0, 16),
          ),
        ),
    },

    networkingInterests: {
      type: [String],
      default: [],
      set: (items) =>
        Array.from(
          new Set(
            (Array.isArray(items) ? items : [])
              .map((item) => String(item || "").trim().toLowerCase())
              .filter(Boolean)
              .slice(0, 16),
          ),
        ),
    },

    networkingLookingFor: {
      type: String,
      default: "",
      trim: true,
      maxlength: 220,
    },

    networkingOpenToCollaborate: {
      type: Boolean,
      default: false,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },

    username: {
      type: String,
      default: undefined,
      trim: true,
      lowercase: true,
      unique: true,
      sparse: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
    },

    emailVerified: {
      type: Boolean,
      default: false,
    },

    emailVerifyTokenHash: {
      type: String,
      default: "",
      select: false,
    },

    emailVerifyExpires: {
      type: Date,
      default: null,
      select: false,
    },

    profilePic: {
      type: String,
      default:
        "https://ui-avatars.com/api/?name=Vegasphere&background=8B1E3F&color=ffffff&bold=true",
    },

    isOnline: {
      type: Boolean,
      default: false,
    },

    lastSeen: {
      type: Date,
      default: Date.now,
    },

    blockedUsers: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },

    /** Incoming chat invites */
    pendingChatInvitesFrom: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },

    showLastSeen: {
      type: Boolean,
      default: true,
    },

    showOnlineStatus: {
      type: Boolean,
      default: true,
    },

    /**
     * Privacy controls
     */
    lastSeenVisibility: {
      type: String,
      enum: ["everyone", "contacts", "nobody"],
      default: "everyone",
    },

    onlineVisibility: {
      type: String,
      enum: ["everyone", "contacts", "nobody"],
      default: "everyone",
    },

    profilePhotoVisibility: {
      type: String,
      enum: ["everyone", "contacts", "nobody"],
      default: "everyone",
    },

    aboutVisibility: {
      type: String,
      enum: ["everyone", "contacts", "nobody"],
      default: "everyone",
    },

    callPrivacy: {
      type: String,
      enum: ["everyone", "contacts", "nobody"],
      default: "everyone",
    },

    searchDiscoverable: {
      type: String,
      enum: ["everyone", "contacts", "nobody"],
      default: "everyone",
    },

    groupAddPermission: {
      type: String,
      enum: ["everyone", "contacts", "nobody"],
      default: "everyone",
    },

    loginAlertsEnabled: {
      type: Boolean,
      default: true,
    },

    /** Read receipts */
    readReceiptsEnabled: {
      type: Boolean,
      default: true,
    },

    /** Typing indicators */
    typingIndicatorsEnabled: {
      type: Boolean,
      default: true,
    },

    /**
     * 2-step verification PIN
     */
    twoStepPinHash: {
      type: String,
      default: "",
      select: false,
    },

    twoStepEnabled: {
      type: Boolean,
      default: false,
    },

    /** Push notifications */
    pushNotificationsEnabled: {
      type: Boolean,
      default: true,
    },

    doNotDisturb: {
      type: Boolean,
      default: false,
    },

    notificationRules: {
      direct: {
        type: Boolean,
        default: true,
      },

      groups: {
        type: Boolean,
        default: true,
      },

      mentions: {
        type: Boolean,
        default: true,
      },

      sound: {
        type: Boolean,
        default: true,
      },
    },

    /** Web Push subscriptions */
    pushSubscriptions: {
      type: [
        {
          endpoint: { type: String, required: true },

          keys: {
            p256dh: { type: String, required: true },
            auth: { type: String, required: true },
          },
        },
      ],
      default: [],
    },

    /** Password reset */
    passwordResetTokenHash: {
      type: String,
      default: "",
      select: false,
    },

    passwordResetExpires: {
      type: Date,
      default: null,
      select: false,
    },

    /** E2E public key */
    e2ePublicKey: {
      type: String,
      default: "",
    },

    /** Optional phone */
    phone: {
      type: String,
      default: "",
      trim: true,
    },

    /** Contact discoverability */
    phoneDiscoverable: {
      type: Boolean,
      default: false,
    },

    /** Phone hash */
    phoneHash: {
      type: String,
      default: "",
      sparse: true,
    },

    /** Inbox management */
    mutedConversationIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Conversation" }],
      default: [],
    },

    archivedConversationIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Conversation" }],
      default: [],
    },

    hiddenConversationIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Conversation" }],
      default: [],
    },

    pinnedConversationIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Conversation" }],
      default: [],
    },

    /** Ignored users */
    ignoredUserIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },

    /** Sessions */
    sessions: {
      type: [
        {
          sessionId: {
            type: String,
            required: true,
          },

          label: {
            type: String,
            default: "",
          },

          userAgent: {
            type: String,
            default: "",
          },

          ip: {
            type: String,
            default: "",
          },

          createdAt: {
            type: Date,
            default: Date.now,
          },

          lastSeenAt: {
            type: Date,
            default: Date.now,
          },

          revokedAt: {
            type: Date,
            default: null,
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

UserSchema.index({ email: 1 }, { unique: true });

UserSchema.index(
  { username: 1 },
  {
    unique: true,
    sparse: true,
  },
);

UserSchema.index({ name: 1 });

UserSchema.index(
  { phoneHash: 1 },
  {
    sparse: true,
  },
);

UserSchema.index({
  phoneDiscoverable: 1,
  phoneHash: 1,
});

UserSchema.index({ isOnline: 1 });

// MongoDB cannot index two array fields in one compound index ("parallel arrays").
// Split networking discovery into separate indexes, one array field each.
UserSchema.index({
  networkingOpenToCollaborate: 1,
  networkingSkills: 1,
});

UserSchema.index({
  networkingOpenToCollaborate: 1,
  networkingInterests: 1,
});

UserSchema.index({ "sessions.sessionId": 1 });

const User = mongoose.model("User", UserSchema);

module.exports = User;
