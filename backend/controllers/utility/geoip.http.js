const axios = require("axios");
const { ApiError } = require("../../services/http-error.js");

function normalizeIp(raw) {
  const ip = String(raw || "").trim();
  if (!ip) return "";
  if (ip.startsWith("::ffff:")) return ip.slice(7);
  return ip;
}

function isPrivateOrReservedIp(ip) {
  const value = normalizeIp(ip);
  if (!value) return true;
  if (value === "::1" || value === "127.0.0.1" || value === "localhost") {
    return true;
  }
  if (value.includes(":")) {
    const lower = value.toLowerCase();
    if (lower === "::1") return true;
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true;
    if (lower.startsWith("fe80")) return true;
    return false;
  }
  const parts = value.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) {
    return true;
  }
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

async function fetchGeoIp(ip, signal) {
  const lookupIp = isPrivateOrReservedIp(ip) ? "" : normalizeIp(ip);
  const url = lookupIp ? `https://ipwho.is/${encodeURIComponent(lookupIp)}` : "https://ipwho.is/";
  const r = await axios.get(url, {
    signal,
    headers: {
      "User-Agent": "VegasphereGeoIp/1.0",
    },
  });
  const data = r?.data || {};
  const ok = Boolean(data?.success !== false);
  const lat = Number(data?.latitude);
  const lng = Number(data?.longitude);
  if (!ok || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw ApiError.serviceUnavailable("GeoIP unavailable");
  }
  return {
    lat,
    lng,
    city: data?.city || "",
    region: data?.region || "",
    country: data?.country || "",
    isp: data?.connection?.isp || data?.isp || "",
    ip: data?.ip || lookupIp || ip,
  };
}

const getGeoIpLocation = async (req, res) => {
    const ip = normalizeIp(
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
        req.socket?.remoteAddress ||
        "",
    );

    const ctrl = new AbortController();

    const timer = setTimeout(() => ctrl.abort(), 4000);

    try {
      const payload = await fetchGeoIp(ip, ctrl.signal);
      return res.json(payload);
    } finally {
      clearTimeout(timer);
    }
};

const { wrapHttpHandlers } = require("../../services/async-handler.js");

module.exports = wrapHttpHandlers({
  getGeoIpLocation,
});
