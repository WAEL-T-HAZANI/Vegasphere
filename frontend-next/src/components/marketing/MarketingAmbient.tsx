"use client";

import { useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { AtSign, Bell, Image, Link2, Mic, Send } from "lucide-react";
import { cn } from "@/lib/classNames";

type MarketingAmbientProps = {
  className?: string;
  intensity?: "soft" | "normal";
};

type AmbientOrb = {
  Icon: LucideIcon;
  label: string;
  size: "sm" | "md" | "lg";
  shapeClass: string;
  spinClass?: string;
  motionClass: string;
  staticX: string;
  staticY: string;
};

const SIZE = {
  sm: {
    box: "h-11 w-11 sm:h-12 sm:w-12",
    icon: "h-4 w-4 sm:h-[1.15rem] sm:w-[1.15rem]",
  },
  md: {
    box: "h-14 w-14 sm:h-16 sm:w-16",
    icon: "h-5 w-5 sm:h-6 sm:w-6",
  },
  lg: {
    box: "h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem]",
    icon: "h-6 w-6 sm:h-7 sm:w-7",
  },
} as const;

const AMBIENT_ORBS: AmbientOrb[] = [
  {
    Icon: Send,
    label: "Send message",
    size: "lg",
    shapeClass: "vega-cyber-hex",
    motionClass: "vega-ambient-orb--1",
    staticX: "8%",
    staticY: "18%",
  },
  {
    Icon: Mic,
    label: "Voice note",
    size: "md",
    shapeClass: "vega-cyber-cut",
    spinClass: "-rotate-6",
    motionClass: "vega-ambient-orb--2",
    staticX: "82%",
    staticY: "14%",
  },
  {
    Icon: Image,
    label: "Media share",
    size: "md",
    shapeClass: "vega-cyber-oct",
    spinClass: "rotate-12",
    motionClass: "vega-ambient-orb--3",
    staticX: "88%",
    staticY: "58%",
  },
  {
    Icon: AtSign,
    label: "Mentions",
    size: "sm",
    shapeClass: "vega-cyber-diamond",
    motionClass: "vega-ambient-orb--4",
    staticX: "12%",
    staticY: "72%",
  },
  {
    Icon: Bell,
    label: "Notifications",
    size: "sm",
    shapeClass: "vega-cyber-shard",
    spinClass: "-rotate-12",
    motionClass: "vega-ambient-orb--5",
    staticX: "44%",
    staticY: "82%",
  },
  {
    Icon: Link2,
    label: "Link preview",
    size: "sm",
    shapeClass: "vega-cyber-slate",
    spinClass: "rotate-6",
    motionClass: "vega-ambient-orb--6",
    staticX: "54%",
    staticY: "10%",
  },
];

function ChatOrbShell({
  Icon,
  label,
  size,
  shapeClass,
  spinClass,
}: {
  Icon: LucideIcon;
  label: string;
  size: keyof typeof SIZE;
  shapeClass: string;
  spinClass?: string;
}) {
  const s = SIZE[size];

  return (
    <div className={cn("relative flex items-center justify-center", spinClass)}>
      <div
        className={cn(
          "relative flex items-center justify-center border",
          "vega-brand-bg vega-brand-border vega-brand-glow",
          shapeClass,
          s.box,
        )}
      >
        <Icon
          className={cn(s.icon, "text-[rgb(var(--vega-page-wash))]")}
          strokeWidth={1.75}
          aria-hidden
        />
        <span className="sr-only">{label}</span>
      </div>
    </div>
  );
}

export default function MarketingAmbient({
  className,
  intensity = "normal",
}: MarketingAmbientProps) {
  const reduceMotion = useReducedMotion();
  const staticMode = reduceMotion === true;

  return (
    <div
      className={cn(
        "vega-ambient pointer-events-none absolute inset-0 overflow-hidden",
        className,
      )}
      data-intensity={intensity}
      aria-hidden
    >
      {!staticMode ? (
        <div className="absolute inset-0 overflow-hidden">
          <div className="vega-ambient-sweep absolute -inset-x-[20%] top-0 h-[38%]">
            <div
              className="h-full w-full opacity-70"
              style={{
                background:
                  "radial-gradient(ellipse 70% 50% at 50% 100%, rgb(var(--vega-brand) / 0.12), transparent 72%)",
              }}
            />
          </div>
        </div>
      ) : null}

      <div
        className={cn(
          "vega-ambient-aurora absolute -start-[10%] top-[4%] h-[42vh] w-[42vw] rounded-full",
          !staticMode && "vega-ambient-aurora--1",
        )}
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 40% 40%, rgb(var(--vega-brand) / 0.22), transparent 72%)",
        }}
      />

      <div
        className={cn(
          "vega-ambient-aurora absolute -end-[8%] bottom-[4%] h-[38vh] w-[38vw] rounded-full",
          !staticMode && "vega-ambient-aurora--2",
        )}
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 60% 55%, rgb(var(--vega-brand) / 0.2), transparent 70%)",
        }}
      />

      <div
        className={cn(
          "vega-ambient-aurora absolute start-[30%] top-[42%] h-[32vh] w-[34vw] rounded-full",
          !staticMode && "vega-ambient-aurora--3",
        )}
        style={{
          background:
            "radial-gradient(circle, rgb(var(--vega-brand) / 0.16), transparent 68%)",
        }}
      />

      <div className="vega-ambient-orbs-layer absolute inset-0">
        {AMBIENT_ORBS.map((orb) => (
          <div
            key={orb.label}
            className={cn(
              "vega-ambient-orb absolute",
              !staticMode && orb.motionClass,
            )}
            style={
              staticMode
                ? { left: orb.staticX, top: orb.staticY, opacity: 0.65 }
                : undefined
            }
          >
            <ChatOrbShell
              Icon={orb.Icon}
              label={orb.label}
              size={orb.size}
              shapeClass={orb.shapeClass}
              spinClass={orb.spinClass}
            />
          </div>
        ))}
      </div>

      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgb(var(--vega-page-vignette)/0.06)_100%)] dark:bg-[radial-gradient(ellipse_at_center,transparent_40%,rgb(var(--vega-page-vignette)/0.45)_100%)]" />
    </div>
  );
}
