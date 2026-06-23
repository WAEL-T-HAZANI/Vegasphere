"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/classNames";

export const buttonVariants = {
  primary: "vs-btn-primary",
  primarySm: "vs-btn-primary-sm",
  primaryInline: "vs-btn-primary-inline",
  ghost: "vs-btn-ghost",
  outline: "vs-btn-outline",
  outlineSm: "vs-btn-outline-sm",
  danger: "vs-btn-danger",
  composerIcon: "vs-composer-icon-btn",
  composerIconSm: "vs-composer-icon-btn vs-composer-icon-btn-sm",
  composerSend: "vs-composer-send",
} as const;

export type ButtonVariant = keyof typeof buttonVariants;

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  /** When true with `primary`, applies full width (default for primary). */
  fullWidth?: boolean;
};

export function buttonClassName(
  variant: ButtonVariant = "primary",
  className?: string,
  fullWidth?: boolean,
) {
  const isPrimary = variant === "primary";
  return cn(
    buttonVariants[variant],
    isPrimary && fullWidth !== false && "w-full",
    className,
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "primary",
      fullWidth,
      className,
      type = "button",
      children,
      ...props
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        className={buttonClassName(variant, className, fullWidth)}
        {...props}
      >
        {children}
      </button>
    );
  },
);
