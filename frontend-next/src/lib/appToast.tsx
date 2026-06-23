"use client";

import toast from "react-hot-toast";
import i18n from "@/i18n/client";
import { getToastPosition, ToastShell } from "@/lib/toastShell";

let openConversation: ((_id: string) => void) | null = null;

export function registerToastNavigation(
  handler: ((_id: string) => void) | null | undefined,
) {
  openConversation = typeof handler === "function" ? handler : null;
}

export type AppToastParams = {
  id: string;
  titleKey?: string;
  body?: string;
  /** When set, toast can deep-link into a conversation. */
  conversationId?: string;
};

function renderAppToast(
  variant: "message" | "success" | "error" | "info",
  {
    id,
    titleKey,
    title,
    body = "",
    conversationId,
    duration,
  }: {
    id: string;
    titleKey?: string;
    title?: string;
    body?: string;
    conversationId?: string;
    duration?: number;
  },
) {
  if (!id) return;

  const heading =
    title ||
    (titleKey ? i18n.t(titleKey) : variant === "error" ? i18n.t("errorOccurred") : "");
  const text = String(body || "").slice(0, 240);
  const toastId = id;

  toast.dismiss(toastId);

  toast.custom(
    (t) => (
      <ToastShell
        visible={t.visible}
        variant={variant}
        title={conversationId ? heading : heading || undefined}
        body={conversationId ? text : text || (!heading ? i18n.t("errorOccurred") : "")}
        onDismiss={() => toast.dismiss(t.id)}
        content={
          conversationId ? (
            <button
              type="button"
              className="vs-toast-content vs-toast-content--action min-w-0 flex-1 text-start"
              onClick={() => {
                toast.dismiss(t.id);
                if (openConversation) openConversation(conversationId);
                else if (typeof window !== "undefined") {
                  window.location.href = `/chats/${conversationId}`;
                }
              }}
            >
              {heading ? <p className="vs-toast-title">{heading}</p> : null}
              {text ? (
                <p className="vs-toast-body vs-toast-body--secondary">{text}</p>
              ) : null}
            </button>
          ) : undefined
        }
      />
    ),
    {
      id: toastId,
      duration: duration ?? (variant === "error" ? 8000 : 6500),
      position: getToastPosition(),
    },
  );
}

export function showAppToast({
  id,
  titleKey = "newMessageToastTitle",
  body = "",
  conversationId,
}: AppToastParams) {
  renderAppToast("message", { id, titleKey, body, conversationId });
}

export function showAppSuccessToast(message: string, id?: string) {
  const text = String(message || "").trim();
  if (!text) return;
  renderAppToast("success", {
    id: id ?? `app-success-${text.slice(0, 24)}`,
    title: text,
    duration: 5500,
  });
}

export function showAppErrorToast(message: string, id?: string) {
  const text = String(message || "").trim();
  if (!text) return;
  renderAppToast("error", {
    id: id ?? `app-error-${text.slice(0, 24)}`,
    title: text,
    duration: 8000,
  });
}

export function showAppInfoToast(message: string, id?: string) {
  const text = String(message || "").trim();
  if (!text) return;
  renderAppToast("info", {
    id: id ?? `app-info-${text.slice(0, 24)}`,
    title: text,
    duration: 6500,
  });
}
