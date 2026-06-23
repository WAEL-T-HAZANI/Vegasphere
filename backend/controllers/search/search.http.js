const User = require("../../models/User.js");
const Conversation = require("../../models/Conversation.js");
const Message = require("../../models/Message.js");
const {
  isSearchQueryLongEnough,
  makeSearchRegex,
  matchesSearchText,
} = require("../../services/search-normalize.js");
const { filterDiscoverableUsers } = require("../users/helpers.js");

function resolveConversationName(conversation, userId) {
  const name = String(conversation?.name || "").trim();
  if (name) return name;
  if (conversation?.isChannel && conversation?.channelSlug) {
    return `#${conversation.channelSlug}`;
  }
  if (conversation?.isGroup) return "Group";
  const other = (conversation?.members || []).find(
    (member) => String(member?._id || member?.id) !== String(userId),
  );
  return (
    other?.name ||
    other?.username ||
    other?.email ||
    "Chat"
  );
}

function conversationHaystack(conversation, userId) {
  const memberBits = (conversation?.members || []).flatMap((member) => [
    member?.name,
    member?.username,
    member?.email,
  ]);
  return [
    conversation?.name,
    conversation?.latestMessage,
    conversation?.channelSlug,
    resolveConversationName(conversation, userId),
    ...memberBits,
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * Unified search: people, your chats, and message hits (v1 caps).
 * Supports Latin, Arabic (with/without tashkeel), CJK, and mixed queries.
 */
const globalSearch = async (req, res) => {
    const q = String(req.query.q || "")
      .trim()
      .slice(0, 80);
    if (!isSearchQueryLongEnough(q)) {
      return res.json({ users: [], conversations: [], messages: [] });
    }

    const userId = req.user.id;
    const rx = makeSearchRegex(q);
    if (!rx) {
      return res.json({ users: [], conversations: [], messages: [] });
    }

    const [viewer, mine] = await Promise.all([
      User.findById(userId).select("blockedUsers hiddenConversationIds"),
      Conversation.find({ members: userId })
        .select(
          "_id name latestMessage channelSlug isGroup isChannel isSelfChat members",
        )
        .populate("members", "name username email profilePic")
        .lean(),
    ]);

    const blocked = new Set((viewer?.blockedUsers || []).map(String));
    const hidden = new Set((viewer?.hiddenConversationIds || []).map(String));

    const users = await User.find({
      _id: { $ne: userId },
      email: { $not: /bot$/i },
      $or: [{ name: rx }, { username: rx }, { email: rx }],
    })
      .select("name username email profilePic searchDiscoverable")
      .limit(30)
      .lean();

    const filteredUsers = (
      await filterDiscoverableUsers(userId, users)
    ).filter((u) => !blocked.has(String(u._id))).slice(0, 15);

    const conversations = [];
    for (const c of mine) {
      const id = String(c._id);
      if (hidden.has(id)) continue;
      if (c.isSelfChat) continue;
      if (!c.isGroup && !c.isChannel) {
        const other = (c.members || []).find(
          (m) => String(m._id || m.id) !== String(userId),
        );
        if (!other || blocked.has(String(other._id || other.id))) continue;
      }
      if (matchesSearchText(conversationHaystack(c, userId), q)) {
        conversations.push({
          _id: c._id,
          name: resolveConversationName(c, userId),
          latestmessage: c.latestMessage || "",
          channelSlug: c.channelSlug || "",
          isGroup: Boolean(c.isGroup),
          isChannel: Boolean(c.isChannel),
        });
      }
      if (conversations.length >= 15) break;
    }

    const convIds = mine.map((c) => c._id);
    const msgFilter = {
      conversationId: { $in: convIds },
      deletedFrom: { $ne: userId },
      e2eVersion: { $lte: 0 },
      $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
      $and: [
        {
          $or: [{ text: rx }, { fileName: rx }, { topicName: rx }],
        },
      ],
    };

    const messages = await Message.find(msgFilter)
      .sort({ createdAt: -1 })
      .limit(20)
      .select("text fileName topicName conversationId createdAt messageType")
      .lean();

    const convNameById = new Map(
      mine.map((c) => [String(c._id), resolveConversationName(c, userId)]),
    );

    const messagesOut = messages.map((m) => ({
      ...m,
      conversationName: convNameById.get(String(m.conversationId)) || "Chat",
    }));

    return res.json({
      users: filteredUsers,
      conversations,
      messages: messagesOut,
    });
  
};

const { wrapHttpHandlers } = require("../../services/async-handler.js");

module.exports = wrapHttpHandlers({ globalSearch });
