import {
  dmPeerMember,
  displayUserPrimaryLabel,
  groupChannelDisplayName,
  groupChannelInfoTitleKey,
} from "@/lib/chatList";
import { shellAccountNav, shellMainNav } from "@/lib/shellNav";

export const APP_DOCUMENT_TITLE = "Vegasphere";
export const FAVICON_LIGHT = "/icon-light.svg";
export const FAVICON_DARK = "/icon-dark.svg";

type TitleOptions = {
  conversation?: {
    _id?: string;
    name?: string;
    chatName?: string;
    isGroup?: boolean;
    isChannel?: boolean;
    isSelfChat?: boolean;
    members?: Array<{ _id?: string; name?: string; username?: string; email?: string } | string>;
  };
  myUserId?: string;
};

type TranslateFn = (key: string) => string;

const NAV_ROUTES = [...shellMainNav, ...shellAccountNav];

export function formatDocumentTitle(segment?: string | null) {
  const label = String(segment || "").trim();
  if (!label) return APP_DOCUMENT_TITLE;
  return `${APP_DOCUMENT_TITLE} | ${label}`;
}

function normalizePath(pathname: string) {
  const path = String(pathname || "/").split("?")[0].split("#")[0];
  if (path.length > 1 && path.endsWith("/")) return path.slice(0, -1);
  return path || "/";
}

function conversationLabel(conv: NonNullable<TitleOptions["conversation"]>, myUserId: string | undefined, t: TranslateFn) {
  if (conv.isSelfChat) return t("navSaved");
  if (conv.isGroup || conv.isChannel) {
    return groupChannelDisplayName(conv) || t("navChats");
  }
  const peer = dmPeerMember(conv, myUserId);
  if (peer && typeof peer === "object") {
    return displayUserPrimaryLabel(peer);
  }
  return String(conv.name || "").trim() || t("navChats");
}

export function resolvePageTitleSegment(
  pathname: string,
  t: TranslateFn,
  options: TitleOptions = {},
) {
  const path = normalizePath(pathname);

  if (path === "/legal/terms") return t("termsTitle");
  if (path === "/legal/privacy") return t("privacyTitle");
  if (path === "/legal/contact") return t("contactTitle");

  if (path === "/login") return t("login");
  if (path === "/signup") return t("signup");
  if (path === "/forgot-password") return t("forgotPasswordTitle");
  if (path === "/reset-password") return t("resetPasswordTitle");
  if (path === "/verify-email") return t("verifyEmailTitle");

  if (path.startsWith("/join/")) return t("joinTitle");
  if (path.startsWith("/call/")) return t("callInviteJoiningTitle");

  if (path.startsWith("/user/")) return t("viewProfile");

  if (path === "/saved") return t("navSaved");

  const infoMatch = path.match(/^\/chat\/([^/]+)\/info$/);
  if (infoMatch) {
    const conv = options.conversation;
    if (conv) {
      const infoLabel = t(groupChannelInfoTitleKey(conv));
      const name = groupChannelDisplayName(conv);
      return name ? `${infoLabel} — ${name}` : infoLabel;
    }
    return t("chatGroupInfo");
  }

  const chatMatch = path.match(/^\/chat\/([^/]+)$/);
  if (chatMatch) {
    const conv = options.conversation;
    if (conv) return conversationLabel(conv, options.myUserId, t);
    return t("navChats");
  }

  for (const item of NAV_ROUTES) {
    if (path === item.href) return t(item.key);
    if (item.href !== "/chats" && path.startsWith(`${item.href}/`)) {
      return t(item.key);
    }
  }

  if (path === "/chats") return t("navChats");
  if (path === "/") return null;

  return null;
}

export function syncThemeFavicon(isDark: boolean) {
  if (typeof document === "undefined") return;
  const href = `${isDark ? FAVICON_DARK : FAVICON_LIGHT}?theme=${isDark ? "dark" : "light"}`;

  document
    .querySelectorAll<HTMLLinkElement>(
      'link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]',
    )
    .forEach((el) => {
      if (!el.dataset.vegaFavicon) el.remove();
    });

  let link = document.querySelector<HTMLLinkElement>("link[data-vega-favicon]");
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    link.type = "image/svg+xml";
    link.dataset.vegaFavicon = "true";
    document.head.appendChild(link);
  }
  if (link.getAttribute("href") !== href) link.setAttribute("href", href);
}
