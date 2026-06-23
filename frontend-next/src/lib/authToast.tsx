"use client";

import toast from "react-hot-toast";
import { getToastPosition, ToastShell } from "@/lib/toastShell";

type AuthToastVariant = "success" | "error";

function showAuthToast(
  variant: AuthToastVariant,
  message: string,
  id?: string,
) {
  const text = String(message || "").trim();
  if (!text) return;

  const toastId = id ?? `auth-${variant}`;

  toast.dismiss(toastId);

  toast.custom(
    (t) => (
      <ToastShell
        visible={t.visible}
        variant={variant}
        title={text}
        onDismiss={() => toast.dismiss(t.id)}
      />
    ),
    {
      id: toastId,
      duration: variant === "error" ? 8000 : 5500,
      position: getToastPosition(),
    },
  );
}

export function showAuthSuccessToast(message: string, id?: string) {
  showAuthToast("success", message, id);
}

export function showAuthErrorToast(message: string, id?: string) {
  showAuthToast("error", message, id);
}
