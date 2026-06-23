"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/classNames";

type MarketingBackButtonProps = {
  href?: string;
  label?: string;
  className?: string;
};

export default function MarketingBackButton({
  href = "/",
  label,
  className,
}: MarketingBackButtonProps) {
  const { t, i18n } = useTranslation();
  const rtl = i18n.dir() === "rtl";
  const BackIcon = rtl ? ChevronRight : ChevronLeft;

  return (
    <Link
      href={href}
      className={cn(
        "vega-btn-ghost inline-flex items-center gap-2 px-4 py-2 text-xs no-underline",
        className,
      )}
    >
      <BackIcon className="h-4 w-4 shrink-0" aria-hidden />
      <span>{label ?? t("back")}</span>
    </Link>
  );
}
