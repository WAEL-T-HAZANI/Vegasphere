"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import MarketingPageShell from "@/components/marketing/MarketingPageShell";
import { cn } from "@/lib/classNames";

type AuthVariant = "login" | "signup" | "forgot" | "reset" | "verify";

function variantFromPath(path: string): AuthVariant {
  if (path.includes("/signup")) return "signup";
  if (path.includes("/forgot-password")) return "forgot";
  if (path.includes("/reset-password")) return "reset";
  if (path.includes("/verify-email")) return "verify";
  return "login";
}

const CARD_MAX: Record<AuthVariant, string> = {
  login: "max-w-md",
  signup: "max-w-xl",
  forgot: "max-w-md",
  reset: "max-w-md",
  verify: "max-w-md",
};

const SHELL_PAD: Record<AuthVariant, string> = {
  login: "py-5 sm:py-8 md:py-10",
  signup: "py-3 sm:py-5 md:py-6",
  forgot: "py-5 sm:py-8 md:py-10",
  reset: "py-5 sm:py-8 md:py-10",
  verify: "py-5 sm:py-8 md:py-10",
};

export default function AuthMarketingLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const variant = variantFromPath(pathname || "");

  return (
    <MarketingPageShell
      ambientIntensity="soft"
      className="h-[100dvh] max-h-[100dvh] overflow-hidden"
    >
      <main className="relative z-20 min-h-0 w-full flex-1 overflow-y-auto overscroll-y-contain">
        <div
          className={cn(
            "flex min-h-full w-full flex-col items-center justify-center px-4 pb-safe sm:px-6 md:px-8 lg:px-10",
            SHELL_PAD[variant],
          )}
        >
          <div className={cn("w-full shrink-0", CARD_MAX[variant])}>
            <AuthCardShell compact={variant === "signup"}>
              {children}
            </AuthCardShell>
          </div>
        </div>
      </main>
    </MarketingPageShell>
  );
}

function AuthCardShell({
  children,
  compact = false,
}: {
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-[1.35rem] border vega-hairline vega-glass shadow-[0_20px_60px_rgb(0_0_0/0.06)] sm:rounded-[1.75rem] dark:shadow-[0_20px_60px_rgb(255_255_255/0.03)]",
        compact ? "p-4 sm:p-5" : "p-5 sm:p-6 md:p-8",
      )}
    >
      {children}
    </div>
  );
}
