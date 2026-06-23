"use client";

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/classNames";
import { useAiReplyTone } from "@/lib/aiReplyTone";
import { type AiReplyTone } from "@/store/slices/uiSlice";

const TONE_VALUES: AiReplyTone[] = ["default", "friendly", "formal", "short", "funny"];

const TONE_LABEL_KEYS: Record<AiReplyTone, string> = {
  default: "aiToneDefault",
  friendly: "aiToneFriendly",
  formal: "aiToneFormal",
  short: "aiToneShort",
  funny: "aiToneFunny",
};

type AiTonePickerProps = {
  disabled?: boolean;
  compact?: boolean;
  className?: string;
};

export default function AiTonePicker({
  disabled = false,
  compact = false,
  className,
}: AiTonePickerProps) {
  const { t } = useTranslation();
  const { tone, setTone } = useAiReplyTone();

  const options = useMemo(
    () =>
      TONE_VALUES.map((value) => ({
        value,
        label: t(TONE_LABEL_KEYS[value]),
      })),
    [t],
  );

  return (
    <div
      className={cn("flex flex-wrap gap-1.5", compact && "gap-1", className)}
      role="radiogroup"
      aria-label={t("aiToneLabel")}
    >
      {options.map((opt) => {
        const active = tone === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => setTone(opt.value)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
              compact && "px-2.5 py-1 text-[11px]",
              active
                ? "border-brand-500/70 bg-brand-600 text-white shadow-md shadow-brand-600/25 dark:border-brand-400/60 dark:bg-gradient-to-br dark:from-brand-700 dark:via-brand-800 dark:to-red-900 dark:shadow-red-950/30"
                : "border-brand-200/50 bg-surface/80 text-muted hover:border-brand-400/60 hover:bg-brand-50/70 hover:text-brand-800 dark:border-brand-800/45 dark:hover:bg-brand-900/35 dark:hover:text-brand-100",
              disabled && "pointer-events-none opacity-60",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
