const User = require("../models/User.js");
const { touchSession } = require("../services/session-auth.js");
const { verifyAccessToken } = require("../services/jwt-utils.js");
const { ApiError } = require("../services/http-error.js");

const fetchuser = async (req, res, next) => {
  const token = req.header("auth-token");

  if (!token) {
    return next(
      ApiError.unauthorized("Please authenticate using a valid token"),
    );
  }

  try {
    const data = verifyAccessToken(token);

    const sessionId = String(data?.sessionId || "");
    const userId = String(data?.user?.id || "");

    if (!userId || !sessionId) {
      return next(
        ApiError.unauthorized("Please authenticate using a valid token"),
      );
    }

    const user = await User.findById(userId).select("sessions");

    const session = user?.sessions?.find(
      (row) => String(row.sessionId) === sessionId && !row.revokedAt,
    );

    if (!session) {
      return next(
        ApiError.unauthorized("Please authenticate using a valid token"),
      );
    }

    req.user = data.user;
    req.sessionId = sessionId;

    touchSession(userId, sessionId, req).catch(() => {});

    return next();
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return next(
        ApiError.unauthorized("Please authenticate using a valid token"),
      );
    }
    return next(error);
  }
};

module.exports = fetchuser;
