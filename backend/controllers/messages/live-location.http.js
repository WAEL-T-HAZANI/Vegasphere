const { ApiError } = require("../../services/http-error.js");
const Conversation = require("../../models/Conversation.js");
const liveLocation = require("../../services/live-location.js");
const { ok } = require("../../services/api-response.js");

const listLiveLocations = async (req, res) => {
  const convId = String(req.params.conversationId || "");
  const userId = String(req.user.id);
  const conv = await Conversation.findById(convId).select("members");
  if (!conv?.members?.some((m) => String(m) === userId)) {
    throw ApiError.forbidden();
  }
  return ok(res, await liveLocation.listForConversation(convId));
};

module.exports = { listLiveLocations };
