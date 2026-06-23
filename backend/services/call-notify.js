const bus = require("./event-bus.js");
const { EVENTS } = require("./event-bus.js");

function resolveIO() {
  return require("../socket/index.js").getIO();
}

function emitCallsUpdated(payload) {
  const io = resolveIO();
  if (!io) return;
  io.emit("calls-updated", payload);
}

function startCallsNotify() {
  bus.subscribe(EVENTS.CALLS_UPDATED, (payload) => {
    emitCallsUpdated({
      kind: payload?.kind || "update",
      sessionId: payload?.sessionId || null,
      inviteId: payload?.inviteId || null,
      userId: payload?.userId || null,
    });
  });
}

function publishCallsUpdated({
  kind = "update",
  sessionId = null,
  inviteId = null,
  userId = null,
} = {}) {
  bus.publish(EVENTS.CALLS_UPDATED, { kind, sessionId, inviteId, userId });
}

module.exports = {
  startCallsNotify,
  publishCallsUpdated,
};
