const { ApiError } = require("../../services/http-error.js");
const User = require("../../models/User.js");
const Conversation = require("../../models/Conversation.js");
const Message = require("../../models/Message.js");
const Status = require("../../models/Status.js");
const Notification = require("../../models/Notification.js");
const UserReport = require("../../models/UserReport.js");
const NetworkingPost = require("../../models/NetworkingPost.js");
const CallInvite = require("../../models/CallInvite.js");
const CallLog = require("../../models/CallLog.js");
const { removeLocalAvatarFile } = require("../../services/avatar-utils.js");

const deleteMyAccount = async (req, res) => {
  const userId = req.user?.id;
  if (!userId) throw ApiError.unauthorized("Unauthorized");
    const user = await User.findById(userId).select("profilePic");
    if (!user) throw ApiError.notFound("User not found");

    try {
      removeLocalAvatarFile(user.profilePic || "");
    } catch {
      /* ignore */
    }

    await Promise.all([
      Status.deleteMany({ userId }),
      Notification.deleteMany({
        $or: [{ recipientId: userId }, { actorId: userId }],
      }),
      UserReport.deleteMany({
        $or: [{ reporterId: userId }, { targetId: userId }],
      }),
      NetworkingPost.deleteMany({ authorId: userId }),
      Message.deleteMany({ senderId: userId }),
      CallInvite.deleteMany({ creatorId: userId }),
      CallLog.deleteMany({
        $or: [{ initiatorId: userId }, { participantIds: userId }],
      }),
    ]);

    await User.updateMany(
      {},
      {
        $pull: {
          blockedUsers: userId,
          ignoredUserIds: userId,
          pendingChatInvitesFrom: userId,
        },
      },
    );

    await Conversation.updateMany(
      {},
      {
        $pull: {
          members: userId,
          admins: userId,
          unreadCounts: { userId },
          e2eWrappedKeys: { userId },
          memberPermissionOverrides: { userId },
          bannedUsers: { userId },
          moderationLog: { actorId: userId },
        },
      },
    );

    await Conversation.deleteMany({
      $or: [{ members: { $size: 0 } }, { isSelfChat: true, members: userId }],
    });

    await User.deleteOne({ _id: userId });
    return res.json({ ok: true });
  
};

module.exports = {
  deleteMyAccount,
};
