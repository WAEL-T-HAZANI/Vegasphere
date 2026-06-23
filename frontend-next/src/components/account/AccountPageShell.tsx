"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/classNames";

type AccountPageShellProps = {
  title: string;
  hint?: string;
  headerAction?: ReactNode;
  children: ReactNode;
  className?: string;
  mainClassName?: string;
};

export default function AccountPageShell({
  title,
  hint,
  headerAction,
  children,
  className,
  mainClassName,
}: AccountPageShellProps) {
  return (
    <div
      className={cn(
        "vs-account-page flex min-h-0 w-full min-w-0 flex-1 flex-col",
        className,
      )}
    >
      <header className="sticky top-0 z-10 border-b border-brand-200/45 bg-surface px-4 py-4 dark:border-white/10 dark:bg-surface md:px-6">
        <div className="mx-auto w-full max-w-5xl">
          <div
            className={cn(
              "flex gap-3",
              headerAction
                ? "flex-col sm:flex-row sm:items-end sm:justify-between"
                : "flex-col",
            )}
          >
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
              {hint ? (
                <p className="mt-1 text-sm font-medium text-muted">{hint}</p>
              ) : null}
            </div>
            {headerAction ? (
              <div className="shrink-0 sm:max-w-[50%]">{headerAction}</div>
            ) : null}
          </div>
        </div>
      </header>

      <main
        className={cn(
          "flex-1 min-w-0 px-4 py-6 md:px-6",
          mainClassName,
        )}
      >
        <div className="mx-auto w-full min-w-0 max-w-5xl space-y-4">{children}</div>
      </main>
    </div>
  );
}
