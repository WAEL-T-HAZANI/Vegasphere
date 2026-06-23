const mongoose = require("mongoose");

const CallInviteSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },

    creatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    mode: {
      type: String,
      enum: ["audio", "video"],
      default: "audio",
    },

    title: {
      type: String,
      default: "",
      trim: true,
      maxlength: 120,
    },

    scheduledFor: {
      type: Date,
      default: null,
      index: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    reminderSentAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

// =========================
// Indexes
// =========================

// Token lookup
CallInviteSchema.index({
  token: 1,
});

// Conversation invites
CallInviteSchema.index({
  conversationId: 1,
  createdAt: -1,
});

// Creator invites
CallInviteSchema.index({
  creatorId: 1,
  createdAt: -1,
});

// Upcoming scheduled invites
CallInviteSchema.index({
  scheduledFor: 1,
  isActive: 1,
});

// Reminder scheduler
CallInviteSchema.index({
  reminderSentAt: 1,
  scheduledFor: 1,
});

// Active invite filtering
CallInviteSchema.index({
  isActive: 1,
  updatedAt: -1,
});

const CallInvite = mongoose.model("CallInvite", CallInviteSchema);

module.exports = CallInvite;
