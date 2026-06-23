"use client";

import { useTranslation } from "react-i18next";
import { Eye } from "lucide-react";
import { cn } from "@/lib/classNames";

type StatusVisibilityBannerProps = {
  peerCount: number;
  className?: string;
};

export default function StatusVisibilityBanner({
  peerCount,
  className,
}: StatusVisibilityBannerProps) {
  const { t, i18n } = useTranslation();
  const rtl = i18n.dir() === "rtl";

  return (
    <section
      dir={rtl ? "rtl" : "ltr"}
      className={cn(
        "vs-settings-card overflow-hidden !p-0",
        className,
      )}
    >
      <div className="vs-brand-panel-head px-4 py-4 sm:px-5">
        <div className="flex items-start gap-3">
          <div className="vs-icon-tile h-10 w-10 shrink-0 rounded-2xl">
            <Eye className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0 text-start">
            <h2 className="text-sm font-semibold text-ink">{t("statusVisibilityTitle")}</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              {peerCount > 0
                ? t("statusVisibilityBody", { count: peerCount })
                : t("statusVisibilityEmpty")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
