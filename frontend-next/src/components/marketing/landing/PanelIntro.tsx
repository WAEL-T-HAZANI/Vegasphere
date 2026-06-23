"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/classNames";
import { PANEL_EASE } from "./constants";

type PanelIntroProps = {
  kicker?: string;
  title: string;
  body: string;
  isActive: boolean;
  /** Larger hero title (home page brand name). */
  heroTitle?: boolean;
};

export default function PanelIntro({
  kicker,
  title,
  body,
  isActive,
  heroTitle = false,
}: PanelIntroProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.header
      initial={reduceMotion ? false : { y: 16 }}
      animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0.85, y: 0 }}
      transition={{ duration: 0.5, ease: PANEL_EASE }}
      className="mb-2 w-full min-w-0 text-center sm:mb-4 md:mb-5"
    >
      {kicker ? (
        <p className="vega-latin-display text-[10px] font-bold vega-muted">
          {kicker}
        </p>
      ) : null}
      <h2
        className={cn(
          "mx-auto max-w-3xl text-balance font-light tracking-tight",
          heroTitle
            ? "mt-0 text-[1.75rem] leading-tight min-[360px]:text-3xl min-[390px]:text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-[5.25rem] xl:leading-[1.05]"
            : "mt-2 text-lg leading-tight min-[360px]:text-xl min-[390px]:text-2xl sm:text-3xl md:text-4xl lg:text-5xl",
          !kicker && !heroTitle && "mt-0",
        )}
      >
        {title}
      </h2>
      <p className="vega-ar-copy mx-auto mt-3 max-w-2xl text-sm leading-relaxed vega-muted sm:text-base lg:max-w-3xl">
        {body}
      </p>
    </motion.header>
  );
}
