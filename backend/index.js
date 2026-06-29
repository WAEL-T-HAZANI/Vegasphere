require("dotenv").config({
  path: require("path").resolve(__dirname, ".env"),
});

const express = require("express");
const cors = require("cors");
const http = require("http");
const path = require("path");

const connectDB = require("./database.js");
const { disconnectDB } = require("./database.js");
const { initSocket, getIO } = require("./socket/index.js");
const redisClient = require("./services/redis-client.js");
const startSchedulers = require("./schedulers.js");
const errorHandler = require("./middleware/error_handler.js");
const requestId = require("./middleware/request_id.js");
const rateLimit = require("./middleware/rate_limit.js");
const uploadDownloadAttachment = require("./middleware/upload_download.js");
const { getUploadBase } = require("./services/upload-base.js");
const {
  resolveCorsOrigin,
  JSON_BODY_LIMIT,
  URLENCODED_BODY_LIMIT,
  TRUST_PROXY,
} = require("./config/env.js");
const { buildHelmetMiddleware } = require("./config/helmet.js");
const { getMailStatusLine, warmUpSmtp } = require("./services/mailer.js");

const PORT = process.env.PORT || 5500;

const app = express();

if (TRUST_PROXY) {
  app.set("trust proxy", 1);
}

app.use(requestId);
app.use(rateLimit);

app.use(buildHelmetMiddleware());

app.use(
  cors({
    origin: resolveCorsOrigin(),
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "auth-token",
      "Authorization",
      "X-Requested-With",
      "X-Request-Id",
    ],
  }),
);

app.use(express.urlencoded({ extended: true, limit: URLENCODED_BODY_LIMIT }));
app.use(express.json({ limit: JSON_BODY_LIMIT }));

app.use(
  "/uploads",
  uploadDownloadAttachment,
  express.static(path.resolve(getUploadBase()), {
    maxAge: "7d",
    fallthrough: false,
  }),
);

if (redisClient) {
  redisClient.on("error", (err) => {
    console.warn("Redis connection error:", err.message);
  });
}

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Vegasphere backend running",
    data: null,
  });
});

app.use("/", require("./routes/health.routes.js"));
app.use("/auth", require("./routes/auth.routes.js"));
app.use("/user", require("./routes/user.routes.js"));
app.use("/message", require("./routes/message.routes.js"));
app.use("/conversation", require("./routes/conversation.routes.js"));
app.use("/join", require("./routes/join.routes.js"));
app.use("/search", require("./routes/search.routes.js"));
app.use("/utility", require("./routes/utility.routes.js"));
app.use("/status", require("./routes/status.routes.js"));
app.use("/ai", require("./routes/ai.routes.js"));
app.use("/calls", require("./routes/call.routes.js"));
app.use("/networking", require("./routes/networking.routes.js"));

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    details: {
      method: req.method,
      path: req.originalUrl,
    },
  });
});

app.use(errorHandler);

const server = http.createServer(app);

initSocket(server);

let schedulersStarted = false;

async function shutdown(signal) {
  console.log(`${signal} received — shutting down gracefully`);
  server.close(async () => {
    try {
      const io = getIO?.();
      io?.close?.();
    } catch {
      /* ignore */
    }
    try {
      if (redisClient) await redisClient.quit();
    } catch {
      /* ignore */
    }
    try {
      await disconnectDB();
    } catch {
      /* ignore */
    }
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

async function start() {
  console.log(getMailStatusLine());
  const { ensureVegaDict } = require("./scripts/ensure-vega-dict.js");
  const dictResult = await ensureVegaDict();
  if (dictResult.ok) {
    const mb = ((dictResult.bytes || 0) / 1024 / 1024).toFixed(1);
    const at = dictResult.path ? ` @ ${dictResult.path}` : "";
    console.log(`[ai] vega-dict.db ready (${dictResult.source}, ${mb} MB${at})`);
  } else {
    console.warn(
      `[ai] vega-dict.db not loaded (${dictResult.source}) — using JSON fallbacks. ${dictResult.message || ""}`.trim(),
    );
  }
  await connectDB();
  await warmUpSmtp();
  if (!schedulersStarted) {
    startSchedulers();
    schedulersStarted = true;
  }

  server.listen(PORT, () => {
    console.log(`🚀 Server started at http://localhost:${PORT}`);
  });
}

start().catch((error) => {
  console.error("Failed to start server:", error.message);
  process.exit(1);
});
