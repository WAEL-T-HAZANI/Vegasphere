import { NextResponse } from "next/server";
import { getSafeNextPath } from "@/lib/authRedirect";
import {
  AUTH_SESSION_COOKIE,
  isAuthRoute,
  isDashboardRoute,
} from "@/lib/routes";

function resolveThemeCookie(request) {
  const theme = request.cookies.get("vegasphere-next-theme")?.value;
  if (theme === "dark" || theme === "light") return theme;
  const prefersDark =
    request.headers.get("sec-ch-prefers-color-scheme") === "dark";
  return prefersDark ? "dark" : "light";
}

export function middleware(request) {
  const { pathname } = request.nextUrl;

  if (pathname === "/favicon.ico") {
    const isDark = resolveThemeCookie(request) === "dark";
    const url = request.nextUrl.clone();
    url.pathname = isDark ? "/icon-dark.svg" : "/icon-light.svg";
    return NextResponse.rewrite(url);
  }

  const hasSession = request.cookies.get(AUTH_SESSION_COOKIE)?.value === "1";

  if (isDashboardRoute(pathname) && !hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthRoute(pathname) && hasSession) {
    const next = request.nextUrl.searchParams.get("next");
    const dest = getSafeNextPath(next);
    return NextResponse.redirect(new URL(dest, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/favicon.ico",
    "/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?)$).*)",
  ],
};
