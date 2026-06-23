const User = require("../../models/User.js");
const {
  isSearchQueryLongEnough,
  makeSearchRegex,
} = require("../../services/search-normalize.js");
const { filterDiscoverableUsers } = require("./helpers.js");

const searchUsers = async (req, res) => {
    const q = (req.query.q || "").trim();
    if (!isSearchQueryLongEnough(q)) return res.json([]);

    const rx = makeSearchRegex(q);
    if (!rx) return res.json([]);

    const users = await User.find({
      _id: { $ne: req.user.id },
      email: { $not: /bot$/i },
      $or: [{ name: rx }, { username: rx }, { email: rx }],
    })
      .select("-password -phoneHash")
      .limit(40);

    const discoverable = await filterDiscoverableUsers(req.user.id, users);
    res.json(discoverable.slice(0, 25));
  
};

module.exports = {
  searchUsers,
};
