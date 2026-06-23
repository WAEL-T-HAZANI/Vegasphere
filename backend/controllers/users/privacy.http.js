const mongoose = require("mongoose");
const { ApiError } = require("../../services/http-error.js");
const User = require("../../models/User.js");
const UserReport = require("../../models/UserReport.js");

const reportUser = async (req, res) => {
  const targetId = String(req.params.id || "").trim();
  if (!mongoose.Types.ObjectId.isValid(targetId)) {
    throw ApiError.badRequest("Invalid user id");
  }
  if (targetId === String(req.user.id)) {
    throw ApiError.badRequest("Cannot report yourself");
  }
  const target = await User.findById(targetId).select("_id");
  if (!target) throw ApiError.notFound("User not found");

  const reason = String(req.body?.reason || "")
    .trim()
    .slice(0, 500);
  if (reason.length < 4) {
    throw ApiError.badRequest("Please describe the issue (min 4 characters)");
  }

  await UserReport.create({
    reporterId: req.user.id,
    targetId,
    reason,
  });
  res.status(201).json({ ok: true });
};

module.exports = {
  reportUser,
};
