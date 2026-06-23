"use client";

import { useTranslation } from "react-i18next";
import { LANDING_PANELS } from "./constants";
import { cn } from "@/lib/classNames";

type LandingPanelsNavProps = {
  rtl: boolean;
  activePanel: number;
  onSelect: (_index: number) => void;
};

export default function LandingPanelsNav({
  rtl,
  activePanel,
  onSelect,
}: LandingPanelsNavProps) {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language?.startsWith("ar");

  return (
    <nav
      dir={rtl ? "rtl" : "ltr"}
      className={cn(
        "vega-marketing-body relative z-20 w-full min-w-0 shrink-0 border-b vega-hairline bg-[rgb(var(--vega-paper)/0.9)] backdrop-blur-sm",
        "flex flex-wrap items-center justify-center gap-1.5 px-3 pb-2 pt-2",
        "min-[390px]:gap-2 min-[390px]:px-4",
        "sm:flex-nowrap sm:gap-2.5 sm:overflow-x-auto sm:px-6 sm:pb-3 sm:pt-3",
        "sm:[scrollbar-width:none] sm:[&::-webkit-scrollbar]:hidden",
        "md:px-8 lg:px-10",
      )}
      aria-label="Sections"
    >
      {LANDING_PANELS.map((panel, i) => (
        <button
          key={panel.id}
          type="button"
          onClick={() => onSelect(i)}
          className={cn(
            "vega-tab-btn shrink-0 rounded-full px-2.5 py-1.5 text-[10px] font-bold transition-all duration-300",
            "min-[390px]:px-3 min-[390px]:py-2 min-[390px]:text-[11px]",
            "sm:px-4 sm:py-2.5 sm:text-xs",
            !isArabic && "vega-latin-display",
            i === activePanel ? "vega-tab-active" : "vega-tab-idle",
          )}
        >
          {"shortLabelKey" in panel && panel.shortLabelKey ? (
            <>
              <span className="sm:hidden">{t(panel.shortLabelKey)}</span>
              <span className="hidden sm:inline">{t(panel.labelKey)}</span>
            </>
          ) : (
            t(panel.labelKey)
          )}
        </button>
      ))}
    </nav>
  );
}
