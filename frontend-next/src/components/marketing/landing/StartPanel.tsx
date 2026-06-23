"use client";

import Link from "next/link";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import PanelShell from "./PanelShell";

type StartPanelProps = {
  t: (_key: string) => string;
  rtl: boolean;
  isActive: boolean;
};

export default function StartPanel({ t, rtl }: StartPanelProps) {
  return (
    <PanelShell id="start" rtl={rtl} centered>
      <div className="mx-auto flex w-full min-w-0 max-w-xl flex-col items-center text-center lg:max-w-2xl">
        <div className="w-full min-w-0">
          <p className="vega-latin-display text-[10px] font-bold vega-brand-text sm:text-[11px]">
            {t("landingStartKicker")}
          </p>
          <h2 className="mx-auto mt-2 max-w-lg text-balance text-xl font-light leading-tight tracking-tight min-[360px]:text-2xl min-[390px]:text-3xl sm:mt-3 sm:text-4xl md:text-5xl">
            {t("landingStartTitle")}
          </h2>
          <p className="vega-ar-copy mx-auto mt-3 max-w-md text-sm leading-relaxed vega-muted min-[390px]:mt-4 sm:text-base">
            {t("landingStartBody")}
          </p>

          <div className="mt-5 flex w-full min-w-0 flex-col items-stretch gap-2.5 min-[390px]:mt-6 min-[390px]:gap-3 sm:mt-8 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center">
            <Link
              href="/signup"
              className="vega-btn-accent w-full min-w-0 sm:min-w-[9rem] sm:w-auto"
            >
              {t("signup")}
            </Link>
            <Link
              href="/login"
              className="vega-btn-ghost w-full min-w-0 sm:min-w-[9rem] sm:w-auto"
            >
              {t("login")}
            </Link>
          </div>
        </div>

        <MarketingFooter className="mt-5 sm:mt-6" />
      </div>
    </PanelShell>
  );
}
