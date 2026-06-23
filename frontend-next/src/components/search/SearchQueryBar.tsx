"use client";

import { useTranslation } from "react-i18next";
import { Search as SearchIcon, X } from "lucide-react";
import { cn } from "@/lib/classNames";

type SearchQueryBarProps = {
  value: string;
  onChange: (_value: string) => void;
  onClear: () => void;
  isTooShort?: boolean;
  className?: string;
  autoFocus?: boolean;
};

export default function SearchQueryBar({
  value,
  onChange,
  onClear,
  isTooShort = false,
  className,
  autoFocus = true,
}: SearchQueryBarProps) {
  const { t, i18n } = useTranslation();
  const rtl = i18n.dir() === "rtl";
  const hasValue = value.trim().length > 0;

  return (
    <div className={cn("space-y-2", className)} dir={rtl ? "rtl" : "ltr"}>
      <div className="relative">
        <SearchIcon
          className="pointer-events-none absolute start-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted"
          aria-hidden
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          name="q"
          autoComplete="off"
          enterKeyHint="search"
          dir={rtl ? "rtl" : "ltr"}
          placeholder={t("globalSearchPlaceholder")}
          aria-label={t("globalSearchPlaceholder")}
          className={cn("vs-input w-full py-3 ps-11 text-start", hasValue ? "pe-11" : "pe-4")}
          autoFocus={autoFocus}
        />
        {hasValue ? (
          <button
            type="button"
            onClick={onClear}
            className="absolute end-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted transition hover:bg-brand-50 hover:text-ink dark:hover:bg-brand-900/20"
            aria-label={t("globalSearchClear")}
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        ) : null}
      </div>
      {isTooShort ? (
        <p className="text-xs leading-relaxed text-muted">{t("globalSearchTypeMore")}</p>
      ) : null}
    </div>
  );
}
