const User = require("../../models/User.js");
const {
  isSearchQueryLongEnough,
  makeSearchRegex,
} = require("../../services/search-normalize.js");
const {
  isPhoneLikeQuery,
  phoneHashCandidatesFromQuery,
} = require("../../services/phone-hash.js");
const { filterDiscoverableUsers } = require("./helpers.js");

const searchUsers = async (req, res) => {
    const q = (req.query.q || "").trim();
    if (!isSearchQueryLongEnough(q)) return res.json([]);

    const rx = makeSearchRegex(q);
    if (!rx) return res.json([]);

    const users = await User.find({
      _id: { $ne: req.user.id },
      $or: [{ name: rx }, { username: rx }, { email: rx }],
    })
      .select("-password -phoneHash")
      .limit(40);

    let phoneUsers = [];
    if (isPhoneLikeQuery(q)) {
      const hashes = phoneHashCandidatesFromQuery(q);
      if (hashes.length) {
        phoneUsers = await User.find({
          phoneDiscoverable: true,
          phoneHash: { $in: hashes },
        })
          .select("-password -phoneHash")
          .limit(40);
      }
    }

    const mergedById = new Map();
    for (const u of users) mergedById.set(String(u._id), u);
    for (const u of phoneUsers) mergedById.set(String(u._id), u);

    const discoverable = await filterDiscoverableUsers(
      req.user.id,
      [...mergedById.values()],
    );
    res.json(discoverable.slice(0, 25));
  
};

module.exports = {
  searchUsers,
};
