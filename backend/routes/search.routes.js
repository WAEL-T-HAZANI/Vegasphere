const express = require("express");

const router = express.Router();

const fetchuser = require("../middleware/fetch_user.js");
const validate = require("../middleware/validate.js");
const { searchQuerySchema } = require("../validators/common.js");

const { globalSearch } = require("../controllers/search/index.js");

router.get("/", fetchuser, validate(searchQuerySchema, "query"), globalSearch);

module.exports = router;
