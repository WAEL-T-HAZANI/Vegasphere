// backend/socket/handlers.js
//
// Socket layer responsibilities only: connection lifecycle, room membership,
// presence, heartbeat, and translating client ACKs into domain operations.
// All message persistence and fan-out lives in the controllers / services.

const Conversation = require("../models/Conversation.js");
const User = require("../models/User.js");

const presence = require("../services/presence-service.js");
const ackService = require("../services/ack-service.js");
const deliveryService = require("../services/delivery-service.js");
const liveLocation = require("../services/live-location.js");
const { noteCallSignal, canInitiateCallToUser } = require("../controllers/calls/index.js");
const registerMessageSocketHandlers = require("./message.handlers.js");

/** Throttle typing relays to cut socket noise. */
const TYPING_MIN_MS = 750;

module.exports = (io, socket) => {
  const currentUserId = socket.data?.userId || null;
  let setupCompleted = false;
  let lastTypingAt = 0;

  const conversationRoomsOf = async (userId) => {
    const conversations = await Conversation.find({
      members: { $in: [userId] },
    }).select("_id");
    return conversations.map((c) => String(c._id));
  };

  const broadcastPresence = async (eventName) => {
    if (!currentUserId) return;
    const rooms = await conversationRoomsOf(currentUserId);
    for (const room of rooms) {
      io.to(room).emit(eventName, { userId: currentUserId });
    }
  };

  const isMember = async (conversationId) => {
    if (!conversationId || !currentUserId) return false;
    const conv = await Conversation.findById(conversationId).select("members");
    return Boolean(conv?.members?.some((m) => String(m) === currentUserId));
  };

  // ---- Lifecycle -----------------------------------------------------------

  socket.on("setup", async () => {
    const id = currentUserId;
    if (!id) return;

    socket.join(id);
    socket.emit("user setup", id);

    if (setupCompleted) return;
    setupCompleted = true;

    try {
      const privacyRow = await User.findById(id).select(
        "typingIndicatorsEnabled showOnlineStatus showLastSeen",
      );
      socket.data.typingIndicatorsEnabled =
        privacyRow?.typingIndicatorsEnabled !== false;
      socket.data.showOnlineStatus = privacyRow?.showOnlineStatus !== false;
      socket.data.showLastSeen = privacyRow?.showLastSeen !== false;
    } catch {
      socket.data.typingIndicatorsEnabled = true;
      socket.data.showOnlineStatus = true;
      socket.data.showLastSeen = true;
    }

    const { firstConnection } = await presence.addSocket(id, socket.id);

    if (firstConnection) {
      await broadcastPresence("receiver-online");
    }

    // Offline sync (push side): replay anything missed while disconnected.
    deliveryService
      .flushUndeliveredForUser(id)
      .then((n) => {
        if (n > 0) socket.emit("sync-complete", { delivered: n });
      })
      .catch((e) => console.warn("offline flush:", e.message));
  });

  // ---- Heartbeat -----------------------------------------------------------

  socket.on("heartbeat", async () => {
    if (!currentUserId) return;
    await presence.touch(currentUserId, socket.id);
    socket.emit("heartbeat-ack", { at: Date.now() });
  });

  // ---- Rooms ---------------------------------------------------------------

  socket.on("join-chat", async (data) => {
    const { roomId } = data || {};
    if (!roomId || !currentUserId) return;
    if (!(await isMember(roomId))) return;
    socket.join(roomId);
    io.to(roomId).emit("user-joined-room", currentUserId);
  });

  socket.on("leave-chat", (room) => {
    if (room) socket.leave(room);
  });

  // ---- Typing indicators ---------------------------------------------------

  socket.on("typing", (data) => {
    if (socket.data?.typingIndicatorsEnabled === false) return;
    const roomId = data?.roomId || data?.conversationId;
    if (!roomId || !currentUserId) return;
    const now = Date.now();
    if (now - lastTypingAt < TYPING_MIN_MS) return;
    lastTypingAt = now;
    socket.to(roomId).emit("typing", {
      userId: currentUserId,
      roomId,
      conversationId: roomId,
    });
  });

  socket.on("stop-typing", (data) => {
    if (socket.data?.typingIndicatorsEnabled === false) return;
    const roomId = data?.roomId || data?.conversationId;
    if (!roomId || !currentUserId) return;
    socket.to(roomId).emit("stop-typing", {
      userId: currentUserId,
      roomId,
      conversationId: roomId,
    });
  });

  // ---- Delivery / read ACKs (decoupled into the ACK service) ---------------

  socket.on("message:delivered", async (data, cb) => {
    if (!currentUserId) return;
    const messageIds = Array.isArray(data?.messageIds)
      ? data.messageIds
      : data?.messageId
        ? [data.messageId]
        : [];
    const out = await ackService
      .markDelivered({ userId: currentUserId, messageIds })
      .catch(() => ({ delivered: [] }));
    if (typeof cb === "function") cb({ ok: true, delivered: out.delivered });
  });

  socket.on("message:read", async (data, cb) => {
    if (!currentUserId) return;
    const out = await ackService
      .markRead({
        userId: currentUserId,
        conversationId: data?.conversationId,
        messageIds: data?.messageIds,
      })
      .catch(() => ({ read: [] }));
    if (typeof cb === "function") cb({ ok: true, read: out.read });
  });

  // ---- WebRTC 1:1 signaling (relay only; media is peer-to-peer) ----------

  const relayToPeer = (event, payload) => {
    const to = String(payload?.to || "");
    if (!to || !currentUserId) return;
    io.to(to).emit(event, { ...payload, from: currentUserId });
  };

  socket.on("call:offer", async (payload) => {
    const targetId = String(payload?.to || "");
    if (
      targetId &&
      currentUserId &&
      !(await canInitiateCallToUser(currentUserId, targetId, {
        groupCall: Boolean(payload?.groupCall),
      }))
    ) {
      io.to(currentUserId).emit("call:busy", {
        from: targetId,
        to: currentUserId,
        conversationId: payload?.conversationId || null,
        callSessionId: payload?.callSessionId || null,
      });
      return;
    }
    relayToPeer("call:offer", payload);
    noteCallSignal({
      ...payload,
      from: currentUserId,
      type: "offer",
      callType: payload?.callType,
    }).catch(() => {});
  });

  socket.on("call:answer", async (payload) => {
    relayToPeer("call:answer", payload);
    noteCallSignal({
      ...payload,
      from: currentUserId,
      type: "answer",
      callType: payload?.callType,
    }).catch(() => {});
  });

  socket.on("call:ice-candidate", (payload) => {
    relayToPeer("call:ice-candidate", payload);
  });

  socket.on("call:decline", (payload) => {
    relayToPeer("call:decline", payload);
    noteCallSignal({
      ...payload,
      from: currentUserId,
      type: "call-decline",
    }).catch(() => {});
  });

  socket.on("call:hangup", (payload) => {
    relayToPeer("call:hangup", payload);
    noteCallSignal({
      ...payload,
      from: currentUserId,
      type: "call-hangup",
    }).catch(() => {});
  });

  socket.on("call:busy", (payload) => {
    relayToPeer("call:busy", payload);
  });

  // ---- Chat messages (persist + fan-out via delivery / direct emit) --------

  registerMessageSocketHandlers(io, socket);

  // ---- Live location (socket relay + in-memory active sessions) ------------

  socket.on("live-location:start", async (data) => {
    const roomId = String(data?.conversationId || "");
    if (!roomId || !currentUserId || !(await isMember(roomId))) return;
    const row = await liveLocation.start(currentUserId, roomId, {
      lat: data.lat,
      lng: data.lng,
      label: data.label,
      durationSec: data.durationSec,
    });
    io.to(roomId).emit("live-location:update", row);
  });

  socket.on("live-location:update", async (data) => {
    const roomId = String(data?.conversationId || "");
    if (!roomId || !currentUserId || !(await isMember(roomId))) return;
    const row = await liveLocation.update(
      currentUserId,
      roomId,
      data.lat,
      data.lng,
    );
    if (row) io.to(roomId).emit("live-location:update", row);
  });

  socket.on("live-location:stop", async (data) => {
    const roomId = String(data?.conversationId || "");
    if (!roomId || !currentUserId) return;
    await liveLocation.stop(currentUserId, roomId);
    io.to(roomId).emit("live-location:stop", {
      userId: currentUserId,
      conversationId: roomId,
    });
  });

  // ---- Disconnect ----------------------------------------------------------

  socket.on("disconnect", async () => {
    if (!currentUserId || !setupCompleted) return;
    const { lastConnection } = await presence.removeSocket(
      currentUserId,
      socket.id,
    );
    if (lastConnection) {
      await broadcastPresence("receiver-offline");
    }
  });
};
