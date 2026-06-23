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

type CallsConversationOption = {
  value: string;
  label: string;
};

type CallsConversationSelectProps = {
  value: string;
  options: CallsConversationOption[];
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  rtl?: boolean;
  ariaLabel?: string;
};

export default function CallsConversationSelect({
  value,
  options,
  onChange,
  placeholder,
  disabled,
  rtl = false,
  ariaLabel,
}: CallsConversationSelectProps) {
  const current = options.find((option) => option.value === value);
  const label = current?.label ?? placeholder;

  return (
    <DropdownRoot dir={rtl ? "rtl" : "ltr"}>
      <DropdownTrigger asChild disabled={disabled || options.length === 0}>
        <button
          type="button"
          className={cn(
            "vs-select-trigger inline-flex h-12 w-full min-w-0 items-center justify-between gap-2 rounded-2xl text-sm text-start",
            !current && "text-muted",
            (disabled || options.length === 0) && "cursor-not-allowed opacity-50",
          )}
          aria-label={
            current ? `${ariaLabel}: ${current.label}` : ariaLabel
          }
        >
          <span className="min-w-0 truncate">{label}</span>
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
                className="justify-between gap-3 text-sm font-semibold"
                onSelect={() => onChange(option.value)}
              >
                <span className="min-w-0 truncate">{option.label}</span>
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
