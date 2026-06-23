const mongoose = require("mongoose");

const NetworkingPostSchema = new mongoose.Schema(
  {
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    summary: {
      type: String,
      required: true,
      trim: true,
      maxlength: 360,
    },

    tags: {
      type: [String],
      default: [],
      set: (items) =>
        Array.from(
          new Set(
            (Array.isArray(items) ? items : [])
              .map((item) => String(item || "").trim().toLowerCase())
              .filter(Boolean)
              .slice(0, 12),
          ),
        ),
    },

    roleNeeded: {
      type: String,
      default: "",
      trim: true,
      maxlength: 80,
    },

    status: {
      type: String,
      enum: ["open", "closed"],
      default: "open",
      index: true,
    },

    interestedUserIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },
  },
  { timestamps: true },
);

NetworkingPostSchema.index({ tags: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model("NetworkingPost", NetworkingPostSchema);
