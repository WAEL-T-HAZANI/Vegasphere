const helmet = require("helmet");

const { isProd, CORS_ORIGINS } = require("./env.js");

function buildHelmetMiddleware() {
  const connectSrc = ["'self'", "ws:", "wss:"];
  for (const origin of CORS_ORIGINS) {
    try {
      const url = new URL(origin);
      connectSrc.push(origin, url.origin);
      if (url.protocol === "https:") {
        connectSrc.push(`wss://${url.host}`);
      } else if (url.protocol === "http:") {
        connectSrc.push(`ws://${url.host}`);
      }
    } catch {
      /* ignore malformed origin */
    }
  }

  return helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
    hsts: isProd
      ? {
          maxAge: 31_536_000,
          includeSubDomains: true,
          preload: true,
        }
      : false,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    contentSecurityPolicy: isProd
      ? {
          useDefaults: true,
          directives: {
            "default-src": ["'self'"],
            "base-uri": ["'self'"],
            "form-action": ["'self'"],
            "frame-ancestors": ["'none'"],
            "object-src": ["'none'"],
            "script-src": ["'self'"],
            "style-src": ["'self'", "'unsafe-inline'"],
            "img-src": ["'self'", "data:", "blob:", "https:"],
            "media-src": ["'self'", "blob:", "https:"],
            "connect-src": [...new Set(connectSrc)],
            "upgrade-insecure-requests": [],
          },
        }
      : false,
  });
}

module.exports = { buildHelmetMiddleware };
