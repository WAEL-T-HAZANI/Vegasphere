const mongoose = require("mongoose");
const { ApiError } = require("../../services/http-error.js");
const User = require("../../models/User.js");
const UserReport = require("../../models/UserReport.js");
const { sendUserReportEmail } = require("../../services/mailer.js");

const reportUser = async (req, res) => {
  const targetId = String(req.params.id || "").trim();
  if (!mongoose.Types.ObjectId.isValid(targetId)) {
    throw ApiError.badRequest("Invalid user id");
  }
  if (targetId === String(req.user.id)) {
    throw ApiError.badRequest("Cannot report yourself");
  }
  const [target, reporter] = await Promise.all([
    User.findById(targetId).select("_id name email username"),
    User.findById(req.user.id).select("name email"),
  ]);
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

  try {
    await sendUserReportEmail({
      reporterName: reporter?.name,
      reporterEmail: reporter?.email,
      targetName: target?.name || target?.username,
      targetEmail: target?.email,
      reason,
    });
  } catch (err) {
    console.warn("sendUserReportEmail failed:", err?.message || err);
  }

  const adminRouted = Boolean(
    String(
      process.env.REPORT_ADMIN_EMAIL ||
        process.env.SMTP_USER ||
        "wael.t.hazani@gmail.com",
    ).trim(),
  );
  res.status(201).json({ ok: true, adminNotified: adminRouted });
};

module.exports = {
  reportUser,
};
