"use client";

import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/classNames";
import {
  DropdownPortal,
  DropdownRoot,
  DropdownTrigger,
  VegaDropdownContent,
  VegaDropdownItem,
} from "@/components/ui/VegaDropdownMenu";

type PrivacySelectOption = {
  value: string;
  label: string;
};

type PrivacySelectFieldProps = {
  value: string;
  options: PrivacySelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  rtl?: boolean;
  ariaLabel?: string;
  /** Stretch trigger to full container width (translate language pickers). */
  fullWidth?: boolean;
};

export default function PrivacySelectField({
  value,
  options,
  onChange,
  disabled,
  rtl = false,
  ariaLabel,
  fullWidth = false,
}: PrivacySelectFieldProps) {
  const current =
    options.find((option) => option.value === value) ?? options[0];

  return (
    <DropdownRoot dir={rtl ? "rtl" : "ltr"}>
      <DropdownTrigger asChild disabled={disabled}>
        <button
          type="button"
          className={cn(
            "vs-select-trigger inline-flex min-w-0 max-w-full items-center justify-between gap-2 text-start",
            fullWidth
              ? "h-10 w-full rounded-xl text-sm"
              : "h-10 w-auto min-w-[9.5rem] max-w-[11rem] rounded-xl text-sm",
            disabled && "cursor-not-allowed opacity-50",
          )}
          aria-label={ariaLabel}
        >
          <span className="min-w-0 truncate">{current?.label}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
        </button>
      </DropdownTrigger>
      <DropdownPortal>
        <VegaDropdownContent select scroll align={rtl ? "start" : "end"}>
          {options.map((option) => {
            const selected = option.value === value;
            return (
              <VegaDropdownItem
                key={option.value}
                variant={selected ? "selected" : "default"}
                className="justify-between gap-3 text-xs font-semibold"
                onSelect={() => onChange(option.value)}
              >
                <span>{option.label}</span>
                {selected ? (
                  <Check className="h-3.5 w-3.5 shrink-0 vega-brand-text opacity-100" aria-hidden />
                ) : (
                  <span className="h-3.5 w-3.5 shrink-0" aria-hidden />
                )}
              </VegaDropdownItem>
            );
          })}
        </VegaDropdownContent>
      </DropdownPortal>
    </DropdownRoot>
  );
}
