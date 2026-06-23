const { ApiError } = require("../../services/http-error.js");
const Conversation = require("../../models/Conversation.js");
const {
  isConversationAdmin,
  assertCanEditInfo,
} = require("../../services/conversation-permissions.js");
const { defaultTopics } = require("./helpers.js");

const createConversationTopic = async (req, res) => {
    const conv = await Conversation.findById(req.params.id).populate(
      "members",
      "-password -phoneHash",
    );
    if (!conv || (!conv.isGroup && !conv.isChannel)) {
      throw ApiError.badRequest("Only for groups and channels");
    }
    const uid = String(req.user.id);
    if (!isConversationAdmin(conv, uid)) {
      const info = assertCanEditInfo(conv, uid);
      if (!info.ok) throw ApiError.forbidden(info.error);
    }
    const name = String(req.body?.name || "")
      .trim()
      .slice(0, 60);
    const description = String(req.body?.description || "")
      .trim()
      .slice(0, 180);
    if (!name) {
      throw ApiError.badRequest("name required");
    }
    const topicId =
      name
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
        .slice(0, 40) || `topic-${Date.now()}`;
    conv.topics = Array.isArray(conv.topics) ? conv.topics : defaultTopics();
    if (conv.topics.some((topic) => String(topic.id) === topicId)) {
      throw ApiError.badRequest("Topic already exists");
    }
    conv.topics.push({
      id: topicId,
      name,
      description,
      createdBy: req.user.id,
      archived: false,
    });
    await conv.save();
    return res.json(conv);
  
};

const archiveConversationTopic = async (req, res) => {
    const conv = await Conversation.findById(req.params.id).populate(
      "members",
      "-password -phoneHash",
    );
    if (!conv || (!conv.isGroup && !conv.isChannel)) {
      throw ApiError.badRequest("Only for groups and channels");
    }
    const uid = String(req.user.id);
    if (!isConversationAdmin(conv, uid)) {
      const info = assertCanEditInfo(conv, uid);
      if (!info.ok) throw ApiError.forbidden(info.error);
    }
    conv.topics = Array.isArray(conv.topics) ? conv.topics : defaultTopics();
    const topicId = String(req.params.topicId || "").trim();
    const topic = conv.topics.find((row) => String(row.id) === topicId);
    if (!topic || topic.archived) {
      throw ApiError.notFound("Topic not found");
    }
    if (topicId === "general") {
      throw ApiError.badRequest("General topic cannot be archived");
    }
    topic.archived = true;
    await conv.save();
    return res.json(conv);
  
};

const updateConversationTopic = async (req, res) => {
    const conv = await Conversation.findById(req.params.id).populate(
      "members",
      "-password -phoneHash",
    );
    if (!conv || (!conv.isGroup && !conv.isChannel)) {
      throw ApiError.badRequest("Only for groups and channels");
    }
    const uid = String(req.user.id);
    if (!isConversationAdmin(conv, uid)) {
      const info = assertCanEditInfo(conv, uid);
      if (!info.ok) throw ApiError.forbidden(info.error);
    }
    conv.topics = Array.isArray(conv.topics) ? conv.topics : defaultTopics();
    const topicId = String(req.params.topicId || "").trim();
    const topic = conv.topics.find((row) => String(row.id) === topicId);
    if (!topic) {
      throw ApiError.notFound("Topic not found");
    }
    if (topicId === "general") {
      throw ApiError.badRequest("General topic cannot be renamed");
    }
    const name = String(req.body?.name || "")
      .trim()
      .slice(0, 60);
    const description = String(req.body?.description || "")
      .trim()
      .slice(0, 180);
    if (!name) {
      throw ApiError.badRequest("name required");
    }
    topic.name = name;
    topic.description = description;
    await conv.save();
    return res.json(conv);
  
};

const restoreConversationTopic = async (req, res) => {
    const conv = await Conversation.findById(req.params.id).populate(
      "members",
      "-password -phoneHash",
    );
    if (!conv || (!conv.isGroup && !conv.isChannel)) {
      throw ApiError.badRequest("Only for groups and channels");
    }
    const uid = String(req.user.id);
    if (!isConversationAdmin(conv, uid)) {
      const info = assertCanEditInfo(conv, uid);
      if (!info.ok) throw ApiError.forbidden(info.error);
    }
    conv.topics = Array.isArray(conv.topics) ? conv.topics : defaultTopics();
    const topicId = String(req.params.topicId || "").trim();
    const topic = conv.topics.find((row) => String(row.id) === topicId);
    if (!topic) {
      throw ApiError.notFound("Topic not found");
    }
    topic.archived = false;
    await conv.save();
    return res.json(conv);
  
};

module.exports = {
  createConversationTopic,
  archiveConversationTopic,
  updateConversationTopic,
  restoreConversationTopic,
};
