const crypto = require("crypto");

function digitsOnly(s) {
  return String(s || "").replace(/\D/g, "");
}

/** sha256 hex of digits-only string (contact matching). */
function phoneHashFromInput(phone) {
  const d = digitsOnly(phone);
  if (!d) return "";
  return crypto.createHash("sha256").update(d, "utf8").digest("hex");
}

module.exports = { digitsOnly, phoneHashFromInput };
