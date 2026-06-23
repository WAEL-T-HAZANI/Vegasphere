/**
 * Typed HTTP error. Throw it from any handler (sync or async) and the centralized
 * error middleware renders a consistent `{ success, message, details }` envelope
 * with the right status code.
 */
class ApiError extends Error {
  constructor(statusCode, message, details = null) {
    super(message || "Request failed");
    this.name = "ApiError";
    this.statusCode = statusCode || 500;
    this.details = details;
  }

  static badRequest(message, details) {
    return new ApiError(400, message || "Bad request", details);
  }

  static unauthorized(message) {
    return new ApiError(401, message || "Unauthorized");
  }

  static forbidden(message) {
    return new ApiError(403, message || "Forbidden");
  }

  static notFound(message) {
    return new ApiError(404, message || "Not found");
  }

  static conflict(message) {
    return new ApiError(409, message || "Conflict");
  }

  static tooManyRequests(message) {
    return new ApiError(429, message || "Too many requests");
  }

  static serviceUnavailable(message, details) {
    return new ApiError(503, message || "Service unavailable", details);
  }
}

module.exports = { ApiError };
