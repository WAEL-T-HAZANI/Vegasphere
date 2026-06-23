"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  MessageCircle,
  PhoneCall,
  Radio,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/classNames";

const NODES = [
  { Icon: MessageCircle, labelKey: "landingOrbChat" },
  { Icon: ShieldCheck, labelKey: "landingOrbShield" },
  { Icon: PhoneCall, labelKey: "landingOrbCalls" },
  { Icon: Radio, labelKey: "landingOrbLive" },
  { Icon: Sparkles, labelKey: "landingOrbFlow" },
] as const;

/** Horizontal feature line — active node highlighted in the center readout. */
export default function OrbitalShowcase() {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (reduceMotion) return undefined;
    const id = setInterval(() => {
      setActive((i) => (i + 1) % NODES.length);
    }, 2800);
    return () => clearInterval(id);
  }, [reduceMotion]);

  const ActiveIcon = NODES[active].Icon;
  const activeLabel = t(NODES[active].labelKey);

  return (
    <div className="mx-auto w-full min-w-0 max-w-[min(100%,28rem)] px-0 sm:max-w-xl sm:px-2">
      <motion.div
        key={active}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="mb-4 flex flex-col items-center text-center min-[390px]:mb-5 sm:mb-8 md:mb-10"
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[rgb(var(--vega-brand)/0.35)] bg-[rgb(var(--vega-paper))] shadow-[0_0_32px_rgb(var(--vega-brand)/0.2)] min-[360px]:h-16 min-[360px]:w-16 min-[390px]:h-[4.5rem] min-[390px]:w-[4.5rem] min-[390px]:rounded-3xl sm:h-20 sm:w-20 md:h-24 md:w-24">
          <ActiveIcon className="h-8 w-8 vega-brand-text min-[390px]:h-9 min-[390px]:w-9 sm:h-10 sm:w-10 md:h-12 md:w-12" />
        </div>
        <p className="vega-latin-display mt-3 text-[10px] font-bold vega-brand-text min-[390px]:text-[11px] sm:text-xs">
          {activeLabel}
        </p>
      </motion.div>

      <div className="relative mx-auto flex w-full min-w-0 max-w-full items-center justify-between gap-0.5 px-1 min-[390px]:max-w-xs sm:max-w-md md:max-w-lg">
        <div
          className="pointer-events-none absolute left-4 right-4 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-[rgb(var(--vega-brand)/0.45)] to-transparent min-[390px]:left-5 min-[390px]:right-5 sm:left-6 sm:right-6"
          aria-hidden
        />

        {NODES.map(({ Icon, labelKey }, index) => {
          const isActive = index === active;
          const label = t(labelKey);

          return (
            <motion.button
              key={labelKey}
              type="button"
              aria-label={label}
              aria-current={isActive ? "true" : undefined}
              onClick={() => setActive(index)}
              className={cn(
                "vega-icon-btn relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[rgb(var(--vega-brand)/0.25)] bg-[rgb(var(--vega-paper))]",
                "min-[360px]:h-9 min-[360px]:w-9",
                "min-[390px]:h-10 min-[390px]:w-10 min-[390px]:rounded-xl",
                "sm:h-12 sm:w-12 md:h-14 md:w-14 md:rounded-2xl",
                isActive &&
                  "scale-110 border-[rgb(var(--vega-brand))]/55 shadow-[0_0_20px_rgb(var(--vega-brand)/0.28)] sm:shadow-[0_0_24px_rgb(var(--vega-brand)/0.32)]",
              )}
              animate={
                reduceMotion
                  ? undefined
                  : isActive
                    ? { scale: 1.1 }
                    : { scale: 1 }
              }
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              whileHover={reduceMotion ? undefined : { scale: 1.12 }}
            >
              <Icon
                className={cn(
                  "h-4 w-4 transition-colors min-[390px]:h-[1.125rem] min-[390px]:w-[1.125rem] sm:h-5 sm:w-5 md:h-6 md:w-6",
                  isActive ? "vega-brand-text" : "text-[rgb(var(--vega-muted))]",
                )}
              />
            </motion.button>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-center gap-1.5 sm:mt-6">
        {NODES.map(({ labelKey }, index) => (
          <button
            key={labelKey}
            type="button"
            aria-label={t(labelKey)}
            onClick={() => setActive(index)}
            className={cn(
              "vega-dot-btn h-1.5 rounded-full transition-all duration-300",
              index === active
                ? "w-6 bg-[rgb(var(--vega-brand))]"
                : "w-1.5 bg-[rgb(var(--vega-muted)/0.35)]",
            )}
          />
        ))}
      </div>
    </div>
  );
}
