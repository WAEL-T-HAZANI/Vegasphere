// @ts-nocheck
const DEFAULT_STUN_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:stun.services.mozilla.com:3478" },
];

/** Public TURN relay for cross-network calls when none configured (demo-grade). */
const DEFAULT_TURN_SERVERS = [
  {
    urls: [
      "turn:openrelay.metered.ca:80",
      "turn:openrelay.metered.ca:443",
      "turn:openrelay.metered.ca:443?transport=tcp",
    ],
    username: "openrelayproject",
    credential: "openrelayproject",
  },
];

function urlsKey(entry) {
  if (!entry || !entry.urls) return "";
  const u = entry.urls;
  return Array.isArray(u) ? u.join("|") : String(u);
}

function parseEnvIceServers(raw) {
  if (!raw || typeof raw !== "string") return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];
  try {
    const obj = JSON.parse(trimmed);
    if (obj && Array.isArray(obj.iceServers)) {
      return obj.iceServers.filter(Boolean);
    }
    if (Array.isArray(obj)) {
      return obj.filter(Boolean);
    }
  } catch {
    /* keep defaults only */
  }
  return [];
}

function mergeIceServers(...groups) {
  const seen = new Set();
  const out = [];
  for (const group of groups) {
    for (const entry of group || []) {
      const k = urlsKey(entry);
      if (!k || seen.has(k)) continue;
      seen.add(k);
      out.push(entry);
    }
  }
  return out.length ? out : [...DEFAULT_STUN_SERVERS];
}

function hasTurnCredentials(servers) {
  return (servers || []).some(
    (entry) =>
      entry?.username &&
      entry?.credential &&
      (Array.isArray(entry.urls)
        ? entry.urls.some((u) => /^turns?:/i.test(String(u)))
        : /^turns?:/i.test(String(entry.urls || ""))),
  );
}

let serverIceServers = [];
let prefetchPromise = null;

/** Merge ICE from backend `/calls/ice-servers` (call after login). */
export function setServerIceServers(servers) {
  serverIceServers = Array.isArray(servers) ? servers.filter(Boolean) : [];
}

export async function ensureIceServersReady(force = false) {
  if (!force && serverIceServers.length) return;
  if (prefetchPromise && !force) {
    await prefetchPromise;
    return;
  }
  if (typeof window === "undefined") return;

  prefetchPromise = (async () => {
    try {
      const { api } = await import("./api");
      const { data } = await api.get("/calls/ice-servers");
      if (Array.isArray(data?.iceServers) && data.iceServers.length) {
        setServerIceServers(data.iceServers);
      }
    } catch {
      /* env / STUN defaults still apply */
    }
  })();

  await prefetchPromise;
}

export async function prefetchIceServers() {
  await ensureIceServersReady(false);
}

export function getRtcConfiguration() {
  const fromEnv = parseEnvIceServers(process.env.NEXT_PUBLIC_WEBRTC_ICE_SERVERS);
  const merged = mergeIceServers(fromEnv, serverIceServers, DEFAULT_STUN_SERVERS);
  const iceServers = hasTurnCredentials(merged)
    ? merged
    : mergeIceServers(merged, DEFAULT_TURN_SERVERS);

  const policy = process.env.NEXT_PUBLIC_WEBRTC_ICE_TRANSPORT_POLICY;
  const iceTransportPolicy =
    policy === "relay" ? "relay" : undefined;

  const poolRaw = process.env.NEXT_PUBLIC_WEBRTC_ICE_CANDIDATE_POOL_SIZE;
  const iceCandidatePoolSize = poolRaw ? Number(poolRaw) : undefined;
  const cfg = {
    iceServers,
    bundlePolicy: "max-bundle",
    rtcpMuxPolicy: "require",
    ...(iceTransportPolicy ? { iceTransportPolicy } : {}),
    ...(Number.isFinite(iceCandidatePoolSize) && iceCandidatePoolSize > 0
      ? { iceCandidatePoolSize }
      : {}),
  };

  return cfg;
}
