"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/classNames";

type ComposerFloatingPanelProps = {
  open: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
  rtl?: boolean;
  align?: "start" | "center" | "end";
  className?: string;
  children: ReactNode;
};

export default function ComposerFloatingPanel({
  open,
  onClose,
  anchorRef,
  rtl = false,
  align = "start",
  className,
  children,
}: ComposerFloatingPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState({ bottom: 96, left: 12, right: 12, width: 320 });

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;

    const update = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const maxW = Math.min(window.innerWidth - 16, 360);
      const bottom = Math.max(12, window.innerHeight - rect.top + 10);
      let left = rect.left;
      if (align === "end") {
        left = Math.max(8, rect.right - maxW);
      } else if (align === "center") {
        left = Math.max(8, rect.left + rect.width / 2 - maxW / 2);
      }
      if (rtl) {
        left = Math.max(8, Math.min(left, window.innerWidth - maxW - 8));
      } else {
        left = Math.min(left, window.innerWidth - maxW - 8);
      }
      setPos({ bottom, left, right: 8, width: maxW });
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, anchorRef, rtl, align]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (anchorRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, anchorRef]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      ref={panelRef}
      className={cn("vs-popover fixed z-[95] shadow-2xl", className)}
      style={{
        bottom: pos.bottom,
        left: pos.left,
        width: pos.width,
        maxWidth: "calc(100vw - 1rem)",
      }}
      dir={rtl ? "rtl" : "ltr"}
    >
      {children}
    </div>,
    document.body,
  );
}
