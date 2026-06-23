const express = require("express");

const router = express.Router();

const fetchuser = require("../middleware/fetch_user.js");
const validate = require("../middleware/validate.js");
const { joinTokenParamSchema } = require("../validators/common.js");

const {
  getJoinPreview,
  joinWithInviteToken,
} = require("../controllers/conversations/index.js");

router.get("/:token", validate(joinTokenParamSchema, "params"), getJoinPreview);

router.post(
  "/:token",
  fetchuser,
  validate(joinTokenParamSchema, "params"),
  joinWithInviteToken,
);

module.exports = router;
