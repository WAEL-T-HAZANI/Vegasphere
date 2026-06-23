const express = require("express");

const router = express.Router();

const fetchUser = require("../middleware/fetch_user.js");
const validate = require("../middleware/validate.js");
const { idParamSchema } = require("../validators/common.js");
const {
  networkingProfileSchema,
  networkingPostSchema,
  networkingPostUpdateSchema,
  introSchema,
  networkingQuerySchema,
} = require("../validators/networking_validator.js");
const {
  listNetworking,
  updateNetworkingProfile,
  createNetworkingPost,
  updateNetworkingPost,
  closeNetworkingPost,
  toggleNetworkingPostInterest,
  generateIntro,
} = require("../controllers/networking/index.js");

router.get("/", fetchUser, validate(networkingQuerySchema, "query"), listNetworking);

router.put(
  "/profile",
  fetchUser,
  validate(networkingProfileSchema),
  updateNetworkingProfile,
);

router.post("/posts", fetchUser, validate(networkingPostSchema), createNetworkingPost);

router.patch(
  "/posts/:id",
  fetchUser,
  validate(idParamSchema, "params"),
  validate(networkingPostUpdateSchema),
  updateNetworkingPost,
);

router.patch(
  "/posts/:id/close",
  fetchUser,
  validate(idParamSchema, "params"),
  closeNetworkingPost,
);

router.post(
  "/posts/:id/interest",
  fetchUser,
  validate(idParamSchema, "params"),
  toggleNetworkingPostInterest,
);

router.post("/intro", fetchUser, validate(introSchema), generateIntro);

module.exports = router;
