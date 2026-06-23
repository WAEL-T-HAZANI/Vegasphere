"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Bot, MessageCircle, PhoneCall, Users } from "lucide-react";
import PanelIntro from "./PanelIntro";
import PanelShell from "./PanelShell";
import { PANEL_EASE } from "./constants";

type FeaturesPanelProps = {
  t: (_key: string) => string;
  rtl: boolean;
  isActive: boolean;
};

export default function FeaturesPanel({ t, rtl, isActive }: FeaturesPanelProps) {
  const reduceMotion = useReducedMotion();
  const items = [
    { Icon: MessageCircle, titleKey: "landingFeature1Title", bodyKey: "landingFeature1Body" },
    { Icon: Users, titleKey: "landingFeature2Title", bodyKey: "landingFeature2Body" },
    { Icon: PhoneCall, titleKey: "landingFeature3Title", bodyKey: "landingFeature3Body" },
    { Icon: Bot, titleKey: "landingFeature4Title", bodyKey: "landingFeature4Body" },
  ];

  return (
    <PanelShell id="features" rtl={rtl}>
      <PanelIntro
        isActive={isActive}
        title={t("landingFeaturesTitle")}
        body={t("landingFeaturesBody")}
      />

      <div className="grid w-full min-w-0 grid-cols-1 gap-2 min-[390px]:gap-2.5 sm:grid-cols-2 sm:gap-3 md:gap-4 xl:gap-5">
        {items.map((item, i) => (
          <motion.article
            key={item.titleKey}
            initial={reduceMotion ? false : { y: 20 }}
            animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0.85, y: 0 }}
            transition={{ delay: reduceMotion ? 0 : 0.08 + i * 0.07, duration: 0.45, ease: PANEL_EASE }}
            whileHover={reduceMotion ? undefined : { y: -6 }}
            className="group min-w-0 rounded-xl border border-[rgb(var(--vega-brand)/0.2)] vega-glass p-3 transition-colors duration-300 hover:border-[rgb(var(--vega-brand)/0.5)] min-[390px]:p-4 sm:rounded-2xl sm:p-5 md:rounded-3xl"
          >
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[rgb(var(--vega-brand)/0.25)] bg-[rgb(var(--vega-paper))] transition-all duration-300 group-hover:border-[rgb(var(--vega-brand))]/50 group-hover:bg-[rgb(var(--vega-brand)/0.08)] group-hover:shadow-[0_0_22px_rgb(var(--vega-brand)/0.25)] sm:h-12 sm:w-12 sm:rounded-2xl">
                <item.Icon className="h-5 w-5 vega-brand-text transition-transform duration-300 group-hover:scale-110" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-semibold leading-snug sm:text-lg">
                  {t(item.titleKey)}
                </h3>
                <p className="vega-ar-copy mt-1 text-sm leading-relaxed vega-muted">
                  {t(item.bodyKey)}
                </p>
              </div>
            </div>
          </motion.article>
        ))}
      </div>
    </PanelShell>
  );
}
