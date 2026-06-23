const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/** Wrap res.json so bare payloads become { success: true, data }. */
function attachSuccessEnvelope(res) {
  if (res._envelopeWrapped) return;
  res._envelopeWrapped = true;
  const origJson = res.json.bind(res);
  res.json = (body) => {
    if (
      body &&
      typeof body === "object" &&
      !Array.isArray(body) &&
      Object.prototype.hasOwnProperty.call(body, "success")
    ) {
      return origJson(body);
    }
    return origJson({ success: true, data: body });
  };
}

function wrapHttpHandlers(handlers, skip = []) {
  const skipSet = new Set(skip);
  const out = {};

  for (const [key, fn] of Object.entries(handlers)) {
    out[key] =
      skipSet.has(key) || typeof fn !== "function"
        ? fn
        : asyncHandler((req, res, next) => {
            attachSuccessEnvelope(res);
            return fn(req, res, next);
          });
  }

  return out;
}

module.exports = asyncHandler;
module.exports.wrapHttpHandlers = wrapHttpHandlers;
