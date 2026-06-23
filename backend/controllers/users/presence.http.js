const User = require("../../models/User.js");
const redisClient = require("../../services/redis-client.js");
const {
  applyPresencePrivacy,
  canViewerSeeUserField,
} = require("./helpers.js");

const getPresenceBatch = async (req, res) => {
  const raw = (req.query.ids || "").trim();
  if (!raw) return res.json({});
  const ids = [...new Set(raw.split(/[\s,]+/).filter(Boolean))].slice(0, 80);
  const users = await User.find({ _id: { $in: ids } }).select(
    "isOnline lastSeen showOnlineStatus showLastSeen lastSeenVisibility onlineVisibility",
  );
  const out = {};
  let redisVals = null;
  if (redisClient && ids.length) {
    try {
      const keys = ids.map((id) => `presence:${id}`);
      redisVals = await redisClient.mget(...keys);
    } catch {
      redisVals = null;
    }
  }
  const viewerId = req.user?.id;
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    try {
      const u = users.find((x) => x._id.toString() === id);
      const redisHit =
        redisVals && redisVals[i] !== null && redisVals[i] !== undefined;
      let online = Boolean(redisHit);
      if (u && u.showOnlineStatus !== false) {
        online = Boolean(redisHit || u.isOnline);
      } else if (u && u.showOnlineStatus === false) {
        online = false;
      }
      const onlineVisible = u
        ? await canViewerSeeUserField(viewerId, u, "online")
        : false;
      if (!onlineVisible) online = false;

      const lastSeenVisible = u
        ? await canViewerSeeUserField(viewerId, u, "lastSeen")
        : false;

      const privacy = applyPresencePrivacy(
        viewerId,
        {
          ...u?.toObject?.(),
          _id: u?._id,
          isOnline: online,
          lastSeen: u?.lastSeen ?? null,
          showOnlineStatus: u?.showOnlineStatus,
          showLastSeen: u?.showLastSeen,
        },
        { lastSeenVisible, onlineVisible },
      );

      out[id] = {
        online: privacy.isOnline,
        lastSeen: privacy.lastSeen,
      };
    } catch (err) {
      console.warn(`presence batch id=${id}:`, err.message);
      out[id] = { online: false, lastSeen: null };
    }
  }
  res.json(out);
};

module.exports = {
  getPresenceBatch,
};
