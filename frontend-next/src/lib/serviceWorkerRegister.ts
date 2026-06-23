const SW_URL = "/sw.js";
const SW_SCOPE = "/";

export class ServiceWorkerSetupError extends Error {
  code: "unsupported" | "insecure" | "timeout" | "push_unavailable";

  constructor(code: ServiceWorkerSetupError["code"], message: string) {
    super(message);
    this.code = code;
    this.name = "ServiceWorkerSetupError";
  }
}

function waitForActiveWorker(
  reg: ServiceWorkerRegistration,
  timeoutMs: number,
): Promise<void> {
  if (reg.active?.state === "activated") return Promise.resolve();

  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(
        new ServiceWorkerSetupError(
          "timeout",
          "Service worker did not activate in time",
        ),
      );
    }, timeoutMs);

    const finish = () => {
      window.clearTimeout(timer);
      resolve();
    };

    const watch = (worker: ServiceWorker | null) => {
      if (!worker) return;
      if (worker.state === "activated") {
        finish();
        return;
      }
      worker.addEventListener("statechange", () => {
        if (worker.state === "activated") finish();
      });
    };

    watch(reg.installing);
    watch(reg.waiting);

    reg.addEventListener("updatefound", () => {
      watch(reg.installing);
    });

    if (reg.waiting) {
      reg.waiting.postMessage({ type: "SKIP_WAITING" });
    }
  });
}

/** Register `/sw.js` and wait until it is active (required for Web Push). */
export async function ensurePushServiceWorker(
  timeoutMs = 15_000,
): Promise<ServiceWorkerRegistration> {
  if (typeof window === "undefined") {
    throw new ServiceWorkerSetupError("unsupported", "No window");
  }
  if (!window.isSecureContext) {
    throw new ServiceWorkerSetupError(
      "insecure",
      "Push requires HTTPS or localhost",
    );
  }
  if (!("serviceWorker" in navigator)) {
    throw new ServiceWorkerSetupError("unsupported", "No serviceWorker");
  }
  if (!("PushManager" in window)) {
    throw new ServiceWorkerSetupError("unsupported", "No PushManager");
  }

  let reg = await navigator.serviceWorker.getRegistration(SW_SCOPE);
  if (!reg) {
    reg = await navigator.serviceWorker.register(SW_URL, {
      scope: SW_SCOPE,
      updateViaCache: "none",
    });
  }

  await waitForActiveWorker(reg, timeoutMs);

  if (!reg.active) {
    await navigator.serviceWorker.ready;
    reg = (await navigator.serviceWorker.getRegistration(SW_SCOPE)) || reg;
  }

  if (!reg.pushManager) {
    throw new ServiceWorkerSetupError(
      "push_unavailable",
      "Push service not available on this browser",
    );
  }

  return reg;
}

/** Fire-and-forget registration for app boot (sound + later push). */
export function registerAppServiceWorker() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  void ensurePushServiceWorker(12_000).catch(() => {
    /* Settings flow will surface errors when user subscribes */
  });
}
