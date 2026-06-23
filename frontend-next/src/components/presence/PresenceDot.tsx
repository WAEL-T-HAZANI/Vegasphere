"use client";

import { useTranslation } from "react-i18next";
import { cn } from "@/lib/classNames";

export type PresenceDotProps = {
  state?: "online" | "offline" | "unknown";
  className?: string;
};

export default function PresenceDot({
  state = "unknown",
  className,
}: PresenceDotProps) {
  const { t } = useTranslation();
  if (state === "unknown") return null;
  const online = state === "online";
  const label = online ? t("presenceOnline") : t("presenceOffline");
  return (
    <span
      className={cn(
        "inline-flex h-2 w-2 shrink-0 items-center justify-center leading-none",
        className,
      )}
      aria-label={label}
      title={label}
    >
      <span
        aria-hidden
        className={cn(
          "block h-[5px] w-[5px] rounded-full",
          online ? "bg-brand-600 dark:bg-brand-400" : "bg-gray-400 dark:bg-gray-500",
        )}
      />
    </span>
  );
}
