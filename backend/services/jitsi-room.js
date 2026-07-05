const crypto = require("crypto");
const { JWT_SECRET } = require("../config/env.js");

function buildJitsiRoomName(conversationId, isGroup = false) {
  const cid = String(conversationId || "").trim();
  if (!cid) return "";
  const secret = String(JWT_SECRET || "").trim() || "vegasphere-dev-jitsi-secret";
  const prefix = isGroup ? "vegasphere-g" : "vegasphere-d";
  const hash = crypto
    .createHash("sha256")
    .update(`${secret}:jitsi:${cid}`)
    .digest("hex")
    .slice(0, 28);
  return `${prefix}-${hash}`;
}

module.exports = { buildJitsiRoomName };
