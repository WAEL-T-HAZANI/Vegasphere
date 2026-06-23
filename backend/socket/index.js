// backend/socket/index.js

const { Server } = require("socket.io");
const { createAdapter } = require("@socket.io/redis-adapter");

const User = require("../models/User.js");
const registerHandlers = require("./handlers");
const { touchSession } = require("../services/session-auth.js");
const { verifyAccessToken } = require("../services/jwt-utils.js");
const { createRedisClient, waitForRedis } = require("../services/redis-factory.js");
const deliveryService = require("../services/delivery-service.js");
const { startStatusNotify } = require("../services/status-notify.js");
const { startNetworkingNotify } = require("../services/networking-notify.js");
const { startCallsNotify } = require("../services/call-notify.js");
const { PRESENCE_TTL_SEC } = require("../services/presence-service.js");
const { resolveCorsOrigin } = require("../config/env.js");

let io;

/**
 * Attach the Socket.io Redis adapter so room emits (`io.to(room).emit`) fan out
 * across every node in the cluster. Without REDIS_URL this is a no-op and the
 * server runs single-node. Pub and sub MUST be independent connections.
 */
function attachRedisAdapter(server) {
  const pubClient = createRedisClient();
  if (!pubClient) {
    console.log("Socket.io running single-node (no REDIS_URL; adapter disabled)");
    return;
  }

  waitForRedis(pubClient)
    .then(() => {
      const subClient = pubClient.duplicate();
      subClient.on("error", (err) =>
        console.warn("Socket.io sub adapter error:", err.message),
      );
      return waitForRedis(subClient).then(() => {
        server.adapter(createAdapter(pubClient, subClient));
        console.log(
          "Socket.io Redis adapter attached (multi-node fan-out enabled)",
        );
      });
    })
    .catch((e) => {
      console.warn(
        "Socket.io Redis adapter failed; single-node fallback:",
        e.message,
      );
      try {
        pubClient.disconnect();
      } catch {
        /* ignore */
      }
    });
}

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: resolveCorsOrigin(),
      methods: ["GET", "POST"],
      credentials: true,
    },
    // Heartbeat: server pings every 25s and drops a socket with no pong within 60s,
    // so half-open / crashed clients are reaped instead of lingering as "online".
    pingInterval: 25000,
    pingTimeout: 60000,
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000,
      skipMiddlewares: false,
    },
  });

  console.log("Socket.io initialized");

  attachRedisAdapter(io);

  // Delivery service consumes domain events and owns all message fan-out.
  deliveryService.start();
  startStatusNotify();
  startNetworkingNotify();
  startCallsNotify();

  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake?.auth?.token ||
        socket.handshake?.headers?.["auth-token"] ||
        socket.handshake?.headers?.authorization?.replace(/^Bearer\s+/i, "") ||
        "";

      if (!token) {
        return next(new Error("Authentication required"));
      }

      const data = verifyAccessToken(String(token));

      const sessionId = String(data?.sessionId || "");

      socket.data.user = data?.user || null;
      socket.data.userId = data?.user?.id ? String(data.user.id) : "";

      socket.data.sessionId = sessionId;

      if (!socket.data.userId || !sessionId) {
        return next(new Error("Authentication required"));
      }

      const user = await User.findById(socket.data.userId).select("sessions");

      const session = user?.sessions?.find(
        (row) => String(row.sessionId) === sessionId && !row.revokedAt,
      );

      if (!session) {
        return next(new Error("Authentication required"));
      }

      touchSession(socket.data.userId, sessionId, {
        headers: socket.handshake?.headers || {},
        socket: {
          remoteAddress: socket.handshake?.address || "",
        },
      }).catch(() => {});

      return next();
    } catch {
      return next(new Error("Authentication required"));
    }
  });

  io.on("connection", (socket) => {
    console.log(
      `New connection: ${socket.id} (${socket.data.userId || "anon"})`,
    );

    registerHandlers(io, socket);
  });

  return io;
};

const getIO = () => io;

module.exports = {
  initSocket,
  getIO,
  PRESENCE_TTL_SEC,
};
