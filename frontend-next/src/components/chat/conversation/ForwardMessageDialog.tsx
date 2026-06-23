"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useTranslation } from "react-i18next";
import { useAppSelector } from "@/store/hooks";

import { cn } from "@/lib/classNames";

export default function ForwardMessageDialog({
  open,
  onOpenChange,
  currentConversationId,
  onSelect,
  forwardCount = 1,
}) {
  const { t } = useTranslation();
  const conversations = useAppSelector((s) => s.chat.conversations);
  const targets = (conversations || []).filter(
    (c) => String(c._id) !== String(currentConversationId)
  );

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="vs-dialog-content fixed left-1/2 top-1/2 z-[91] max-h-[min(80vh,520px)] w-[min(92vw,400px)] -translate-x-1/2 -translate-y-1/2 p-4">
          <Dialog.Title className="text-lg font-semibold text-brand-700 dark:text-brand-300">
            {forwardCount > 1
              ? t("forwardNMessages", { count: forwardCount })
              : t("selectConversationToForward")}
          </Dialog.Title>
          <ul className="mt-3 max-h-80 space-y-1 overflow-y-auto">
            {targets.length === 0 ? (
              <li className="px-2 py-6 text-center text-sm text-muted">
                {t("forwardNoOtherChats")}
              </li>
            ) : (
              targets.map((c) => {
                const title =
                  c.name ||
                  c.members?.[0]?.name ||
                  c.members?.[0]?.email ||
                  "Chat";
                return (
                  <li key={c._id}>
                    <button
                      type="button"
                      className={cn(
                        "w-full rounded-lg px-3 py-2 text-left text-sm outline-none transition hover:bg-subtle focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-inset"
                      )}
                      onClick={() => {
                        onSelect?.(String(c._id));
                        onOpenChange?.(false);
                      }}
                    >
                      {title}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
          <Dialog.Close asChild>
            <button
              type="button"
              className="vs-btn-outline mt-3 w-full py-2.5"
            >
              {t("cancel")}
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
