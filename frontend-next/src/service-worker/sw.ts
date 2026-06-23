/// <reference lib="webworker" />

/*
 * Vegasphere — Web Push + notification click → deep link + brand chime.
 * Compiled to public/sw.js via `npm run build:sw`.
 */
const SOUND_URL = "/sounds/vega-chime.wav";

type PushPayload = {
  title: string;
  body: string;
  tag: string;
  playSound: boolean;
  data: Record<string, unknown>;
};

type ClientMessage =
  | { type: "SKIP_WAITING" }
  | { type: "vega-prime-sound" };

declare const self: ServiceWorkerGlobalScope;

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event: ExtendableEvent) => {
  event.waitUntil(self.clients.claim());
});

async function parsePushPayload(event: PushEvent): Promise<PushPayload> {
  const fallback: PushPayload = {
    title: "Vegasphere",
    body: "New message",
    tag: "vegasphere",
    playSound: true,
    data: {},
  };
  if (!event.data) return fallback;
  try {
    const text = await Promise.resolve(event.data.text());
    try {
      const j = JSON.parse(text) as {
        title?: string;
        body?: string;
        tag?: string;
        playSound?: boolean;
        data?: Record<string, unknown>;
        url?: string;
      };
      return {
        title: j.title || fallback.title,
        body: j.body || fallback.body,
        tag: j.tag || fallback.tag,
        playSound: j.playSound !== false,
        data:
          j.data && typeof j.data === "object"
            ? j.data
            : typeof j.url === "string"
              ? { url: j.url }
              : {},
      };
    } catch {
      return { ...fallback, body: text || fallback.body };
    }
  } catch {
    return fallback;
  }
}

function notifyClientsPlaySound(): Promise<void> {
  return self.clients
    .matchAll({ type: "window", includeUncontrolled: true })
    .then((list) => {
      for (const client of list) {
        client.postMessage({ type: "vega-play-notify-sound" });
      }
    })
    .catch(() => undefined);
}

self.addEventListener("push", (event: PushEvent) => {
  event.waitUntil(
    parsePushPayload(event).then(({ title, body, tag, data, playSound }) => {
      const url =
        (typeof data.url === "string" && data.url) ||
        (typeof data.conversationId === "string"
          ? `/chat/${data.conversationId}`
          : "/chats");
      const tasks: Promise<unknown>[] = [
        self.registration.showNotification(title, {
          body,
          tag,
          icon: "/icon.svg",
          badge: "/icon.svg",
          silent: !playSound,
          data: { ...data, url },
        }),
      ];
      if (playSound) {
        tasks.push(notifyClientsPlaySound());
      }
      return Promise.all(tasks);
    }),
  );
});

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  const raw = (event.notification.data || {}) as Record<string, unknown>;
  const path =
    typeof raw.url === "string" && raw.url.startsWith("/")
      ? raw.url
      : typeof raw.conversationId === "string"
        ? `/chat/${raw.conversationId}`
        : "/chats";
  const targetUrl = new URL(path, self.location.origin).href;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((list) => {
        for (const c of list) {
          if (!c.url.startsWith(self.location.origin)) continue;
          const client = c as WindowClient;
          if (typeof client.navigate === "function") {
            return client.navigate(targetUrl).then(() => client.focus());
          }
          if ("focus" in client) return client.focus();
        }
        if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
        return undefined;
      }),
  );
});

self.addEventListener("message", (event: ExtendableMessageEvent) => {
  const data = event.data as ClientMessage | null;
  if (data?.type === "SKIP_WAITING") {
    self.skipWaiting();
    return;
  }
  if (data?.type === "vega-prime-sound") {
    event.waitUntil(
      fetch(SOUND_URL).catch(() => undefined).then(() => notifyClientsPlaySound()),
    );
  }
});

export {};
