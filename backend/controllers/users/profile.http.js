const { ApiError } = require("../../services/http-error.js");
const User = require("../../models/User.js");
const {
  avatarUploadPrefix,
  buildAbsoluteAssetUrl,
  defaultAvatarUrl,
  removeStoredAvatarFile,
} = require("../../services/avatar-utils.js");
const { publishLocalUpload } = require("../../services/object-storage.js");
const {
  applyPresencePrivacy,
  canViewerSeeUserField,
} = require("./helpers.js");

const getPublicProfile = async (req, res) => {
    const targetId = String(req.params.id || "").trim();
    if (!targetId) throw ApiError.badRequest("User id required");

    const viewerId = req.user?.id;
    const [target, viewer] = await Promise.all([
      User.findById(targetId).select(
        "name username about email profilePic isOnline lastSeen showOnlineStatus showLastSeen lastSeenVisibility onlineVisibility profilePhotoVisibility aboutVisibility callPrivacy searchDiscoverable blockedUsers createdAt",
      ),
      viewerId ? User.findById(viewerId).select("blockedUsers") : null,
    ]);
    if (!target) throw ApiError.notFound("User not found");

    const targetBlocksViewer = (target.blockedUsers || []).some(
      (b) => String(b) === String(viewerId),
    );
    const viewerBlocksTarget = (viewer?.blockedUsers || []).some(
      (b) => String(b) === String(targetId),
    );
    if (targetBlocksViewer || viewerBlocksTarget) {
      throw ApiError.forbidden("Blocked");
    }

    const photoAllowed = await canViewerSeeUserField(
      viewerId,
      target,
      "profilePhoto",
    );
    const lastSeenVisible = await canViewerSeeUserField(
      viewerId,
      target,
      "lastSeen",
    );
    const aboutAllowed = await canViewerSeeUserField(viewerId, target, "about");
    const presence = applyPresencePrivacy(viewerId, target.toObject(), {
      lastSeenVisible,
      onlineVisible: await canViewerSeeUserField(viewerId, target, "online"),
    });

    return res.json({
      _id: target._id,
      name: target.name,
      username: target.username || "",
      about: aboutAllowed ? target.about || "" : "",
      profilePic: photoAllowed
        ? target.profilePic || ""
        : defaultAvatarUrl(target.name),
      presence: {
        online: presence.isOnline,
        lastSeen: presence.lastSeen,
      },
      createdAt: target.createdAt,
    });
  
};

const getOnlineStatus = async (req, res) => {
  const userId = req.params.id;
  const user = await User.findById(userId);
  if (!user) {
    throw ApiError.notFound("User not found");
  }
  const lastSeenVisible = await canViewerSeeUserField(
    req.user?.id,
    user,
    "lastSeen",
  );
  res.status(200).json(
    applyPresencePrivacy(req.user?.id, user, {
      lastSeenVisible,
      onlineVisible: await canViewerSeeUserField(req.user?.id, user, "online"),
    }),
  );
};

const uploadAvatar = async (req, res) => {
    const user = await User.findById(req.user.id).select("name profilePic");
    if (!user) {
      throw ApiError.notFound("User not found");
    }
    if (!req.file) {
      throw ApiError.badRequest("avatar file required");
    }
    const relUrl = `${avatarUploadPrefix}${req.file.filename}`;
    const localPath = req.file.path;
    const previous = user.profilePic || "";
    const cloudUrl = await publishLocalUpload(
      localPath,
      relUrl,
      req.file.mimetype,
    );
    const absoluteUrl = cloudUrl || buildAbsoluteAssetUrl(req, relUrl);
    user.profilePic = absoluteUrl;
    await user.save();
    if (previous && previous !== absoluteUrl) {
      await removeStoredAvatarFile(previous);
    }
    return res.status(201).json({
      ok: true,
      url: absoluteUrl,
      relativeUrl: cloudUrl ? absoluteUrl : relUrl,
    });
  
};

const removeAvatar = async (req, res) => {
    const user = await User.findById(req.user.id).select("name profilePic");
    if (!user) {
      throw ApiError.notFound("User not found");
    }
    const previous = user.profilePic || "";
    const fallback = defaultAvatarUrl(user.name);
    user.profilePic = fallback;
    await user.save();
    if (previous && previous !== fallback) {
      await removeStoredAvatarFile(previous);
    }
    return res.json({ ok: true, url: fallback });
  
};

module.exports = {
  getPublicProfile,
  getOnlineStatus,
  uploadAvatar,
  removeAvatar,
};
