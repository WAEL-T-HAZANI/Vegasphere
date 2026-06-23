"use client";

import { type LabelHTMLAttributes } from "react";
import { cn } from "@/lib/classNames";

export type FieldLabelProps = LabelHTMLAttributes<HTMLLabelElement> & {
  /** Auth-style uppercase label. */
  authStyle?: boolean;
};

export function FieldLabel({
  authStyle = false,
  className,
  children,
  ...props
}: FieldLabelProps) {
  return (
    <label
      className={cn(
        authStyle
          ? "mb-2 block text-start text-[10px] font-bold uppercase tracking-[0.2em] vega-muted"
          : "vs-label",
        className,
      )}
      {...props}
    >
      {children}
    </label>
  );
}
