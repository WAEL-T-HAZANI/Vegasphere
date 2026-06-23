const express = require("express");

const router = express.Router();

const fetchUser = require("../middleware/fetch_user.js");
const validate = require("../middleware/validate.js");
const { sessionIdParamSchema } = require("../validators/common.js");

const {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  setTwoStepSchema,
  disableTwoStepSchema,
  verifyEmailSchema,
} = require("../validators/auth_validator.js");

const {
  register,
  login,
  forgotPassword,
  resetPassword,
  authUser,
  listSessions,
  revokeSession,
  revokeOtherSessions,
  revokeCurrentSession,
  setTwoStepPin,
  disableTwoStep,
  verifyEmail,
  resendVerificationEmail,
} = require("../controllers/auth/index.js");

router.post("/register", validate(registerSchema), register);

router.post("/login", validate(loginSchema), login);

router.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);

router.post("/reset-password", validate(resetPasswordSchema), resetPassword);

router.post("/verify-email", validate(verifyEmailSchema), verifyEmail);

router.post("/resend-verification", fetchUser, resendVerificationEmail);

router.get("/me", fetchUser, authUser);

router.get("/sessions", fetchUser, listSessions);

router.delete("/sessions/current", fetchUser, revokeCurrentSession);

router.delete("/sessions/others", fetchUser, revokeOtherSessions);

router.delete(
  "/sessions/:sessionId",
  fetchUser,
  validate(sessionIdParamSchema, "params"),
  revokeSession,
);

router.put("/2step/pin", fetchUser, validate(setTwoStepSchema), setTwoStepPin);

router.delete(
  "/2step",
  fetchUser,
  validate(disableTwoStepSchema),
  disableTwoStep,
);

module.exports = router;
