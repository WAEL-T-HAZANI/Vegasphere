const express = require("express");

const router = express.Router();

const fetchuser = require("../middleware/fetch_user.js");
const validate = require("../middleware/validate.js");
const { idParamSchema } = require("../validators/common.js");
const { statusUpload } = require("../services/status-upload.js");
const { ApiError } = require("../services/http-error.js");

const {
  createStatusSchema,
  statusReactSchema,
  statusReplySchema,
} = require("../validators/status_validator.js");

const {
  postStatus,
  getStatusAudience,
  listStatusFeed,
  listMyStatus,
  deleteStatus,
  viewStatus,
  reactStatus,
  replyStatus,
  listStatusViewers,
} = require("../controllers/status/index.js");

function handleStatusUpload(req, res, next) {
  statusUpload.single("image")(req, res, (err) => {
    if (!err) return next();
    if (err.name === "MulterError") {
      return next(
        ApiError.badRequest(
          err.code === "LIMIT_FILE_SIZE"
            ? "Image too large (max 6 MB)"
            : err.message,
        ),
      );
    }
    return next(
      ApiError.badRequest(err.message || "Upload failed"),
    );
  });
}

router.post(
  "/",
  fetchuser,
  handleStatusUpload,
  validate(createStatusSchema),
  postStatus,
);

router.get("/audience", fetchuser, getStatusAudience);

router.get("/feed", fetchuser, listStatusFeed);

router.get("/mine", fetchuser, listMyStatus);

router.post(
  "/:id/view",
  fetchuser,
  validate(idParamSchema, "params"),
  viewStatus,
);

router.post(
  "/:id/react",
  fetchuser,
  validate(idParamSchema, "params"),
  validate(statusReactSchema),
  reactStatus,
);

router.post(
  "/:id/reply",
  fetchuser,
  validate(idParamSchema, "params"),
  validate(statusReplySchema),
  replyStatus,
);

router.get(
  "/:id/viewers",
  fetchuser,
  validate(idParamSchema, "params"),
  listStatusViewers,
);

router.delete(
  "/:id",
  fetchuser,
  validate(idParamSchema, "params"),
  deleteStatus,
);

module.exports = router;
