const { wrapHttpHandlers } = require("../../services/async-handler.js");

const {
  translateText,
  listTranslateLanguages,
} = require("../../services/ai-translate.js");

const { smartReplies } = require("../../services/ai-smart-replies.js");

module.exports = wrapHttpHandlers({
  translateText,
  listTranslateLanguages,
  smartReplies,
});
