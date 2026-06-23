"use client";

import { motion } from "framer-motion";
import OrbitalShowcase from "@/components/marketing/OrbitalShowcase";
import PanelIntro from "./PanelIntro";
import PanelShell from "./PanelShell";

type HomePanelProps = {
  t: (_key: string) => string;
  rtl: boolean;
  isActive: boolean;
};

export default function HomePanel({ t, rtl, isActive }: HomePanelProps) {
  return (
    <PanelShell id="home" rtl={rtl} centered>
      <div className="mx-auto flex w-full min-w-0 max-w-2xl flex-col items-center lg:max-w-3xl">
        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          className="w-full"
        >
          <PanelIntro
            isActive={isActive}
            kicker={t("landingHomeKicker")}
            title="Vegasphere"
            body={t("landingHomeBody")}
            heroTitle
          />
        </motion.div>

        <div className="my-2 w-full min-w-0 min-[390px]:my-3 sm:my-5 md:my-6 lg:my-8">
          {isActive ? (
            <OrbitalShowcase />
          ) : (
            <div className="h-[10rem] min-[390px]:h-[11rem] sm:h-[12rem] md:h-[14rem]" aria-hidden />
          )}
        </div>
      </div>
    </PanelShell>
  );
}
