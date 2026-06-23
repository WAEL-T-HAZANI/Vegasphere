const jwt = require("jsonwebtoken");

const {
  JWT_SECRET,
  JWT_EXPIRES_IN,
  JWT_ISSUER,
  JWT_AUDIENCE,
} = require("../config/env.js");

const SIGN_OPTIONS = {
  expiresIn: JWT_EXPIRES_IN,
  algorithm: "HS256",
  issuer: JWT_ISSUER,
  audience: JWT_AUDIENCE,
};

const VERIFY_OPTIONS = {
  algorithms: ["HS256"],
  issuer: JWT_ISSUER,
  audience: JWT_AUDIENCE,
};

function signAccessToken(payload) {
  return jwt.sign(payload, JWT_SECRET, SIGN_OPTIONS);
}

function verifyAccessToken(token) {
  return jwt.verify(String(token || ""), JWT_SECRET, VERIFY_OPTIONS);
}

module.exports = {
  SIGN_OPTIONS,
  VERIFY_OPTIONS,
  signAccessToken,
  verifyAccessToken,
};
