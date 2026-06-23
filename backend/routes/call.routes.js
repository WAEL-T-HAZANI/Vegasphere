const express = require("express");

const router = express.Router();

const fetchUser = require("../middleware/fetch_user.js");
const validate = require("../middleware/validate.js");

const {
  callTokenParamSchema,
  inviteIdParamSchema,
} = require("../validators/common.js");

const { createCallInviteSchema } = require("../validators/call_validator.js");

const {
  listCallHistory,
  listCallInvites,
  createCallInvite,
  cancelCallInvite,
  previewCallInvite,
  resolveCallInvite,
  getIceServersHandler,
} = require("../controllers/calls/index.js");

router.get("/history", fetchUser, listCallHistory);

router.get("/ice-servers", fetchUser, getIceServersHandler);

router.get("/invites", fetchUser, listCallInvites);

router.get(
  "/invite/:token",
  validate(callTokenParamSchema, "params"),
  previewCallInvite,
);

router.get(
  "/invite/:token/resolve",
  fetchUser,
  validate(callTokenParamSchema, "params"),
  resolveCallInvite,
);

router.post(
  "/invite",
  fetchUser,
  validate(createCallInviteSchema),
  createCallInvite,
);

router.delete(
  "/invite/:inviteId",
  fetchUser,
  validate(inviteIdParamSchema, "params"),
  cancelCallInvite,
);

module.exports = router;
