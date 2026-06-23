const bus = require("./event-bus.js");
const { EVENTS } = require("./event-bus.js");

function resolveIO() {
  return require("../socket/index.js").getIO();
}

function emitNetworkingUpdated(payload) {
  const io = resolveIO();
  if (!io) return;
  io.emit("networking-updated", payload);
}

function startNetworkingNotify() {
  bus.subscribe(EVENTS.NETWORKING_UPDATED, (payload) => {
    emitNetworkingUpdated({
      kind: payload?.kind || "update",
      postId: payload?.postId || null,
      userId: payload?.userId || null,
    });
  });
}

function publishNetworkingUpdated({ kind = "update", postId = null, userId = null }) {
  bus.publish(EVENTS.NETWORKING_UPDATED, { kind, postId, userId });
}

module.exports = {
  startNetworkingNotify,
  publishNetworkingUpdated,
};
