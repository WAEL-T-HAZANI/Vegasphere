/**
 * Central error middleware. Single place that turns thrown errors into a
 * consistent `{ success, message, details }` JSON envelope.
 */
const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  let status = err.statusCode || err.status || 500;
  let message = err.message || "Request failed";
  let details = err.details || null;

  if (err.name === "ValidationError" && err.errors) {
    status = 400;
    message = "Validation failed";
    details = Object.fromEntries(
      Object.entries(err.errors).map(([field, e]) => [field, e.message]),
    );
  }

  if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyPattern || err.keyValue || {})[0];
    message = field ? `${field} already in use` : "Duplicate value";
    details = err.keyValue || null;
  }

  if (err.name === "CastError") {
    status = 400;
    message = `Invalid ${err.path || "value"}`;
  }

  if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    status = 401;
    message = "Please authenticate using a valid token";
  }

  if (err.type === "entity.too.large") {
    status = 413;
    message = "Request body too large";
  }

  if (err.name === "MulterError") {
    status = 400;
    message =
      err.code === "LIMIT_FILE_SIZE"
        ? "File too large (max 100 MB)"
        : err.message || "Upload failed";
  }

  if (String(err.message || "").includes("Only image uploads are allowed")) {
    status = 400;
    message = "Only image uploads are allowed";
  }

  if (err.name === "MongoServerError" && err.code === 13) {
    status = 503;
    message = "Database write not permitted";
  }

  if (status >= 500) {
    console.error(`[${req.requestId || "-"}]`, err);
    if (process.env.EXPOSE_API_ERRORS === "1" && err?.message) {
      message = err.message;
      details =
        process.env.NODE_ENV !== "production" ? { stack: err.stack } : null;
    } else {
      message = "Internal Server Error";
      details = null;
    }
  }

  const body = {
    success: false,
    message,
    details,
  };
  if (req.requestId) body.requestId = req.requestId;

  return res.status(status).json(body);
};

module.exports = errorHandler;
