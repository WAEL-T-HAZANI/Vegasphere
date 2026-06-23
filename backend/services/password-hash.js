const bcrypt = require("bcryptjs");

const { BCRYPT_ROUNDS } = require("../config/env.js");

async function hashSecret(plain) {
  const salt = await bcrypt.genSalt(BCRYPT_ROUNDS);
  return bcrypt.hash(String(plain || ""), salt);
}

async function compareSecret(plain, hash) {
  if (!hash) return false;
  return bcrypt.compare(String(plain || ""), String(hash));
}

module.exports = {
  hashSecret,
  compareSecret,
};
