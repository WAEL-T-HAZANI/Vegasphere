const { ApiError } = require("../../services/http-error.js");
const { hashSecret, compareSecret } = require("../../services/password-hash.js");

const User = require("../../models/User.js");
const Conversation = require("../../models/Conversation.js");
const { validateDisplayName } = require("../../services/display-name-policy.js");
const { phoneHashFromInput } = require("../../services/phone-hash.js");
const { validateUsername } = require("../../services/username-policy.js");
const { normalizePhoneInput, normalizeEnum } = require("./helpers.js");
const {
  issueVerificationToken,
  sendVerifyMail,
} = require("./email-verify.http.js");

const getNonFriendsList = async (req, res) => {
    const userId = req.user.id;
    const currentUser = await User.findById(userId)
      .select("blockedUsers")
      .lean();
    const blockedUsers = new Set(
      (currentUser?.blockedUsers || []).map((id) => String(id)),
    );

    const conversations = await Conversation.find({ members: userId })
      .select("members")
      .lean();

    const excludeIds = new Set([String(userId)]);
    for (const conversation of conversations) {
      for (const memberId of conversation.members || []) {
        excludeIds.add(String(memberId));
      }
    }
    for (const blockedId of blockedUsers) excludeIds.add(blockedId);

    const users = await User.find({
      _id: { $nin: [...excludeIds] },
      email: { $not: /bot$/i },
    })
      .select("name username email profilePic")
      .sort({ name: 1, username: 1 })
      .limit(24)
      .lean();

    res.json(users);
};

const updateProfile = async (req, res) => {
    if (req.body.name !== undefined) {
      const nameCheck = validateDisplayName(req.body.name);
      if (!nameCheck.ok) {
        throw ApiError.badRequest(nameCheck.error);
      }
    }
    if (req.body.username !== undefined) {
      const usernameCheck = validateUsername(req.body.username);
      if (!usernameCheck.ok) {
        throw ApiError.badRequest(usernameCheck.error);
      }
      const nextUsername = usernameCheck.value;
      if (nextUsername) {
        const existing = await User.findOne({
          username: nextUsername,
          _id: { $ne: req.user.id },
        }).select("_id");
        if (existing) {
          throw ApiError.badRequest("Username already taken");
        }
      }
      if (nextUsername) req.body.username = nextUsername;
      else delete req.body.username;
    }

    if (req.body.email !== undefined) {
      const email = String(req.body.email || "")
        .trim()
        .toLowerCase();
      if (!email) {
        throw ApiError.badRequest("Email is required");
      }
      if (email.endsWith("bot")) {
        throw ApiError.badRequest("Invalid email");
      }
      const existing = await User.findOne({
        email,
        _id: { $ne: req.user.id },
      }).select("_id");
      if (existing) {
        throw ApiError.badRequest("Email already in use");
      }
      req.body.email = email;
    }

    const dbuser = await User.findById(req.user.id);
    if (!dbuser) throw ApiError.notFound("User not found");

    const nextEmail =
      req.body.email !== undefined
        ? String(req.body.email || "").trim().toLowerCase()
        : null;
    const emailChanging =
      nextEmail !== null && nextEmail !== String(dbuser.email || "").toLowerCase();

    if (emailChanging) {
      const pwd = String(req.body.oldpassword || "");
      if (!pwd) {
        throw ApiError.badRequest("Current password required to change email");
      }
      const pwdOk = await compareSecret(pwd, dbuser.password);
      if (!pwdOk) {
        throw ApiError.badRequest("Invalid Credentials");
      }
      req.body.emailVerified = false;
    }

    if (req.body.newpassword) {
      if (String(req.body.newpassword).length < 8) {
        throw ApiError.badRequest("Password must be at least 8 characters");
      }
      const passwordCompare = await compareSecret(
        req.body.oldpassword,
        dbuser.password,
      );
      if (!passwordCompare) {
        throw ApiError.badRequest("Invalid Credentials");
      }

      req.body.password = await hashSecret(req.body.newpassword);

      delete req.body.oldpassword;
      delete req.body.newpassword;
    }
    delete req.body.phoneHash;
    delete req.body.e2ePublicKey;
    delete req.body.twoStepPinHash;
    if (req.body.phone !== undefined) {
      const normalized = normalizePhoneInput(req.body.phone);
      if (normalized === null) {
        throw ApiError.badRequest("Invalid phone number. Use international format like +15551234567");
      }
      req.body.phone = normalized;
    }
    delete req.body.phoneDiscoverable;
    if (req.body.notificationRules !== undefined) {
      const rawRules = req.body.notificationRules || {};
      const existing = dbuser.notificationRules || {};
      req.body.notificationRules = {
        direct:
          rawRules.direct !== undefined
            ? rawRules.direct !== false
            : existing.direct !== false,
        groups:
          rawRules.groups !== undefined
            ? rawRules.groups !== false
            : existing.groups !== false,
        mentions:
          rawRules.mentions !== undefined
            ? rawRules.mentions !== false
            : existing.mentions !== false,
        sound:
          rawRules.sound !== undefined
            ? rawRules.sound !== false
            : existing.sound !== false,
      };
    }
    if (req.body.doNotDisturb !== undefined) {
      req.body.doNotDisturb = Boolean(req.body.doNotDisturb);
    }
    if (req.body.pushNotificationsEnabled !== undefined) {
      req.body.pushNotificationsEnabled = Boolean(
        req.body.pushNotificationsEnabled,
      );
    }

    if (req.body.lastSeenVisibility !== undefined) {
      const v = normalizeEnum(req.body.lastSeenVisibility, [
        "everyone",
        "contacts",
        "nobody",
      ]);
      if (v === null)
        throw ApiError.badRequest("Invalid lastSeenVisibility");
      req.body.lastSeenVisibility = v;
      req.body.showLastSeen = v !== "nobody";
    }
    if (req.body.onlineVisibility !== undefined) {
      const v = normalizeEnum(req.body.onlineVisibility, [
        "everyone",
        "contacts",
        "nobody",
      ]);
      if (v === null) throw ApiError.badRequest("Invalid onlineVisibility");
      req.body.onlineVisibility = v;
      req.body.showOnlineStatus = v !== "nobody";
    }
    if (req.body.profilePhotoVisibility !== undefined) {
      const v = normalizeEnum(req.body.profilePhotoVisibility, [
        "everyone",
        "contacts",
        "nobody",
      ]);
      if (v === null)
        throw ApiError.badRequest("Invalid profilePhotoVisibility");
      req.body.profilePhotoVisibility = v;
    }
    if (req.body.aboutVisibility !== undefined) {
      const v = normalizeEnum(req.body.aboutVisibility, [
        "everyone",
        "contacts",
        "nobody",
      ]);
      if (v === null) throw ApiError.badRequest("Invalid aboutVisibility");
      req.body.aboutVisibility = v;
    }
    if (req.body.callPrivacy !== undefined) {
      const v = normalizeEnum(req.body.callPrivacy, [
        "everyone",
        "contacts",
        "nobody",
      ]);
      if (v === null) throw ApiError.badRequest("Invalid callPrivacy");
      req.body.callPrivacy = v;
    }
    if (req.body.searchDiscoverable !== undefined) {
      const v = normalizeEnum(req.body.searchDiscoverable, [
        "everyone",
        "contacts",
        "nobody",
      ]);
      if (v === null) throw ApiError.badRequest("Invalid searchDiscoverable");
      req.body.searchDiscoverable = v;
    }
    if (req.body.groupAddPermission !== undefined) {
      const v = normalizeEnum(req.body.groupAddPermission, [
        "everyone",
        "contacts",
        "nobody",
      ]);
      if (v === null)
        throw ApiError.badRequest("Invalid groupAddPermission");
      req.body.groupAddPermission = v;
    }
    if (req.body.loginAlertsEnabled !== undefined) {
      req.body.loginAlertsEnabled = Boolean(req.body.loginAlertsEnabled);
    }
    if (req.body.showLastSeen !== undefined) {
      req.body.showLastSeen = Boolean(req.body.showLastSeen);
    }
    if (req.body.showOnlineStatus !== undefined) {
      req.body.showOnlineStatus = Boolean(req.body.showOnlineStatus);
    }
    if (req.body.readReceiptsEnabled !== undefined) {
      req.body.readReceiptsEnabled = Boolean(req.body.readReceiptsEnabled);
    }
    if (req.body.typingIndicatorsEnabled !== undefined) {
      req.body.typingIndicatorsEnabled = Boolean(
        req.body.typingIndicatorsEnabled,
      );
    }
    // Two-step sign-in is managed only via PUT /auth/2step/pin and DELETE /auth/2step.
    // Ignore twoStepEnabled here so privacy/profile saves never trigger PIN checks.
    delete req.body.twoStepEnabled;
    const nextPhone =
      req.body.phone !== undefined ? req.body.phone : dbuser.phone || "";
    const nextDisc = Boolean(nextPhone);
    req.body.phoneDiscoverable = nextDisc;
    req.body.phoneHash = nextPhone ? phoneHashFromInput(nextPhone) : "";

    await User.findByIdAndUpdate(req.user.id, req.body, {
      runValidators: true,
    });

    if (emailChanging) {
      const user = await User.findById(req.user.id);
      const verifyToken = await issueVerificationToken(user);
      const verifySent = await sendVerifyMail(user, verifyToken);
      const out = {
        message: "Email updated. Verify your new address.",
        emailVerified: false,
        email: user.email,
      };
      if (
        verifySent &&
        typeof verifySent === "object" &&
        verifySent.debugVerifyToken
      ) {
        out.debugVerifyToken = verifySent.debugVerifyToken;
      }
      return res.status(200).json(out);
    }

    res.status(200).json({ message: "Profile Updated" });
};

module.exports = {
  getNonFriendsList,
  updateProfile,
};
