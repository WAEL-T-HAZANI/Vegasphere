const geoip = require("./geoip.http.js");
const linkPreview = require("./link-preview.http.js");

module.exports = {
  ...geoip,
  ...linkPreview,
};
