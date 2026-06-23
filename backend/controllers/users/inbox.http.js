const { ApiError } = require("../../services/http-error.js");
const User = require("../../models/User.js");
const Conversation = require("../../models/Conversation.js");

const patchChatInbox = async (req, res) => {
    const { conversationId, action } = req.body || {};
    if (!conversationId || !action) {
      throw ApiError.badRequest("conversationId and action required");
    }
    const uid = req.user.id;
    const cid = conversationId;

    const conv = await Conversation.findById(cid).select("members");
    if (!conv?.members?.some((m) => String(m) === String(uid))) {
      throw ApiError.forbidden("Not a member of this conversation");
    }

    const u = async (update) =>
      User.findByIdAndUpdate(uid, update, { new: true }).select(
        "-password -phoneHash",
      );

    switch (String(action)) {
      case "pin":
        await u({ $addToSet: { pinnedConversationIds: cid } });
        break;
      case "unpin":
        await u({ $pull: { pinnedConversationIds: cid } });
        break;
      case "mute":
        await u({ $addToSet: { mutedConversationIds: cid } });
        break;
      case "unmute":
        await u({ $pull: { mutedConversationIds: cid } });
        break;
      case "archive":
        await u({ $addToSet: { archivedConversationIds: cid } });
        break;
      case "unarchive":
        await u({ $pull: { archivedConversationIds: cid } });
        break;
      case "hide":
        await u({ $addToSet: { hiddenConversationIds: cid } });
        break;
      case "show":
        await u({ $pull: { hiddenConversationIds: cid } });
        break;
      default:
        throw ApiError.badRequest("Unknown action");
    }
    const user = await User.findById(uid).select("-password -phoneHash");
    res.json(user);
  
};

const matchContacts = async (req, res) => {
    const hashes = req.body?.hashes;
    if (!Array.isArray(hashes) || hashes.length === 0) {
      return res.json([]);
    }
    const norm = [
      ...new Set(
        hashes.map((h) => String(h).trim().toLowerCase()).filter(Boolean),
      ),
    ].slice(0, 200);
    const users = await User.find({
      phoneDiscoverable: true,
      phoneHash: { $in: norm },
      _id: { $ne: req.user.id },
    })
      .select("name profilePic e2ePublicKey")
      .limit(100);
    res.json(users);
  
};

module.exports = {
  patchChatInbox,
  matchContacts,
};
