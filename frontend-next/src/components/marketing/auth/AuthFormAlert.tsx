"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/classNames";

type AuthFormAlertProps = {
  children: ReactNode;
  className?: string;
};

/** Shared inline error banner for auth forms. */
export default function AuthFormAlert({ children, className }: AuthFormAlertProps) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300",
        className,
      )}
    >
      {children}
    </div>
  );
}
