function resolveIO() {
  return require("../socket/index.js").getIO();
}

function emitProfileUpdated(userId, payload = {}) {
  const io = resolveIO();
  if (!io || !userId) return;
  io.to(String(userId)).emit("profile-updated", {
    userId: String(userId),
    profilePic: payload.profilePic || "",
    name: payload.name || "",
    at: new Date().toISOString(),
  });
}

module.exports = {
  emitProfileUpdated,
};
