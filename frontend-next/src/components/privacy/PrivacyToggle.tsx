"use client";

import { cn } from "@/lib/classNames";

type PrivacyToggleProps = {
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  label: string;
};

export default function PrivacyToggle({
  checked,
  disabled,
  onChange,
  label,
}: PrivacyToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 transition",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:focus-visible:ring-offset-gray-950",
        checked
          ? "border-brand-600 bg-brand-600 dark:border-brand-700 dark:bg-brand-700"
          : "border-brand-200/70 bg-brand-100/90 dark:border-brand-800/55 dark:bg-brand-900/50",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <span
        className={cn(
          "pointer-events-none absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-md ring-1 ring-black/5 transition-all",
          checked ? "start-5" : "start-0.5",
        )}
      />
    </button>
  );
}
