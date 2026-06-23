const { wrapHttpHandlers } = require("../../services/async-handler.js");

const registerLogin = require("./register-login.http.js");
const password = require("./password.http.js");
const twoStep = require("./two-step.http.js");
const session = require("./session.http.js");
const profile = require("./profile.http.js");
const emailVerify = require("./email-verify.http.js");

module.exports = wrapHttpHandlers({
  ...registerLogin,
  ...password,
  ...twoStep,
  ...session,
  ...profile,
  ...emailVerify,
});
