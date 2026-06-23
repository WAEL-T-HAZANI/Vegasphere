import type { LucideIcon } from "lucide-react";
import { shellAccountNav, shellMainNav, type ShellNavItem } from "@/lib/shellNav";

/** Real-time socket events each tab listens for (global chat events live in socketChatListeners). */
export const SHELL_SOCKET_EVENTS = {
  chats: [
    "receive-message",
    "typing",
    "stop-typing",
    "message-edited",
    "message-updated",
    "message-delivered",
    "message-read",
    "message-deleted",
    "message-reacted",
    "message-pin-sync",
    "new-message-notification",
  ],
  status: ["status-updated"],
  networking: ["networking-updated"],
  calls: ["calls-updated"],
  notifications: [
    "notification-created",
    "notification-updated",
    "notifications-updated",
  ],
} as const;

export type ShellTabWiring = {
  /** Sidebar nav item (undefined for auxiliary routes like /saved). */
  nav?: ShellNavItem;
  href: string;
  /** Backend Express mount(s) this tab talks to. */
  backendMounts: string[];
  /** Frontend client module(s) — see `lib/clients/`. */
  clientModules: string[];
  /** Pure frontend helpers (no HTTP). */
  hubModules: string[];
  /** Socket.io events this tab subscribes to, if any. */
  socketEvents: readonly string[];
};

const byHref = (href: string) =>
  [...shellMainNav, ...shellAccountNav].find((item) => item.href === href);

/** Canonical map: dashboard tab → frontend libs ↔ backend routes. */
export const SHELL_TAB_WIRING: ShellTabWiring[] = [
  {
    nav: byHref("/chats"),
    href: "/chats",
    backendMounts: ["/conversation", "/message", "/user"],
    clientModules: ["conversationClient", "messageClient", "userClient"],
    hubModules: ["chatList", "syncConversations", "socketChatListeners"],
    socketEvents: SHELL_SOCKET_EVENTS.chats,
  },
  {
    nav: byHref("/notifications"),
    href: "/notifications",
    backendMounts: ["/user"],
    clientModules: ["notificationsClient", "userClient"],
    hubModules: [],
    socketEvents: SHELL_SOCKET_EVENTS.notifications,
  },
  {
    nav: byHref("/search"),
    href: "/search",
    backendMounts: ["/search", "/conversation", "/user"],
    clientModules: ["searchClient", "conversationClient", "userClient"],
    hubModules: ["searchHub", "searchQuery"],
    socketEvents: [],
  },
  {
    nav: byHref("/status"),
    href: "/status",
    backendMounts: ["/status"],
    clientModules: ["statusClient"],
    hubModules: ["statusGroups", "statusMedia"],
    socketEvents: SHELL_SOCKET_EVENTS.status,
  },
  {
    nav: byHref("/networking"),
    href: "/networking",
    backendMounts: ["/networking", "/conversation", "/user"],
    clientModules: ["networkingClient", "conversationClient", "userClient"],
    hubModules: ["networkingHub"],
    socketEvents: SHELL_SOCKET_EVENTS.networking,
  },
  {
    nav: byHref("/groups"),
    href: "/groups",
    backendMounts: ["/conversation"],
    clientModules: ["conversationClient"],
    hubModules: ["groupsHub", "syncConversations"],
    socketEvents: [],
  },
  {
    nav: byHref("/channels"),
    href: "/channels",
    backendMounts: ["/conversation"],
    clientModules: ["conversationClient"],
    hubModules: ["channelsHub", "syncConversations"],
    socketEvents: [],
  },
  {
    nav: byHref("/calls"),
    href: "/calls",
    backendMounts: ["/calls", "/conversation"],
    clientModules: ["callsClient", "conversationClient", "authClient"],
    hubModules: ["callLaunch", "callHistory", "webrtcRtcConfig"],
    socketEvents: SHELL_SOCKET_EVENTS.calls,
  },
  {
    nav: byHref("/ai-services"),
    href: "/ai-services",
    backendMounts: ["/ai"],
    clientModules: ["aiClient"],
    hubModules: ["aiPreviewContext", "translateLanguages", "smartReplyContext"],
    socketEvents: [],
  },
  {
    nav: byHref("/profile"),
    href: "/profile",
    backendMounts: ["/auth", "/user"],
    clientModules: ["authClient", "userClient"],
    hubModules: ["profileLimits", "avatarUrl"],
    socketEvents: [],
  },
  {
    nav: byHref("/settings"),
    href: "/settings",
    backendMounts: ["/auth", "/user"],
    clientModules: ["authClient", "userClient"],
    hubModules: ["localPrefs", "syncUserNotificationPrefs"],
    socketEvents: [],
  },
  {
    nav: byHref("/privacy"),
    href: "/privacy",
    backendMounts: ["/auth", "/user"],
    clientModules: ["authClient", "userClient"],
    hubModules: [],
    socketEvents: [],
  },
  {
    href: "/user",
    backendMounts: ["/user", "/conversation", "/status"],
    clientModules: ["userClient", "conversationClient", "statusClient"],
    hubModules: ["formatPresence"],
    socketEvents: [],
  },
  {
    href: "/saved",
    backendMounts: ["/message"],
    clientModules: ["messageClient"],
    hubModules: [],
    socketEvents: [],
  },
];

export function wiringForPath(pathname: string): ShellTabWiring | undefined {
  return SHELL_TAB_WIRING.find(
    (row) => pathname === row.href || pathname.startsWith(`${row.href}/`),
  );
}

export function allShellHrefs(): string[] {
  return SHELL_TAB_WIRING.map((row) => row.href);
}

export type { ShellNavItem, LucideIcon };
