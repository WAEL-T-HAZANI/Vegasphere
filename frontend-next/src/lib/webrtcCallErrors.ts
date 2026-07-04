// @ts-nocheck

/** Map getUserMedia / device errors to CallScreenOverlay notice keys. */
export function mapCallMediaError(err) {
  const name = String(err?.name || "");
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "permission-denied";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "no-device";
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return "device-busy";
  }
  if (name === "OverconstrainedError") {
    return "device-constraint";
  }
  return "failed";
}

export const OUTGOING_RING_TIMEOUT_MS = 55_000;
export const INCOMING_RING_TIMEOUT_MS = 85_000;
