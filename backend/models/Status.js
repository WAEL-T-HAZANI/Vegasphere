const mongoose = require("mongoose");

/** Ephemeral status update (WhatsApp-style “Status”); default 24h TTL in API. */
const StatusSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    text: {
      type: String,
      default: "",
      maxlength: 280,
    },

    imageUrl: {
      type: String,
      default: "",
      maxlength: 2000,
    },

    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },

    viewers: {
      type: [
        {
          userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
          },
          viewedAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },

    reactions: {
      type: [
        {
          emoji: { type: String, required: true },
          userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
          },
        },
      ],
      default: [],
    },

    replies: {
      type: [
        {
          userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
          },
          text: { type: String, maxlength: 500, default: "" },
          createdAt: { type: Date, default: Date.now },
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

// Auto-delete expired statuses
StatusSchema.index(
  { expiresAt: 1 },
  {
    expireAfterSeconds: 0,
  },
);

// Fast status feed queries
StatusSchema.index({
  userId: 1,
  createdAt: -1,
});

// Fast cleanup / expiration checks
StatusSchema.index({
  expiresAt: 1,
  createdAt: -1,
});

module.exports = mongoose.model("Status", StatusSchema);
