"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import PanelIntro from "./PanelIntro";
import PanelShell from "./PanelShell";

type PrivacyPanelProps = {
  t: (_key: string) => string;
  rtl: boolean;
  isActive: boolean;
};

export default function PrivacyPanel({ t, rtl, isActive }: PrivacyPanelProps) {
  const pillars = [
    { titleKey: "landingPrivacy1Title", bodyKey: "landingPrivacy1Body" },
    { titleKey: "landingPrivacy2Title", bodyKey: "landingPrivacy2Body" },
    { titleKey: "landingPrivacy3Title", bodyKey: "landingPrivacy3Body" },
  ];

  return (
    <PanelShell id="privacy" rtl={rtl}>
      <PanelIntro
        isActive={isActive}
        title={t("landingPrivacyTitle")}
        body={t("landingPrivacyBody")}
      />

      <div className="mx-auto grid w-full min-w-0 max-w-3xl grid-cols-1 gap-2.5 min-[390px]:gap-3 sm:gap-4 lg:max-w-4xl">
        {pillars.map((pillar, i) => (
          <div
            key={pillar.titleKey}
            className="group min-w-0 rounded-xl border border-[rgb(var(--vega-brand)/0.2)] vega-glass p-3 transition-colors duration-300 hover:border-[rgb(var(--vega-brand)/0.5)] min-[390px]:p-4 sm:rounded-2xl sm:p-5 md:rounded-3xl"
          >
            <div className="flex items-start gap-3 sm:items-center">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-[rgb(var(--vega-brand))] bg-transparent text-sm font-bold vega-brand-text sm:h-12 sm:w-12">
                {i + 1}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-semibold sm:text-lg">
                  {t(pillar.titleKey)}
                </h3>
                <p className="vega-ar-copy mt-1 text-sm leading-relaxed vega-muted">
                  {t(pillar.bodyKey)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex justify-center sm:mt-5">
        <Link
          href="/legal/privacy"
          className="vega-btn-ghost inline-flex gap-2 text-xs sm:text-sm"
        >
          <Lock className="h-4 w-4 shrink-0" />
          {t("landingReadPrivacyPolicy")}
        </Link>
      </div>
    </PanelShell>
  );
}
