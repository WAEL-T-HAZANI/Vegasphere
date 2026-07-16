import { useMemo, useRef } from "react";

const MOBILE_MAX_WIDTH = 640;
const SWIPE_MIN_PX = 56;

type UseSwipeCycleTabsOptions = {
  items: string[];
  active: string;
  onChange: (_id: string) => void;
  rtl?: boolean;
  enabled?: boolean;
};

export function useSwipeCycleTabs({
  items,
  active,
  onChange,
  rtl = false,
  enabled = true,
}: UseSwipeCycleTabsOptions) {
  const touchRef = useRef({ x: 0, y: 0 });

  return useMemo(() => {
    if (!enabled || items.length < 2) {
      return {};
    }

    return {
      onTouchStart: (event: React.TouchEvent) => {
        const touch = event.touches[0];
        if (!touch) return;
        touchRef.current = { x: touch.clientX, y: touch.clientY };
      },
      onTouchEnd: (event: React.TouchEvent) => {
        if (typeof window !== "undefined" && window.innerWidth >= MOBILE_MAX_WIDTH) {
          return;
        }

        const touch = event.changedTouches[0];
        if (!touch) return;

        const dx = touch.clientX - touchRef.current.x;
        const dy = touch.clientY - touchRef.current.y;
        if (Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) < Math.abs(dy) * 1.25) {
          return;
        }

        const currentIndex = items.indexOf(active);
        if (currentIndex < 0) return;

        const step = rtl ? (dx > 0 ? 1 : -1) : dx < 0 ? 1 : -1;
        const next = items[currentIndex + step];
        if (next) onChange(next);
      },
    };
  }, [active, enabled, items, onChange, rtl]);
}
