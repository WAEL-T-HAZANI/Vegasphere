"use client";

/**
 * Wraps all logged-in app routes (the (shell) route group).
 * Redirects to login when unauthenticated; shows a skeleton while session loads.
 */
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAppSelector } from "@/store/hooks";
import { loginRedirectUrl } from "@/lib/routes";
import DashboardShellLoading from "@/components/layout/DashboardShellLoading";

export default function DashboardAuthGuard({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const status = useAppSelector((s) => s.auth.status);

  useEffect(() => {
    if (status === "anonymous") {
      router.replace(loginRedirectUrl(pathname));
    }
  }, [pathname, status, router]);

  if (status === "anonymous") {
    return null;
  }

  if (status === "idle" || status === "loading") {
    return <DashboardShellLoading className="min-h-dvh" />;
  }

  return children;
}
