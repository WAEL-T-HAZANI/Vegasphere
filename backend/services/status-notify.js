const bus = require("./event-bus.js");
const { EVENTS } = require("./event-bus.js");

function resolveIO() {
  return require("../socket/index.js").getIO();
}

function emitStatusUpdated(userIds, payload) {
  const io = resolveIO();
  if (!io) return;
  const ids = [...new Set((Array.isArray(userIds) ? userIds : [userIds]).map(String))]
    .filter(Boolean);
  for (const id of ids) {
    io.to(id).emit("status-updated", payload);
  }
}

function startStatusNotify() {
  bus.subscribe(EVENTS.STATUS_UPDATED, (payload) => {
    const notifyIds = Array.isArray(payload?.notifyUserIds)
      ? payload.notifyUserIds
      : [];
    if (!notifyIds.length) return;
    emitStatusUpdated(notifyIds, {
      statusId: payload?.statusId || null,
      ownerId: payload?.ownerId || null,
      kind: payload?.kind || "update",
    });
  });
}

function publishStatusUpdated({ ownerId, statusId, kind, peerIds = [] }) {
  const notifyUserIds = [
    String(ownerId || ""),
    ...peerIds.map(String),
  ].filter(Boolean);
  bus.publish(EVENTS.STATUS_UPDATED, {
    ownerId,
    statusId,
    kind,
    notifyUserIds: [...new Set(notifyUserIds)],
  });
}

module.exports = {
  startStatusNotify,
  publishStatusUpdated,
};
