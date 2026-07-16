"use client";

import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/classNames";
import { useSwipeCycleTabs } from "@/lib/useSwipeCycleTabs";

type SwipeTabSurfaceProps = Omit<ComponentPropsWithoutRef<"div">, "onChange"> & {
  tabIds: string[];
  active: string;
  onChange: (_id: string) => void;
  rtl?: boolean;
  disabled?: boolean;
  children: ReactNode;
};

export default function SwipeTabSurface({
  tabIds,
  active,
  onChange,
  rtl = false,
  disabled = false,
  className,
  children,
  ...rest
}: SwipeTabSurfaceProps) {
  const swipeHandlers = useSwipeCycleTabs({
    items: tabIds,
    active,
    onChange,
    rtl,
    enabled: !disabled,
  });

  return (
    <div className={cn(className)} {...rest} {...swipeHandlers}>
      {children}
    </div>
  );
}
