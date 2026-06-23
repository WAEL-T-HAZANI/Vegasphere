import { api } from "@/lib/api";
import {
  ensurePushServiceWorker,
  ServiceWorkerSetupError,
} from "@/lib/serviceWorkerRegister";

export function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export type PushSubscribeResult =
  | { ok: true; subscribed: true }
  | {
      ok: true;
      subscribed: false;
      reason:
        | "unsupported"
        | "not_configured"
        | "insecure"
        | "push_unavailable"
        | "sw_timeout";
    }
  | { ok: false; error: unknown };

function mapSetupError(
  err: ServiceWorkerSetupError,
): PushSubscribeResult {
  if (err.code === "insecure") {
    return { ok: true, subscribed: false, reason: "insecure" };
  }
  if (err.code === "timeout") {
    return { ok: true, subscribed: false, reason: "sw_timeout" };
  }
  if (err.code === "push_unavailable") {
    return { ok: true, subscribed: false, reason: "push_unavailable" };
  }
  return { ok: true, subscribed: false, reason: "unsupported" };
}

function isPushServiceUnavailableError(err: unknown) {
  const msg = String(
    err instanceof Error ? err.message : err || "",
  ).toLowerCase();
  return (
    msg.includes("push service not available") ||
    msg.includes("registration failed")
  );
}

export async function subscribeToWebPush(): Promise<PushSubscribeResult> {
  if (typeof window === "undefined") {
    return { ok: true, subscribed: false, reason: "unsupported" };
  }

  let reg: ServiceWorkerRegistration;
  try {
    reg = await ensurePushServiceWorker();
  } catch (err) {
    if (err instanceof ServiceWorkerSetupError) {
      return mapSetupError(err);
    }
    if (isPushServiceUnavailableError(err)) {
      return { ok: true, subscribed: false, reason: "push_unavailable" };
    }
    return { ok: false, error: err };
  }

  try {
    const { data } = await api.get<{ publicKey?: string }>("/user/push/vapid-public");
    if (!data?.publicKey) {
      return { ok: true, subscribed: false, reason: "not_configured" };
    }

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.publicKey),
      });
    }
    await api.post("/user/push/subscribe", sub.toJSON());
    return { ok: true, subscribed: true };
  } catch (error) {
    if (isPushServiceUnavailableError(error)) {
      return { ok: true, subscribed: false, reason: "push_unavailable" };
    }
    return { ok: false, error };
  }
}

export async function unsubscribeFromWebPush() {
  if (!("serviceWorker" in navigator)) return;
  const reg = await navigator.serviceWorker.getRegistration("/");
  if (!reg) return;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;
  const j = sub.toJSON();
  await sub.unsubscribe();
  if (j.endpoint) {
    await api.post("/user/push/unsubscribe", { endpoint: j.endpoint });
  }
}

export async function isVapidConfigured() {
  try {
    const { data } = await api.get<{ publicKey?: string }>("/user/push/vapid-public");
    return Boolean(data?.publicKey);
  } catch {
    return false;
  }
}
