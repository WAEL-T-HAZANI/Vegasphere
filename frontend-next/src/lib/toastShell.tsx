"use client";

import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import i18n from "@/i18n/client";
import { cn } from "@/lib/classNames";

export type ToastVariant = "success" | "error" | "info" | "message";

export function getToastPosition(_rtl?: boolean): "bottom-center" {
  return "bottom-center";
}

const VARIANT_ICONS: Record<
  ToastVariant,
  { icon: typeof CheckCircle2; iconClass: string }
> = {
  success: {
    icon: CheckCircle2,
    iconClass: "vs-toast-icon vs-toast-icon--success",
  },
  error: {
    icon: AlertCircle,
    iconClass: "vs-toast-icon vs-toast-icon--error",
  },
  info: {
    icon: Info,
    iconClass: "vs-toast-icon vs-toast-icon--neutral",
  },
  message: {
    icon: Info,
    iconClass: "vs-toast-icon vs-toast-icon--neutral",
  },
};

export type ToastShellProps = {
  visible: boolean;
  variant: ToastVariant;
  title?: string;
  body?: string;
  onDismiss: () => void;
  dismissLabel?: string;
  role?: "alert" | "status";
  /** Replaces default title/body block (e.g. clickable conversation toast). */
  content?: ReactNode;
};

export function ToastShell({
  visible,
  variant,
  title,
  body,
  onDismiss,
  dismissLabel,
  role,
  content,
}: ToastShellProps) {
  const { icon: Icon, iconClass } = VARIANT_ICONS[variant];
  const dismiss = dismissLabel || i18n.t("dismissToast");
  const heading = String(title || "").trim();
  const message = String(body || "").trim();

  return (
    <div
      className={cn(
        "vs-toast-shell",
        `vs-toast-shell--${variant}`,
        visible ? "vs-toast-shell--visible" : "vs-toast-shell--hidden",
      )}
      role={role ?? (variant === "error" ? "alert" : "status")}
    >
      <Icon className={iconClass} aria-hidden />
      {content ?? (
        <div className="vs-toast-content">
          {heading ? <p className="vs-toast-title">{heading}</p> : null}
          {message ? (
            <p className={cn("vs-toast-body", heading && "vs-toast-body--secondary")}>
              {message}
            </p>
          ) : null}
        </div>
      )}
      <button
        type="button"
        className="vs-toast-dismiss"
        aria-label={dismiss}
        onClick={onDismiss}
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
