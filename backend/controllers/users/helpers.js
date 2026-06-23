const Conversation = require("../../models/Conversation.js");
const User = require("../../models/User.js");
const { ApiError } = require("../../services/http-error.js");

const VISIBILITY_FIELDS = {
  lastSeen: "lastSeenVisibility",
  profilePhoto: "profilePhotoVisibility",
  online: "onlineVisibility",
  about: "aboutVisibility",
  calls: "callPrivacy",
  search: "searchDiscoverable",
};

function normalizeVisibility(value, fallback = "everyone") {
  const v = String(value || fallback).toLowerCase();
  if (v === "everyone" || v === "contacts" || v === "nobody") return v;
  return fallback;
}

function legacyOnlineVisibility(user) {
  if (user?.onlineVisibility) return normalizeVisibility(user.onlineVisibility);
  return user?.showOnlineStatus === false ? "nobody" : "everyone";
}

function legacyLastSeenVisibility(user) {
  if (user?.lastSeenVisibility) return normalizeVisibility(user.lastSeenVisibility);
  return user?.showLastSeen === false ? "nobody" : "everyone";
}

async function areUsersDirectContacts(viewerId, targetId) {
  const viewer = String(viewerId || "");
  const target = String(targetId || "");
  if (!viewer || !target) return false;
  if (viewer === target) return true;

  const row = await Conversation.findOne({
    isGroup: { $ne: true },
    isChannel: { $ne: true },
    isSelfChat: { $ne: true },
    members: { $all: [viewer, target] },
    $expr: { $eq: [{ $size: "$members" }, 2] },
  })
    .select("_id")
    .lean();

  return Boolean(row);
}

async function visibilityAllows(viewerId, targetUser, visibility) {
  const v = normalizeVisibility(visibility);
  if (v === "nobody") return false;
  if (v === "everyone") return true;
  return areUsersDirectContacts(
    viewerId,
    String(targetUser?._id || targetUser?.id || ""),
  );
}

/**
 * Whether `viewerId` may see a privacy-gated field on `targetUser`.
 * field: lastSeen | profilePhoto | online | about | calls | search
 */
async function canViewerSeeUserField(viewerId, targetUser, field) {
  const targetId = String(targetUser?._id || targetUser?.id || "");
  const viewer = String(viewerId || "");
  if (!targetId) return false;
  if (!viewer || viewer === targetId) return true;

  if (field === "lastSeen" && targetUser?.showLastSeen === false) {
    return false;
  }
  if (field === "online" && targetUser?.showOnlineStatus === false) {
    return false;
  }

  const visibilityKey = VISIBILITY_FIELDS[field];
  let visibility = targetUser?.[visibilityKey];
  if (field === "online") visibility = visibility || legacyOnlineVisibility(targetUser);
  if (field === "lastSeen") visibility = visibility || legacyLastSeenVisibility(targetUser);

  return visibilityAllows(viewer, targetUser, visibility);
}

function applyPresencePrivacy(viewerId, user, options = {}) {
  const isSelf = String(viewerId || "") === String(user?._id || user?.id || "");
  const { lastSeenVisible = true, onlineVisible = true } = options;
  const showOnline =
    isSelf || (user?.showOnlineStatus !== false && onlineVisible !== false);
  const showLastSeen =
    isSelf || (user?.showLastSeen !== false && lastSeenVisible !== false);
  return {
    isOnline: showOnline ? Boolean(user?.isOnline) : false,
    showOnlineStatus: user?.showOnlineStatus !== false,
    showLastSeen: user?.showLastSeen !== false,
    lastSeen: showLastSeen ? user?.lastSeen || null : null,
  };
}

/** @deprecated Use canViewerSeeUserField for viewer-aware checks. */
function shouldShowPublicField(visibility) {
  const v = String(visibility || "everyone").toLowerCase();
  return v !== "nobody";
}

async function assertGroupAddsAllowed(actorId, targetIds) {
  const uid = String(actorId || "");
  const ids = [...new Set((targetIds || []).map(String).filter(Boolean))].filter(
    (id) => id !== uid,
  );
  if (!ids.length) return;

  const targets = await User.find({ _id: { $in: ids } }).select(
    "_id groupAddPermission name",
  );

  const nobody = targets.filter((u) => String(u.groupAddPermission) === "nobody");
  if (nobody.length) {
    throw ApiError.forbidden("Some users do not allow group adds", {
      blockedIds: nobody.map((u) => String(u._id)),
    });
  }

  const requiresContact = targets
    .filter((u) => String(u.groupAddPermission) === "contacts")
    .map((u) => String(u._id));
  if (!requiresContact.length) return;

  const directConvs = await Conversation.find({
    isGroup: { $ne: true },
    isChannel: { $ne: true },
    members: { $all: [uid], $in: requiresContact },
    $expr: { $eq: [{ $size: "$members" }, 2] },
  }).select("members");

  const allowed = new Set();
  for (const c of directConvs) {
    const other = (c.members || []).map(String).find((id) => id !== uid);
    if (other) allowed.add(other);
  }
  const blockedAdds = requiresContact.filter((id) => !allowed.has(id));
  if (blockedAdds.length) {
    throw ApiError.forbidden("Some users only allow group adds by contacts", {
      blockedIds: blockedAdds,
    });
  }
}

async function filterDiscoverableUsers(viewerId, users) {
  const out = [];
  for (const user of users || []) {
    if (await canViewerSeeUserField(viewerId, user, "search")) {
      out.push(user);
    }
  }
  return out;
}

module.exports = {
  applyPresencePrivacy,
  shouldShowPublicField,
  areUsersDirectContacts,
  canViewerSeeUserField,
  assertGroupAddsAllowed,
  filterDiscoverableUsers,
  normalizeVisibility,
  legacyOnlineVisibility,
  legacyLastSeenVisibility,
};
