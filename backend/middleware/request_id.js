const crypto = require("crypto");

/** Attach a stable request id for logs and error responses. */
function requestId(req, res, next) {
  const incoming = String(req.headers["x-request-id"] || "").trim();
  const id =
    incoming && incoming.length <= 64 ? incoming : crypto.randomUUID();
  req.requestId = id;
  res.setHeader("X-Request-Id", id);
  next();
}

module.exports = requestId;
