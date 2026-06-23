const { wrapHttpHandlers } = require("../../services/async-handler.js");

const profile = require("./profile.http.js");
const presence = require("./presence.http.js");
const block = require("./block.http.js");
const invites = require("./invites.http.js");
const push = require("./push.http.js");
const e2e = require("./e2e.http.js");
const inbox = require("./inbox.http.js");
const search = require("./search.http.js");
const account = require("./account.http.js");
const privacy = require("./privacy.http.js");
const notifications = require("./notifications.http.js");

module.exports = wrapHttpHandlers({
  ...profile,
  ...presence,
  ...block,
  ...invites,
  ...push,
  ...e2e,
  ...inbox,
  ...search,
  ...account,
  ...privacy,
  ...notifications,
});
