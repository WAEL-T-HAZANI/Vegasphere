const { ApiError } = require("../../services/http-error.js");
const User = require("../../models/User.js");
const Conversation = require("../../models/Conversation.js");
const {
  createChatInviteNotification,
  resolveChatInviteNotifications,
} = require("../../services/notification-service.js");

const sendChatInvite = async (req, res) => {
    const targetId = req.params.id;
    const fromId = req.user.id;
    if (targetId === fromId) {
      throw ApiError.badRequest("Cannot invite yourself");
    }
    const [target, me] = await Promise.all([
      User.findById(targetId),
      User.findById(fromId),
    ]);
    if (!target || !me)
      throw ApiError.notFound("User not found");
    if (
      target.blockedUsers?.some((b) => b.toString() === fromId) ||
      me.blockedUsers?.some((b) => b.toString() === targetId)
    ) {
      throw ApiError.forbidden("Blocked");
    }
    const updateResult = await User.updateOne({
      _id: targetId,
      pendingChatInvitesFrom: { $ne: fromId },
    }, {
      $addToSet: { pendingChatInvitesFrom: fromId },
    });
    if (updateResult.modifiedCount > 0) {
      await createChatInviteNotification({
        recipientId: targetId,
        actorId: fromId,
      });
    }
    res.json({ ok: true });
  
};

const listIncomingInvites = async (req, res) => {
    const user = await User.findById(req.user.id).populate(
      "pendingChatInvitesFrom",
      "-password",
    );
    res.json(user?.pendingChatInvitesFrom || []);
  
};

const acceptChatInvite = async (req, res) => {
    const fromId = req.params.fromUserId;
    const myId = req.user.id;
    if (fromId === myId) {
      throw ApiError.badRequest("Invalid invite");
    }
    await User.findByIdAndUpdate(myId, {
      $pull: { pendingChatInvitesFrom: fromId },
    });
    await resolveChatInviteNotifications({
      recipientId: myId,
      actorId: fromId,
      status: "accepted",
    });

    const conv = await Conversation.findOne({
      isGroup: { $ne: true },
      isChannel: { $ne: true },
      members: { $all: [myId, fromId] },
      $expr: { $eq: [{ $size: "$members" }, 2] },
    }).populate("members", "-password");

    if (conv) {
      return res.status(200).json(conv);
    }

    const memberIds = [myId, fromId];
    const newConversation = await Conversation.create({
      members: memberIds,
      unreadCounts: memberIds.map((memberId) => ({
        userId: memberId,
        count: 0,
      })),
    });
    await newConversation.populate("members", "-password");
    return res.status(200).json(newConversation);
  
};

const declineChatInvite = async (req, res) => {
    const fromId = req.params.fromUserId;
    await User.findByIdAndUpdate(req.user.id, {
      $pull: { pendingChatInvitesFrom: fromId },
    });
    await resolveChatInviteNotifications({
      recipientId: req.user.id,
      actorId: fromId,
      status: "declined",
    });
    res.json({ ok: true });
  
};

module.exports = {
  sendChatInvite,
  listIncomingInvites,
  acceptChatInvite,
  declineChatInvite,
};
