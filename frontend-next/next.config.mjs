/** @type {import('next').NextConfig} */

function apiImagePatterns() {
  const patterns = [
    { protocol: "http", hostname: "localhost", pathname: "/**" },
    { protocol: "http", hostname: "127.0.0.1", pathname: "/**" },
  ];
  const raw = String(process.env.NEXT_PUBLIC_API_URL || "").trim();
  if (!raw) return patterns;
  try {
    const url = new URL(raw);
    patterns.push({
      protocol: url.protocol.replace(":", ""),
      hostname: url.hostname,
      pathname: "/**",
    });
  } catch {
    /* ignore */
  }
  const r2Base = String(process.env.NEXT_PUBLIC_UPLOADS_BASE_URL || "").trim();
  if (r2Base) {
    try {
      const url = new URL(r2Base);
      patterns.push({
        protocol: url.protocol.replace(":", ""),
        hostname: url.hostname,
        pathname: "/**",
      });
    } catch {
      /* ignore */
    }
  }
  return patterns;
}

const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      { source: "/contacts", destination: "/search", permanent: true },
      { source: "/blocked", destination: "/privacy", permanent: true },
      { source: "/starred", destination: "/saved", permanent: true },
      { source: "/ai", destination: "/ai-services", permanent: true },
    ];
  },
  images: {
    remotePatterns: apiImagePatterns(),
  },
  experimental: {
    staleTimes: {
      // Avoid stale RSC/layout after language or route changes in dev.
      dynamic: 0,
      static: 180,
    },
    optimizePackageImports: [
      "lucide-react",
      "framer-motion",
      "emoji-picker-react",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-scroll-area",
      "@radix-ui/react-dialog",
      "@radix-ui/react-tabs",
      "@radix-ui/react-tooltip",
    ],
  },
};

export default nextConfig;
