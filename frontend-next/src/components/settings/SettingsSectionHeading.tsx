"use client";

import type { LucideIcon } from "lucide-react";

type SettingsSectionHeadingProps = {
  icon: LucideIcon;
  title: string;
  hint?: string;
};

export default function SettingsSectionHeading({
  icon: Icon,
  title,
  hint,
}: SettingsSectionHeadingProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="vs-icon-tile h-10 w-10">
        <Icon className="h-5 w-5 vega-brand-text" aria-hidden />
      </div>
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        {hint ? (
          <p className="mt-1 text-xs font-medium leading-relaxed text-muted">{hint}</p>
        ) : null}
      </div>
    </div>
  );
}
