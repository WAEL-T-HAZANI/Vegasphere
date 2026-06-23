"use client";

import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import MarketingBackButton from "@/components/marketing/MarketingBackButton";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import MarketingPageShell from "@/components/marketing/MarketingPageShell";
import { cn } from "@/lib/classNames";

type LegalPath = "/legal/privacy" | "/legal/terms" | "/legal/contact";

type LegalPageShellProps = {
  children: ReactNode;
  backHref?: string;
  backLabel?: string;
  currentPath: LegalPath;
  maxWidth?: "md" | "lg" | "xl";
  hero?: ReactNode;
};

const MAX_WIDTH = {
  md: "max-w-3xl",
  lg: "max-w-4xl",
  xl: "max-w-6xl",
} as const;

export default function LegalPageShell({
  children,
  backHref = "/",
  backLabel,
  currentPath,
  maxWidth = "lg",
  hero,
}: LegalPageShellProps) {
  const { i18n } = useTranslation();
  const rtl = i18n.dir() === "rtl";

  return (
    <MarketingPageShell ambientIntensity="soft">
      <main
        className={cn(
          "vega-marketing-body relative z-10 mx-auto w-full flex-1 px-4 py-6 pb-safe sm:px-6 md:px-8 md:py-10 lg:px-10",
          MAX_WIDTH[maxWidth],
        )}
        dir={rtl ? "rtl" : "ltr"}
      >
        <MarketingBackButton href={backHref} label={backLabel} />
        {hero ? <div className="mt-8">{hero}</div> : null}
        <div className={hero ? "mt-10" : "mt-8"}>{children}</div>
      </main>

      <MarketingFooter variant="bar" currentPath={currentPath} />
    </MarketingPageShell>
  );
}
