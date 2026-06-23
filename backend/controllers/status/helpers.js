const Conversation = require("../../models/Conversation.js");

/** User ids that share at least one conversation with `userId` (excluding self). */
async function getChatPeerIds(userId) {
  const uid = String(userId || "");
  const convs = await Conversation.find({ members: uid }).select("members").lean();
  const peerIds = new Set();
  for (const conversation of convs) {
    for (const memberId of conversation.members || []) {
      const id = String(memberId);
      if (id && id !== uid) peerIds.add(id);
    }
  }
  return [...peerIds];
}

function serializeReply(row) {
  if (!row) return row;
  const uid = row.userId?._id || row.userId;
  const name =
    row.userId && typeof row.userId === "object"
      ? String(row.userId.name || "").trim()
      : "";
  return {
    userId: uid ? String(uid) : "",
    authorName: name,
    text: String(row.text || ""),
    createdAt: row.createdAt || null,
  };
}

function serializeStatus(item, viewerId) {
  if (!item) return item;
  const ownerId = String(item.userId?._id || item.userId || "");
  const uid = String(viewerId || "");
  const isOwner = Boolean(ownerId && uid && ownerId === uid);

  const reactions = item.reactions || [];
  const replies = Array.isArray(item.replies) ? item.replies : [];
  const viewers = Array.isArray(item.viewers) ? item.viewers : [];
  const myReaction = reactions.find(
    (r) => String(r.userId?._id || r.userId) === uid,
  );
  const hasViewed = viewers.some(
    (v) => String(v.userId?._id || v.userId) === uid,
  );

  const { viewers: _viewers, replies: _replies, ...rest } = item;

  const myReplies = replies.filter(
    (r) => String(r.userId?._id || r.userId) === uid,
  );

  const out = {
    ...rest,
    hasViewed: isOwner || hasViewed,
    reactionCount: reactions.length,
    myReactionEmoji: myReaction?.emoji || null,
  };

  if (isOwner) {
    out.viewerCount = viewers.length;
    out.replyCount = replies.length;
    out.replies = replies.map(serializeReply);
  } else if (myReplies.length) {
    out.myReplies = myReplies.map(serializeReply);
  }

  return out;
}

module.exports = {
  getChatPeerIds,
  serializeReply,
  serializeStatus,
};
