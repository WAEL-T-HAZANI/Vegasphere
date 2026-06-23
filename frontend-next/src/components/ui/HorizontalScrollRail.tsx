"use client";

import type { RefObject } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/classNames";
import {
  detectRtlScrollType,
  readHorizontalScrollProgress,
  writeHorizontalScrollProgress,
} from "@/lib/horizontalScroll";

type HorizontalScrollRailProps = {
  listRef: RefObject<HTMLElement | null>;
  rtl?: boolean;
  ariaLabel: string;
  className?: string;
  /** Hide the rail above this breakpoint when content fits (still hidden when not scrollable). */
  hideFrom?: "sm" | "md" | "lg" | "never";
};

export default function HorizontalScrollRail({
  listRef,
  rtl = false,
  ariaLabel,
  className,
  hideFrom = "never",
}: HorizontalScrollRailProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number; dragging: boolean } | null>(null);
  const rtlScrollTypeRef = useRef<string | null>(null);
  const [metrics, setMetrics] = useState({
    scrollable: false,
    thumbRatio: 1,
    progress: 0,
  });

  const resolveRtlScrollType = useCallback(
    (el: HTMLElement) => {
      if (!rtl) {
        rtlScrollTypeRef.current = "ltr";
        return "ltr";
      }
      if (rtlScrollTypeRef.current && rtlScrollTypeRef.current !== "ltr") {
        return rtlScrollTypeRef.current;
      }
      const type = detectRtlScrollType(el);
      rtlScrollTypeRef.current = type;
      return type;
    },
    [rtl],
  );

  const measure = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    const rtlType = resolveRtlScrollType(el);
    const { scrollable, progress, maxScroll } = readHorizontalScrollProgress(
      el,
      rtlType,
    );
    const thumbRatio =
      scrollable && maxScroll > 0
        ? Math.max(0.22, el.clientWidth / el.scrollWidth)
        : 1;
    setMetrics({ scrollable, thumbRatio, progress });
  }, [listRef, resolveRtlScrollType]);

  useEffect(() => {
    rtlScrollTypeRef.current = null;
  }, [rtl]);

  useEffect(() => {
    measure();
    const el = listRef.current;
    if (!el) return undefined;

    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(measure);
    });

    el.addEventListener("scroll", measure, { passive: true });
    const ro =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    if (el.firstElementChild) ro?.observe(el.firstElementChild);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("scroll", measure);
      ro?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [listRef, measure]);

  const scrollToProgress = useCallback(
    (progress: number) => {
      const el = listRef.current;
      if (!el) return;
      const rtlType = resolveRtlScrollType(el);
      writeHorizontalScrollProgress(el, progress, rtlType);
      measure();
    },
    [listRef, measure, resolveRtlScrollType],
  );

  const progressFromPointer = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track) return 0;
      const rect = track.getBoundingClientRect();
      const x = rtl ? rect.right - clientX : clientX - rect.left;
      return Math.min(1, Math.max(0, x / rect.width));
    },
    [rtl],
  );

  const onTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!metrics.scrollable) return;
    dragRef.current = { pointerId: e.pointerId, dragging: true };
    trackRef.current?.setPointerCapture(e.pointerId);
    scrollToProgress(progressFromPointer(e.clientX));
  };

  const onTrackPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current?.dragging) return;
    scrollToProgress(progressFromPointer(e.clientX));
  };

  const onTrackPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    dragRef.current.dragging = false;
    trackRef.current?.releasePointerCapture(e.pointerId);
  };

  if (!metrics.scrollable) return null;

  const thumbWidth = `${metrics.thumbRatio * 100}%`;
  const thumbOffset = `${metrics.progress * (100 - metrics.thumbRatio * 100)}%`;
  const hideClass =
    hideFrom === "never"
      ? ""
      : hideFrom === "sm"
        ? "sm:hidden"
        : hideFrom === "md"
          ? "md:hidden"
          : "lg:hidden";

  return (
    <div
      dir={rtl ? "rtl" : "ltr"}
      className={cn("w-full touch-none select-none", hideClass, className)}
    >
      <div
        ref={trackRef}
        role="slider"
        aria-label={ariaLabel}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(metrics.progress * 100)}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
          e.preventDefault();
          const step = 0.12;
          const delta =
            e.key === "ArrowRight" ? (rtl ? -step : step) : rtl ? step : -step;
          scrollToProgress(metrics.progress + delta);
        }}
        onPointerDown={onTrackPointerDown}
        onPointerMove={onTrackPointerMove}
        onPointerUp={onTrackPointerUp}
        onPointerCancel={onTrackPointerUp}
        className="relative mx-auto h-1.5 w-full max-w-[9rem] cursor-grab rounded-full bg-brand-200/80 active:cursor-grabbing vs-dark-brand-progress-track"
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 start-0 rounded-full bg-brand-500 shadow-sm shadow-brand-500/35 transition-[width,inset-inline-start] duration-75 ease-out vs-dark-brand-progress-fill"
          style={{ width: thumbWidth, insetInlineStart: thumbOffset }}
        />
      </div>
    </div>
  );
}
