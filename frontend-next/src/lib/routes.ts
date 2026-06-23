export const AUTH_SESSION_COOKIE = "vs_auth";

export const AUTH_ROUTES = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
] as const;

export const LEGAL_ROUTES = [
  "/legal/privacy",
  "/legal/terms",
  "/legal/contact",
] as const;

/** URL prefixes for the logged-in app (Next.js route group `(shell)`). */
const DASHBOARD_ROUTE_PREFIXES = [
  "/chats",
  "/notifications",
  "/search",
  "/status",
  "/groups",
  "/channels",
  "/calls",
  "/ai-services",
  "/networking",
  "/saved",
  "/profile",
  "/settings",
  "/privacy",
  "/chat",
  "/user",
] as const;

export function isDashboardRoute(pathname: string | null | undefined): boolean {
  if (!pathname || typeof pathname !== "string") return false;
  return DASHBOARD_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isAuthRoute(pathname: string | null | undefined): boolean {
  if (!pathname || typeof pathname !== "string") return false;
  return AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export function isLegalRoute(pathname: string | null | undefined): boolean {
  if (!pathname || typeof pathname !== "string") return false;
  return LEGAL_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export function isPublicRoute(pathname: string | null | undefined): boolean {
  if (!pathname || typeof pathname !== "string") return false;
  if (pathname === "/") return true;
  if (isLegalRoute(pathname)) return true;
  if (isAuthRoute(pathname)) return true;
  if (pathname === "/verify-email" || pathname.startsWith("/verify-email")) return true;
  if (pathname.startsWith("/join/")) return true;
  if (pathname.startsWith("/call/")) return true;
  return false;
}

export function loginRedirectUrl(pathname: string | null | undefined): string {
  const next = pathname && pathname.startsWith("/") ? pathname : "/chats";
  return `/login?next=${encodeURIComponent(next)}`;
}

export function syncAuthSessionCookie(hasToken: boolean): void {
  if (typeof document === "undefined") return;
  try {
    if (hasToken) {
      document.cookie = `${AUTH_SESSION_COOKIE}=1;path=/;max-age=31536000;SameSite=Lax`;
    } else {
      document.cookie = `${AUTH_SESSION_COOKIE}=;path=/;max-age=0;SameSite=Lax`;
    }
  } catch {
    /* ignore cookie write failures */
  }
}
