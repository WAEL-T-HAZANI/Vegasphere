"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Eye, EyeOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { FieldLabel } from "./FieldLabel";
import { Input } from "./Input";
import { cn } from "@/lib/classNames";

export type AuthFieldProps = {
  icon?: LucideIcon;
  id: string;
  label: string;
  type?: string;
  autoComplete?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  mono?: boolean;
  inputMode?: import("react").HTMLAttributes<HTMLInputElement>["inputMode"];
  error?: string;
  /** Show eye toggle for password fields (default: true when type is password). */
  passwordToggle?: boolean;
  compact?: boolean;
};

export default function AuthField({
  icon: Icon,
  id,
  label,
  type,
  autoComplete,
  value,
  onChange,
  placeholder,
  mono = false,
  inputMode,
  error,
  passwordToggle,
  compact = false,
}: AuthFieldProps) {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";
  const isPasswordField = type === "password";
  const showToggle = passwordToggle ?? isPasswordField;
  const [visible, setVisible] = useState(false);
  const inputType = isPasswordField && showToggle && visible ? "text" : type;

  return (
    <div>
      <FieldLabel
        htmlFor={id}
        authStyle
        className={compact ? "mb-1.5" : undefined}
      >
        {label}
      </FieldLabel>

      <Input
        id={id}
        type={inputType}
        variant="vega"
        className={cn(
          compact ? "min-h-11" : undefined,
          error &&
            "border-red-400/70 focus-within:border-red-500 focus-within:shadow-[0_0_0_3px_rgb(239_68_68/0.15)]",
        )}
        autoComplete={autoComplete}
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        dir={isPasswordField ? "ltr" : undefined}
        leadingIcon={
          Icon ? (
            <Icon className="h-4 w-4 shrink-0 text-[rgb(var(--vega-muted))]" />
          ) : undefined
        }
        trailingIcon={
          showToggle ? (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setVisible((v) => !v)}
              className={cn(
                "inline-flex shrink-0 items-center justify-center rounded-lg p-1.5",
                "text-[rgb(var(--vega-muted))] transition hover:text-[rgb(var(--vega-ink))]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--vega-accent)/0.45)]",
              )}
              aria-label={visible ? t("hidePassword") : t("showPassword")}
              aria-pressed={visible}
            >
              {visible ? (
                <EyeOff className="h-4 w-4" aria-hidden />
              ) : (
                <Eye className="h-4 w-4" aria-hidden />
              )}
            </button>
          ) : undefined
        }
        inputClassName={cn(
          compact && "py-2.5",
          mono ? "font-mono text-xs sm:text-sm" : undefined,
          isPasswordField && (isRtl ? "text-end" : "text-start"),
        )}
      />

      {error ? (
        <div
          className="mt-1.5 h-0.5 rounded-full bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-80"
          aria-hidden
        />
      ) : null}

      {error ? (
        <p
          id={`${id}-error`}
          role="alert"
          className="mt-1.5 text-xs font-medium leading-snug text-red-600 dark:text-red-400"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
