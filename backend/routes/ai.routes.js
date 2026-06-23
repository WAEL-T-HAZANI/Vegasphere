const express = require("express");

const router = express.Router();

const fetchUser = require("../middleware/fetch_user.js");
const validate = require("../middleware/validate.js");

const {
  translateSchema,
  smartRepliesSchema,
} = require("../validators/ai_validator.js");

const {
  translateText,
  smartReplies,
  listTranslateLanguages,
} = require("../controllers/ai/index.js");

router.post("/translate", fetchUser, validate(translateSchema), translateText);

router.get("/translate/languages", fetchUser, listTranslateLanguages);

router.post(
  "/smart-replies",
  fetchUser,
  validate(smartRepliesSchema),
  smartReplies,
);

module.exports = router;
