// @ts-nocheck
const DEFAULT_STUN_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:stun.services.mozilla.com:3478" },
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

let serverIceServers = [];

/** Merge ICE from backend `/calls/ice-servers` (call after login). */
export function setServerIceServers(servers) {
  serverIceServers = Array.isArray(servers) ? servers.filter(Boolean) : [];
}

export async function prefetchIceServers() {
  if (typeof window === "undefined") return;
  if (serverIceServers.length) return;
  try {
    const { api } = await import("./api");
    const { data } = await api.get("/calls/ice-servers");
    if (Array.isArray(data?.iceServers)) {
      setServerIceServers(data.iceServers);
    }
  } catch {
    /* env / STUN defaults still apply */
  }
}

export function getRtcConfiguration() {
  const fromEnv = parseEnvIceServers(process.env.NEXT_PUBLIC_WEBRTC_ICE_SERVERS);
  const iceServers = mergeIceServers(fromEnv, serverIceServers, DEFAULT_STUN_SERVERS);

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
