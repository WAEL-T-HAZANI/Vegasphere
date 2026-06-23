const express = require("express");

const router = express.Router();

const fetchuser = require("../middleware/fetch_user.js");
const validate = require("../middleware/validate.js");
const { linkPreviewQuerySchema } = require("../validators/common.js");

const { getLinkPreview, getGeoIpLocation } = require("../controllers/utility/index.js");

router.get(
  "/link-preview",
  fetchuser,
  validate(linkPreviewQuerySchema, "query"),
  getLinkPreview,
);

router.get("/geoip", fetchuser, getGeoIpLocation);

module.exports = router;
