"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check, ChevronDown, Search } from "lucide-react";
import {
  useMemo,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ComponentType,
} from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/classNames";

type CountryOption = {
  value?: string;
  label: string;
  divider?: boolean;
};

type FlagIconProps = {
  country?: string;
  label?: string;
  "aria-hidden"?: boolean;
};

export type PhoneCountrySelectProps = {
  value?: string;
  onChange: (country: string | undefined) => void;
  options: CountryOption[];
  disabled?: boolean;
  readOnly?: boolean;
  iconComponent?: ComponentType<FlagIconProps>;
  className?: string;
  "aria-label"?: string;
};

function isSelectedOption(optionValue: string | undefined, current?: string) {
  if (optionValue === undefined || optionValue === null) {
    return current === undefined || current === null;
  }
  return optionValue === current;
}

export default function PhoneCountrySelect({
  value,
  onChange,
  options,
  disabled,
  readOnly,
  iconComponent: FlagIcon,
  className,
  "aria-label": ariaLabel,
}: PhoneCountrySelectProps) {
  const { t, i18n } = useTranslation();
  const rtl = i18n.dir() === "rtl";
  const isDisabled = Boolean(disabled || readOnly);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => searchRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  const selectable = useMemo(
    () => options.filter((option) => !option.divider),
    [options],
  );

  const selected = useMemo(
    () =>
      selectable.find((option) => isSelectedOption(option.value, value)) ??
      selectable[0],
    [selectable, value],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return selectable;
    return selectable.filter((option) =>
      option.label.toLowerCase().includes(q),
    );
  }, [query, selectable]);

  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next);
    if (!next) setQuery("");
  }, []);

  const displayCountry = value ?? selected?.value;

  return (
    <div className={cn("PhoneInputCountry vs-phone-country", className)}>
      <DropdownMenu.Root dir={rtl ? "rtl" : "ltr"} open={open} onOpenChange={handleOpenChange}>
        <DropdownMenu.Trigger asChild disabled={isDisabled}>
          <button
            type="button"
            className={cn(
              "vs-phone-country-trigger",
              isDisabled && "cursor-not-allowed opacity-50",
            )}
            aria-label={ariaLabel ?? selected?.label}
          >
            {FlagIcon && displayCountry ? (
              <span className="PhoneInputCountryIcon vs-phone-country-flag">
                <FlagIcon
                  country={displayCountry}
                  label={selected?.label}
                  aria-hidden
                />
              </span>
            ) : null}
            <ChevronDown
              className="vs-phone-country-chevron h-4 w-4 shrink-0 opacity-70"
              aria-hidden
            />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align={rtl ? "end" : "start"}
            sideOffset={6}
            className="vs-phone-country-menu z-[60]"
            onCloseAutoFocus={(e) => e.preventDefault()}
          >
            <div className="vs-phone-country-search-wrap">
              <Search
                className="vs-phone-country-search-icon h-4 w-4 shrink-0 opacity-55"
                aria-hidden
              />
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                placeholder={t("phoneCountrySearch")}
                className="vs-phone-country-search"
                aria-label={t("phoneCountrySearch")}
                autoComplete="off"
              />
            </div>
            <div className="vs-phone-country-list" role="listbox">
              {!open ? null : filtered.length === 0 ? (
                <p className="px-3 py-4 text-center text-xs font-semibold text-muted">
                  {t("phoneCountryNoResults")}
                </p>
              ) : (
                filtered.map((option) => {
                  const code = option.value;
                  const selectedItem = isSelectedOption(code, value);
                  return (
                    <DropdownMenu.Item
                      key={code ?? "international"}
                      className={cn(
                        "vs-phone-country-item",
                        selectedItem && "vs-phone-country-item--selected",
                      )}
                      onSelect={() => onChange(code)}
                    >
                      {FlagIcon && code ? (
                        <span className="PhoneInputCountryIcon vs-phone-country-item-flag">
                          <FlagIcon
                            country={code}
                            label={option.label}
                            aria-hidden
                          />
                        </span>
                      ) : (
                        <span className="vs-phone-country-item-flag vs-phone-country-item-flag--empty" />
                      )}
                      <span className="min-w-0 flex-1 truncate text-start">
                        {option.label}
                      </span>
                      {selectedItem ? (
                        <Check
                          className="h-3.5 w-3.5 shrink-0 vega-brand-text"
                          aria-hidden
                        />
                      ) : (
                        <span className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      )}
                    </DropdownMenu.Item>
                  );
                })
              )}
            </div>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}
