const { ApiError } = require("../../services/http-error.js");
/**
 * Best-effort Open Graph / title fetch for https URLs only (SSRF-hardened).
 */
const getLinkPreview = async (req, res) => {
    const raw = String(req.query.url || "").trim();
    if (!raw) throw ApiError.badRequest("url required");
    let u;
    try {
      u = new URL(raw);
    } catch {
      throw ApiError.badRequest("invalid url");
    }
    if (u.protocol !== "https:") {
      throw ApiError.badRequest("https only");
    }
    const host = u.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host.endsWith(".local") ||
      /^10\.\d+\.\d+\.\d+$/.test(host) ||
      /^192\.168\.\d+\.\d+$/.test(host)
    ) {
      throw ApiError.badRequest("host not allowed");
    }

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    let html = "";
    try {
      const r = await fetch(raw, {
        signal: ctrl.signal,
        redirect: "follow",
        headers: {
          "User-Agent": "VegasphereLinkPreview/1.0",
          Accept: "text/html",
        },
      });
      const ct = r.headers.get("content-type") || "";
      if (!ct.includes("text/html")) {
        return res.json({ title: "", image: "", url: raw, siteName: "" });
      }
      const buf = await r.arrayBuffer();
      const slice = buf.byteLength > 500_000 ? buf.slice(0, 500_000) : buf;
      html = new TextDecoder("utf-8", { fatal: false }).decode(slice);
    } catch {
      return res.json({ title: "", image: "", url: raw, siteName: "" });
    } finally {
      clearTimeout(timer);
    }

    const og = (prop) => {
      const re = new RegExp(
        `<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']*)["']`,
        "i"
      );
      const m = html.match(re);
      return m ? m[1].trim() : "";
    };
    const ogName = (name) => {
      const re = new RegExp(
        `<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']*)["']`,
        "i"
      );
      const m = html.match(re);
      return m ? m[1].trim() : "";
    };
    const titleMatch = html.match(/<title[^>]*>([^<]{0,300})<\/title>/i);
    const title =
      og("og:title") ||
      ogName("twitter:title") ||
      (titleMatch ? titleMatch[1].trim() : "");
    const image = og("og:image") || ogName("twitter:image") || "";
    const siteName = og("og:site_name") || u.hostname;

    res.json({
      title: title.slice(0, 300),
      image: image.slice(0, 800),
      siteName: String(siteName).slice(0, 120),
      url: raw,
    });
  
};

const { wrapHttpHandlers } = require("../../services/async-handler.js");

module.exports = wrapHttpHandlers({ getLinkPreview });
