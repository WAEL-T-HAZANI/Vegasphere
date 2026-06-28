const { ApiError } = require("../../services/http-error.js");
const User = require("../../models/User.js");

const blockUser = async (req, res) => {
  const userId = req.user.id;
  const targetId = req.params.id;
    if (userId === targetId) {
      throw ApiError.badRequest("Cannot block yourself");
    }
    const user = await User.findByIdAndUpdate(
      userId,
      {
        $addToSet: { blockedUsers: targetId },
        $pull: { ignoredUserIds: targetId },
      },
      { new: true, runValidators: false },
    );
    if (!user) {
      throw ApiError.notFound("User not found");
    }
    res.status(200).json({ blockedUsers: user.blockedUsers || [] });
  
};

const unblockUser = async (req, res) => {
  const userId = req.user.id;
  const targetId = req.params.id;
    const user = await User.findByIdAndUpdate(
      userId,
      { $pull: { blockedUsers: targetId } },
      { new: true, runValidators: false },
    );
    if (!user) {
      throw ApiError.notFound("User not found");
    }
    res.status(200).json({ blockedUsers: user.blockedUsers || [] });
  
};

const getBlockedUsers = async (req, res) => {
    const user = await User.findById(req.user.id).populate(
      "blockedUsers",
      "-password",
    );
    res.status(200).json(user?.blockedUsers || []);
  
};

const ignoreUser = async (req, res) => {
    const target = req.params.id;
    if (!target || String(target) === String(req.user.id)) {
      throw ApiError.badRequest("Invalid user");
    }
    await User.findByIdAndUpdate(req.user.id, {
      $addToSet: { ignoredUserIds: target },
    });
    const user = await User.findById(req.user.id).select(
      "-password -phoneHash",
    );
    res.json(user);
  
};

const unignoreUser = async (req, res) => {
    const target = req.params.id;
    await User.findByIdAndUpdate(req.user.id, {
      $pull: { ignoredUserIds: target },
    });
    const user = await User.findById(req.user.id).select(
      "-password -phoneHash",
    );
    res.json(user);
  
};

const listIgnoredUsers = async (req, res) => {
    const u = await User.findById(req.user.id)
      .select("ignoredUserIds")
      .populate("ignoredUserIds", "name email profilePic username");
    res.json(Array.isArray(u?.ignoredUserIds) ? u.ignoredUserIds : []);
  
};

module.exports = {
  blockUser,
  unblockUser,
  getBlockedUsers,
  ignoreUser,
  unignoreUser,
  listIgnoredUsers,
};
