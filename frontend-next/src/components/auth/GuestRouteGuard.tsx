"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAppSelector } from "@/store/hooks";
import VegaLoadingScreen from "@/components/marketing/VegaLoadingScreen";
import { getSafeNextPath } from "@/lib/authRedirect";

/** Login/signup pages: redirect away if already authenticated. */
export default function GuestRouteGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<VegaLoadingScreen fullScreen={false} className="min-h-dvh" />}>
      <GuestRouteGuardInner>{children}</GuestRouteGuardInner>
    </Suspense>
  );
}

function GuestRouteGuardInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const status = useAppSelector((s) => s.auth.status);
  const user = useAppSelector((s) => s.auth.user);

  const nextRaw = searchParams.get("next");
  const safeNext = getSafeNextPath(nextRaw || "/chats");
  const isAuthed = status === "authenticated" && Boolean(user?._id);
  const isVerifyEmail = pathname?.includes("/verify-email");

  useEffect(() => {
    if (isAuthed && !isVerifyEmail) router.replace(safeNext);
  }, [isAuthed, isVerifyEmail, router, safeNext]);

  if (isAuthed && !isVerifyEmail) {
    return <VegaLoadingScreen fullScreen={false} className="min-h-dvh" />;
  }

  return children;
}
