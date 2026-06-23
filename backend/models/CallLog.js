const mongoose = require("mongoose");

const CallLogSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      default: null,
      index: true,
    },

    initiatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    participantIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],

    mode: {
      type: String,
      enum: ["audio", "video"],
      default: "audio",
    },

    groupCall: {
      type: Boolean,
      default: false,
    },

    status: {
      type: String,
      enum: [
        "ringing",
        "active",
        "completed",
        "missed",
        "declined",
        "cancelled",
      ],
      default: "ringing",
      index: true,
    },

    answeredAt: {
      type: Date,
      default: null,
    },

    answeredByIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    endedAt: {
      type: Date,
      default: null,
    },

    endedById: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    durationSec: {
      type: Number,
      default: 0,
      min: 0,
    },

    lastSignalAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

// =========================
// Indexes
// =========================

// Main session lookup
CallLogSchema.index({
  sessionId: 1,
});

// User call history
CallLogSchema.index({
  participantIds: 1,
  createdAt: -1,
});

// Conversation call history
CallLogSchema.index({
  conversationId: 1,
  createdAt: -1,
});

// Initiator history
CallLogSchema.index({
  initiatorId: 1,
  createdAt: -1,
});

// Active/ringing call tracking
CallLogSchema.index({
  status: 1,
  updatedAt: -1,
});

// Cleanup / stale call detection
CallLogSchema.index({
  lastSignalAt: 1,
});

const CallLog = mongoose.model("CallLog", CallLogSchema);

module.exports = CallLog;
