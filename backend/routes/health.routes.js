const express = require("express");
const mongoose = require("mongoose");
const redisClient = require("../services/redis-client.js");
const { isReady } = require("../services/redis-factory.js");
const { ok } = require("../services/api-response.js");

const router = express.Router();

router.get("/health", (req, res) => {
  return ok(res, { status: "ok", uptimeSec: Math.floor(process.uptime()) });
});

router.get("/ready", async (req, res) => {
  const mongoReady = mongoose.connection.readyState === 1;
  const redisConfigured = Boolean(process.env.REDIS_URL);
  const redisReady = !redisConfigured || isReady(redisClient);

  const ready = mongoReady && redisReady;
  const data = {
    ready,
    checks: {
      mongo: mongoReady ? "up" : "down",
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
