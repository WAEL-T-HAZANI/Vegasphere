const { ApiError } = require("../../services/http-error.js");
const { hashSecret, compareSecret } = require("../../services/password-hash.js");

const User = require("../../models/User.js");
const { validateDisplayName } = require("../../services/display-name-policy.js");
const { validateUsername } = require("../../services/username-policy.js");
const { defaultAvatarUrl } = require("../../services/avatar-utils.js");
const { createUserSession } = require("../../services/session-auth.js");
const { isDestructiveMaintenanceAllowed } = require("../../config/env.js");
const {
  issueVerificationToken,
  sendVerifyMail,
} = require("./email-verify.http.js");

const register = async (req, res) => {
    console.log("register request received");

    const { name, email: rawEmail, password, username: rawUsername } = req.body;
    const email = String(rawEmail || "")
      .trim()
      .toLowerCase();
    if (!name || !email || !password) {
      throw ApiError.badRequest("Please fill all the fields");
    }

    const nameCheck = validateDisplayName(name);
    if (!nameCheck.ok) {
      throw ApiError.badRequest(nameCheck.error);
    }
    const usernameCheck = validateUsername(rawUsername);
    if (!usernameCheck.ok) {
      throw ApiError.badRequest(usernameCheck.error);
    }

    if (email.endsWith("bot")) {
      throw ApiError.badRequest("Invalid email");
    }

    const user = await User.findOne({
      email,
    });

    if (user) {
      throw ApiError.badRequest("User already exists");
    }
    if (usernameCheck.value) {
      const usernameTaken = await User.findOne({
        username: usernameCheck.value,
      });
      if (usernameTaken) {
        throw ApiError.badRequest("Username already taken");
      }
    }
    const imageUrl = defaultAvatarUrl(name);

    const secPass = await hashSecret(password);

    const newUser = new User({
      name: String(name).trim(),
      email,
      password: secPass,
      profilePic: imageUrl,
      about: "Hello World!!",
    });
    if (usernameCheck.value) {
      newUser.username = usernameCheck.value;
    }

    await newUser.save();

    const verifyToken = await issueVerificationToken(newUser);
    const verifySent = await sendVerifyMail(newUser, verifyToken);

    const { token: authtoken, sessionId } = await createUserSession(
      newUser,
      req,
    );
    const out = {
      authtoken,
      sessionId,
      emailVerified: false,
    };
    if (
      verifySent &&
      typeof verifySent === "object" &&
      verifySent.debugVerifyToken
    ) {
      out.debugVerifyToken = verifySent.debugVerifyToken;
    }
    res.json(out);
  
};

const login = async (req, res) => {
  console.log("login request received");

  const { email: rawEmail, password, pin } = req.body;
  const email = String(rawEmail || "")
    .trim()
    .toLowerCase();

  if (!email || !password) {
    throw ApiError.badRequest("Please fill email and password");
  }

  const user = await User.findOne({ email }).select("+twoStepPinHash");

  if (!user) {
    throw ApiError.badRequest("Invalid Credentials");
  }

  const passwordCompare = await compareSecret(password, user.password);
  if (!passwordCompare) {
    throw ApiError.badRequest("Invalid Credentials");
  }

  if (user.twoStepEnabled && user.twoStepPinHash) {
    const pinStr = String(pin || "").trim();
    if (!pinStr) {
      throw ApiError.badRequest("2-step PIN required", { requiresPin: true });
    }
    const pinOk = await compareSecret(pinStr, user.twoStepPinHash);
    if (!pinOk) {
      throw ApiError.badRequest("Invalid 2-step PIN", { requiresPin: true });
    }
  }

  const { token: authtoken, sessionId } = await createUserSession(user, req);
  res.json({
    authtoken,
    sessionId,
    user: {
      _id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
      profilePic: user.profilePic,
      blockedUsers: user.blockedUsers,
      showOnlineStatus: user.showOnlineStatus,
      showLastSeen: user.showLastSeen,
      doNotDisturb: user.doNotDisturb,
      pushNotificationsEnabled: user.pushNotificationsEnabled,
      notificationRules: user.notificationRules,
      lastSeenVisibility: user.lastSeenVisibility,
      profilePhotoVisibility: user.profilePhotoVisibility,
      groupAddPermission: user.groupAddPermission,
      readReceiptsEnabled: user.readReceiptsEnabled,
      typingIndicatorsEnabled: user.typingIndicatorsEnabled,
      twoStepEnabled: user.twoStepEnabled,
      emailVerified: Boolean(user.emailVerified),
      destructiveMaintenanceAllowed: isDestructiveMaintenanceAllowed({
        id: user.id,
        role: user.role,
        isAdmin: user.isAdmin,
      }),
    },
  });
};

module.exports = {
  register,
  login,
};
