"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/classNames";

type LegalPath = "/legal/privacy" | "/legal/terms" | "/legal/contact";

type MarketingFooterProps = {
  className?: string;
  /** Highlight active legal route (legal pages). */
  currentPath?: LegalPath;
  /** `inline` = landing start panel; `bar` = legal page footer bar */
  variant?: "inline" | "bar";
};

export default function MarketingFooter({
  className,
  currentPath,
  variant = "inline",
}: MarketingFooterProps) {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  const links: { href: LegalPath; label: string }[] = [
    { href: "/legal/privacy", label: t("homeFooterPrivacy") },
    { href: "/legal/terms", label: t("homeFooterTerms") },
    { href: "/legal/contact", label: t("homeFooterContact") },
  ];

  const nav = (
    <nav
      className={cn(
        "flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px] font-semibold sm:text-xs",
        variant === "bar" && "gap-2 md:justify-end",
      )}
      aria-label="Legal"
    >
      {links.map((link) => {
        const active = currentPath === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "transition",
              variant === "bar"
                ? cn(
                    "rounded-full px-3.5 py-1.5",
                    active
                      ? "vega-tab-active"
                      : "vega-muted hover:bg-[rgb(var(--vega-brand)/0.1)] hover:text-[rgb(var(--vega-brand))]",
                  )
                : cn(
                    "vega-muted hover:vega-brand-text",
                    active && "vega-brand-text",
                  ),
            )}
            aria-current={active ? "page" : undefined}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );

  if (variant === "bar") {
    return (
      <footer
        className={cn(
          "vega-marketing-body relative z-10 border-t vega-hairline px-4 py-5 pb-safe sm:px-6 md:px-10 md:py-6",
          className,
        )}
      >
        <div className="flex w-full flex-col items-center gap-4 text-center md:flex-row md:items-center md:justify-between md:text-start">
          <p className="w-full text-[11px] vega-muted sm:text-xs md:w-auto">
            © {year} Vegasphere. {t("rightsReserved")}
          </p>
          {nav}
        </div>
      </footer>
    );
  }

  return (
    <footer
      className={cn(
        "vega-marketing-body flex w-full flex-col items-center border-t vega-hairline pt-5 text-center",
        className,
      )}
    >
      <p className="w-full text-[11px] vega-muted sm:text-xs">
        © {year} Vegasphere. {t("rightsReserved")}
      </p>
      <div className="mt-3 flex w-full justify-center">{nav}</div>
    </footer>
  );
}
