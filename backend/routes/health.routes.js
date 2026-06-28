const express = require("express");
const mongoose = require("mongoose");
const redisClient = require("../services/redis-client.js");
const { isReady } = require("../services/redis-factory.js");
const { ok } = require("../services/api-response.js");
const {
  isMailConfigured,
  verifyMailConnection,
  getMailHealth,
} = require("../services/mailer.js");
const { isPushConfigured } = require("../services/push-notify.js");
const { isEnvTruthy } = require("../config/env.js");
const router = express.Router();

router.get("/health", (req, res) => {
  return ok(res, { status: "ok", uptimeSec: Math.floor(process.uptime()) });
});

const HEALTH_PROBE_COLLECTION = "_vegasphere_health";

router.get("/ready", async (req, res) => {
  const mongoReady = mongoose.connection.readyState === 1;
  const redisConfigured = Boolean(process.env.REDIS_URL);
  const redisReady = !redisConfigured || isReady(redisClient);

  let mongoWrite = "skipped";
  if (mongoReady) {
    try {
      await mongoose.connection
        .collection(HEALTH_PROBE_COLLECTION)
        .updateOne(
          { _id: "probe" },
          { $set: { checkedAt: new Date() } },
          { upsert: true },
        );
      mongoWrite = "up";
    } catch (error) {
      mongoWrite = "down";
      console.warn("MongoDB write probe failed:", error.message);
    }
  }

  let smtp = "skipped";
  let mailProvider = "skipped";
  if (isMailConfigured()) {
    try {
      const verified = await verifyMailConnection();
      smtp = "up";
      mailProvider = verified?.provider || getMailHealth().provider || "smtp";
    } catch (error) {
      smtp = "down";
      console.warn("Mail ready probe failed:", error.message);
    }
  }

  const vapid = isPushConfigured() ? "configured" : "skipped";

  const ready = mongoReady && mongoWrite === "up" && redisReady;
  const data = {
    ready,
    checks: {
      mongo: mongoReady ? "up" : "down",
      mongoWrite,
      smtp,
      mailProvider,
      vapid,
      passwordResetDebug: isEnvTruthy(process.env.PASSWORD_RESET_DEBUG)
        ? "on"
        : "off",
      redis: redisConfigured ? (redisReady ? "up" : "down") : "skipped",
    },
  };
  if (!ready) {
    return res.status(503).json({
      success: false,
      message: "Service not ready",
      details: data.checks,
    });
  }
  return ok(res, data);
});

module.exports = router;
