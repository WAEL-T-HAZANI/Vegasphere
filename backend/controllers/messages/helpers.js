const mongoose = require("mongoose");
const Message = require("../../models/Message.js");
const Conversation = require("../../models/Conversation.js");
const bus = require("../../services/event-bus.js");
const { EVENTS } = bus;

function safeGetIO() {
  try {
    const { getIO } = require("../../socket/index.js");
    return typeof getIO === "function" ? getIO() : null;
  } catch {
    return null;
  }
}

/**
 * Atomically reserve the next per-conversation sequence number. Stamped onto each
 * published message as `seq` to give a stable total order independent of clock skew.
 */
async function nextConversationSeq(conversationId) {
  const updated = await Conversation.findByIdAndUpdate(
    conversationId,
    { $inc: { msgSeq: 1 } },
    { new: true, timestamps: false, select: "msgSeq" },
  );
  return updated?.msgSeq || 0;
}

function normalizeStoredMediaUrl(raw) {
  if (!raw) return "";
  const value = String(raw).trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value) || /^data:/i.test(value)) return value;
  return value.startsWith("/") ? value : `/${value}`;
}

const DELETE_FOR_EVERYONE_MS = 48 * 60 * 60 * 1000;

function normalizeScheduledFor(raw) {
  if (!raw) return null;
  const date = raw instanceof Date ? raw : new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function isFutureSchedule(date) {
  return Boolean(date && date.getTime() > Date.now() + 15000);
}

function normalizeDisappearAfterSec(raw) {
  const n = Number(raw || 0);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(7 * 24 * 60 * 60, Math.round(n));
}

function normalizeMentionIds(raw, members, senderStr) {
  if (!Array.isArray(raw) || !members?.length) return [];
  const allowed = new Set(members.map((m) => m._id.toString()));
  const seen = new Set();
  const out = [];
  for (const id of raw) {
    const s = String(id);
    if (!s || s === senderStr || !allowed.has(s)) continue;
    if (!mongoose.Types.ObjectId.isValid(s)) continue;
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(new mongoose.Types.ObjectId(s));
  }
  return out;
}

function normalizePollPayload(raw, conversation) {
  if (!raw || typeof raw !== "object") return null;
  if (!conversation?.isGroup && !conversation?.isChannel) return null;

  const question = String(raw.question || "")
    .trim()
    .slice(0, 240);
  const options = Array.isArray(raw.options)
    ? raw.options
        .map((option) => {
          if (option && typeof option === "object" && option.text != null) {
            return String(option.text).trim().slice(0, 120);
          }
          return String(option || "")
            .trim()
            .slice(0, 120);
        })
        .filter(Boolean)
    : [];

  const uniqueOptions = [...new Set(options)];
  if (!question || uniqueOptions.length < 2) return null;

  const closesAt = normalizeScheduledFor(raw.closesAt);
  return {
    question,
    allowsMultiple: Boolean(raw.allowsMultiple ?? raw.multiple),
    closesAt:
      closesAt && closesAt.getTime() > Date.now() + 60000 ? closesAt : null,
    options: uniqueOptions.slice(0, 10).map((text) => ({
      id: new mongoose.Types.ObjectId().toString(),
      text,
      voterIds: [],
    })),
  };
}

function normalizeTopicPayload(rawTopicId, conversation) {
  if (!conversation?.isGroup && !conversation?.isChannel) {
    return { topicId: "", topicName: "" };
  }
  const topics =
    Array.isArray(conversation.topics) && conversation.topics.length
      ? conversation.topics
      : [{ id: "general", name: "General" }];
  const requested = String(rawTopicId || "").trim() || "general";
  const match = topics.find(
    (topic) => !topic.archived && String(topic.id) === requested,
  );
  const topic = match || topics.find((item) => !item.archived) || topics[0];
  return {
    topicId: String(topic?.id || "general"),
    topicName: String(topic?.name || "General"),
  };
}

/**
 * After persist: publish a MESSAGE_CREATED domain event and return. The delivery
 * service (subscribed to the event bus) owns all fan-out — socket broadcast, unread
 * mirror, per-recipient notifications, push, and retries — so the write path stays
 * fast and delivery scales independently.
 */
async function notifyAfterMessageSend(
  messageDoc,
  { otherMemberIds, inRoomUserIds, clientTempId, conversationMeta } = {},
) {
  let msg = messageDoc;
  if (!messageDoc.senderId?.name) {
    msg = await Message.findById(messageDoc._id).populate(
      "senderId",
      "name email profilePic",
    );
  }
  const plain = msg.toObject?.() || msg;
  const cid = String(plain.conversationId);

  let meta = conversationMeta;
  if (!meta) {
    const conv = await Conversation.findById(cid)
      .select("isGroup isChannel")
      .lean();
    meta = {
      isGroup: Boolean(conv?.isGroup),
      isChannel: Boolean(conv?.isChannel),
    };
  }

  bus.publish(EVENTS.MESSAGE_CREATED, {
    message: { ...plain, conversationId: cid },
    conversationMeta: meta,
    otherMemberIds: (otherMemberIds || []).map(String),
    inRoomUserIds: (inRoomUserIds || []).map(String),
    clientTempId: clientTempId ? String(clientTempId) : "",
  });
}

const E2E_LIST_PREVIEW = "🔒 Encrypted message";

const getLatestMessageText = ({ messageType, text, e2eVersion }) => {
  if (Number(e2eVersion) > 0) return E2E_LIST_PREVIEW;
  if (text && text.trim()) return text;
  switch (messageType) {
    case "poll":
      return "Poll";
    case "image":
      return "__image__";
    case "video":
      return "__video__";
    case "file":
      return "__file__";
    case "location":
      return "__location__";
    case "audio":
      return "__audio__";
    default:
      return text || "";
  }
};

async function syncLatestMessageOnEdit(messageDoc, nextText) {
  if (!messageDoc?.conversationId) return;
  const conv = await Conversation.findById(messageDoc.conversationId);
  if (!conv) return;
  const latest = await Message.findOne({
    conversationId: conv._id,
    scheduledStatus: { $ne: "pending" },
    deletedForEveryone: false,
  })
    .sort({ seq: -1, _id: -1 })
    .select("_id messageType text e2eVersion")
    .lean();
  if (!latest || String(latest._id) !== String(messageDoc._id)) return;
  const ev = Number(messageDoc.e2eVersion) || 0;
  conv.latestMessage = getLatestMessageText({
    messageType: messageDoc.messageType || latest.messageType || "text",
    text: String(nextText),
    e2eVersion: ev,
  });
  await conv.save();
}

module.exports = {
  safeGetIO,
  nextConversationSeq,
  normalizeStoredMediaUrl,
  DELETE_FOR_EVERYONE_MS,
  normalizeScheduledFor,
  isFutureSchedule,
  normalizeDisappearAfterSec,
  normalizeMentionIds,
  normalizePollPayload,
  normalizeTopicPayload,
  notifyAfterMessageSend,
  E2E_LIST_PREVIEW,
  getLatestMessageText,
  syncLatestMessageOnEdit,
};
