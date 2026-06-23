import type { LucideIcon } from "lucide-react";
import {
  Bell,
  CircleDot,
  Hash,
  LayoutGrid,
  MessageCircle,
  Network,
  Phone,
  Search,
  Settings,
  Shield,
  UserCircle,
  UsersRound,
} from "lucide-react";

export type ShellNavItem = {
  href: string;
  key: string;
  Icon: LucideIcon;
};

export const shellMainNav: ShellNavItem[] = [
  { href: "/chats", key: "navChats", Icon: MessageCircle },
  { href: "/notifications", key: "navNotifications", Icon: Bell },
  { href: "/calls", key: "navCalls", Icon: Phone },
  { href: "/groups", key: "navGroups", Icon: UsersRound },
  { href: "/channels", key: "navChannels", Icon: Hash },
  { href: "/status", key: "navStatus", Icon: CircleDot },
  { href: "/search", key: "navSearch", Icon: Search },
  { href: "/networking", key: "navNetworking", Icon: Network },
  { href: "/ai-services", key: "navAi", Icon: LayoutGrid },
];

export const shellAccountNav: ShellNavItem[] = [
  { href: "/profile", key: "navProfile", Icon: UserCircle },
  { href: "/settings", key: "navSettings", Icon: Settings },
  { href: "/privacy", key: "navAccountPrivacy", Icon: Shield },
];

export function isShellNavActive(pathname: string, href: string) {
  if (href === "/chats") {
    return (
      pathname === "/chats" ||
      pathname.startsWith("/chat/") ||
      /^\/chats\/[^/]+/.test(pathname)
    );
  }
  if (href === "/search") {
    return (
      pathname === "/search" ||
      pathname.startsWith("/search/") ||
      pathname === "/contacts" ||
      pathname.startsWith("/contacts/")
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
