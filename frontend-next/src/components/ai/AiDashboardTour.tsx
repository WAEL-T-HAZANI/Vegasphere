"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { cn } from "@/lib/classNames";
import { shellAccountNav, shellMainNav } from "@/lib/shellNav";
import { useAppDispatch } from "@/store/hooks";
import { setSidebarOpen } from "@/store/slices/uiSlice";

export type AiTourStep = {
  id: string;
  titleKey: string;
  bodyKey: string;
  target?: string;
  href?: string;
  placement?: "top" | "bottom" | "center" | "right";
  /** Highlight a sidebar link without leaving the current page. */
  shellNav?: boolean;
};

type Rect = { top: number; left: number; width: number; height: number };

type AiDashboardTourProps = {
  open: boolean;
  onClose: () => void;
  onAiTabChange?: (_tab: string) => void;
};

function queryTarget(selector?: string): Element | null {
  if (!selector) return null;

  const byTour = document.querySelector(`[data-tour="${CSS.escape(selector)}"]`);
  if (byTour) return byTour;

  try {
    return document.querySelector(selector);
  } catch {
    return null;
  }
}

async function waitForTarget(selector?: string, maxMs = 5000): Promise<Element | null> {
  if (!selector) return null;
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const el = queryTarget(selector);
    if (el) return el;
    await new Promise((r) => window.setTimeout(r, 80));
  }
  return queryTarget(selector);
}

function shellNavTourId(href: string) {
  return `shell-nav${href.replace(/\//g, "-")}`;
}

const NAV_TOUR_BODY_KEYS: Record<string, string> = {
  "/chats": "aiTourNavChatsBody",
  "/search": "aiTourNavSearchBody",
  "/status": "aiTourNavStatusBody",
  "/networking": "aiTourNavNetworkingBody",
  "/groups": "aiTourNavGroupsBody",
  "/channels": "aiTourNavChannelsBody",
  "/calls": "aiTourNavCallsBody",
  "/ai-services": "aiTourNavAiBody",
  "/profile": "aiTourNavProfileBody",
  "/settings": "aiTourNavSettingsBody",
  "/privacy": "aiTourNavPrivacyBody",
};

function buildShellNavSteps(
  items: typeof shellMainNav,
): AiTourStep[] {
  return items.map((item) => ({
    id: `nav-${item.href}`,
    titleKey: item.key,
    bodyKey: NAV_TOUR_BODY_KEYS[item.href] || "aiTourNavGenericBody",
    target: shellNavTourId(item.href),
    shellNav: true,
    placement: "right" as const,
  }));
}

function measure(el: Element | null): Rect | null {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width <= 0 && r.height <= 0) return null;
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

async function waitForLayout(): Promise<void> {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

async function focusTarget(el: Element | null): Promise<Rect | null> {
  if (!el) return null;
  el.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "auto" });
  await waitForLayout();
  return measure(el);
}

export function buildAiTourSteps(): AiTourStep[] {
  return [
    {
      id: "welcome",
      titleKey: "aiTourWelcomeTitle",
      bodyKey: "aiTourWelcomeBody",
      placement: "center",
    },
    ...buildShellNavSteps(shellMainNav),
    ...buildShellNavSteps(shellAccountNav),
    {
      id: "finish",
      titleKey: "aiTourFinishTitle",
      bodyKey: "aiTourFinishBody",
      placement: "center",
    },
  ];
}

export default function AiDashboardTour({ open, onClose }: AiDashboardTourProps) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const dispatchRef = useRef(dispatch);
  dispatchRef.current = dispatch;

  const steps = useMemo(() => buildAiTourSteps(), []);
  const [index, setIndex] = useState(0);
  const [spot, setSpot] = useState<Rect | null>(null);
  const [spotReady, setSpotReady] = useState(false);
  const [mounted, setMounted] = useState(false);
  const stepTargetRef = useRef<string | undefined>(undefined);

  const step = steps[index];
  const isLast = index >= steps.length - 1;
  stepTargetRef.current = step?.target;

  useEffect(() => setMounted(true), []);

  const refreshSpot = useCallback(() => {
    const el = queryTarget(stepTargetRef.current);
    const next = measure(el);
    if (next) setSpot(next);
  }, []);

  useEffect(() => {
    if (!open) {
      setIndex(0);
      setSpot(null);
      setSpotReady(false);
      return undefined;
    }

    dispatchRef.current(setSidebarOpen(true));

    const current = steps[index];
    if (!current) return undefined;

    let cancelled = false;
    setSpot(null);
    setSpotReady(false);

    const run = async () => {
      if (cancelled) return;

      const el = await waitForTarget(current.target);
      if (cancelled) return;

      const rect = await focusTarget(el);
      if (cancelled) return;

      setSpot(rect);
      setSpotReady(true);
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [open, index, steps]);

  useEffect(() => {
    if (!open) return undefined;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", refreshSpot);
    window.addEventListener("scroll", refreshSpot, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", refreshSpot);
      window.removeEventListener("scroll", refreshSpot, true);
    };
  }, [open, onClose, refreshSpot]);

  if (!open || !step || !mounted) return null;

  const pad = 10;
  const activeSpot = spotReady ? spot : null;
  const hole = activeSpot
    ? {
        top: Math.max(8, activeSpot.top - pad),
        left: Math.max(8, activeSpot.left - pad),
        width: activeSpot.width + pad * 2,
        height: activeSpot.height + pad * 2,
      }
    : null;

  const dialogStyle = (() => {
    const vw = typeof window !== "undefined" ? window.innerWidth : 1024;
    const vh = typeof window !== "undefined" ? window.innerHeight : 768;
    const dialogW = Math.min(vw * 0.92, 352);
    const dialogH = 240;

    if (!hole || step.placement === "center") {
      return {
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        maxWidth: "min(92vw, 26rem)",
      } as const;
    }

    if (step.placement === "right") {
      const left = Math.min(Math.max(16, hole.left + hole.width + 16), vw - dialogW - 16);
      const top = Math.min(
        Math.max(16, hole.top + hole.height / 2 - dialogH / 2),
        vh - dialogH - 16,
      );
      return { top, left, transform: "none", maxWidth: "min(92vw, 22rem)" } as const;
    }

    const below = hole.top + hole.height + 16;
    const useBottom = below + dialogH <= vh - 16;
    const top = useBottom
      ? below
      : Math.max(16, Math.min(hole.top - dialogH - 16, vh - dialogH - 16));

    const left = Math.min(Math.max(16, hole.left), vw - dialogW - 16);
    return { top, left, transform: "none", maxWidth: "min(92vw, 22rem)" } as const;
  })();

  const stepTitle = t(step.titleKey);
  const stepBody = t(step.bodyKey);

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] opacity-100 transition-opacity duration-300"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-tour-title"
    >
      <div className="absolute inset-0 cursor-default bg-black/40" aria-hidden />
      {hole ? (
        <div
          className="pointer-events-none absolute rounded-2xl ring-2 ring-brand-400 transition-all duration-300 ease-out"
          style={{
            top: hole.top,
            left: hole.left,
            width: hole.width,
            height: hole.height,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.58)",
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-black/50" aria-hidden />
      )}

      <div
        className={cn(
          "absolute z-[10001] rounded-2xl border border-brand-200/50 bg-surface p-4 shadow-2xl",
          "pointer-events-auto opacity-100 dark:border-white/10 dark:bg-surface",
          hole ? "transition-[top,left,transform] duration-300 ease-out" : "transition-opacity duration-300",
        )}
        style={dialogStyle}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute end-3 top-3 rounded-lg p-1 text-muted transition hover:bg-subtle hover:text-ink"
          aria-label={t("aiTourClose")}
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-3 flex items-center gap-1.5 pe-8">
          {steps.map((s, i) => (
            <span
              key={s.id}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors duration-300",
                i <= index ? "bg-brand-600 dark:bg-gradient-to-r dark:from-brand-600 dark:to-red-700" : "bg-brand-200/60 dark:bg-gradient-to-r dark:from-brand-900/40 dark:to-red-950/30",
              )}
            />
          ))}
        </div>

        <h3 id="ai-tour-title" className="text-base font-bold text-ink">
          {stepTitle}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">{stepBody}</p>

        <div className="mt-4 flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-muted">
            {t("aiTourProgress", { current: index + 1, total: steps.length })}
          </span>
          <div className="flex gap-2">
            <button type="button" className="vs-btn-outline px-3 py-1.5 text-sm" onClick={onClose}>
              {t("aiTourSkip")}
            </button>
            <button
              type="button"
              className="vs-btn-primary-inline px-4 py-1.5 text-sm"
              onClick={() => {
                if (isLast) onClose();
                else setIndex((n) => n + 1);
              }}
            >
              {isLast ? t("aiTourDone") : t("aiTourNext")}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
