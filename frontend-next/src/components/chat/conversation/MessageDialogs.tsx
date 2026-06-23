"use client";

import { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/classNames";

export function EditMessageDialog({ open, onOpenChange, initialText, onSave }) {
  const { t } = useTranslation();
  const [text, setText] = useState(initialText || "");

  useEffect(() => {
    if (open) setText(initialText || "");
  }, [open, initialText]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[92] bg-black/40" />
        <Dialog.Content className="vs-dialog-content fixed left-1/2 top-1/2 z-[93] w-[min(92vw,400px)] -translate-x-1/2 -translate-y-1/2 p-4">
          <Dialog.Title className="text-lg font-semibold text-brand-700 dark:text-brand-300">
            {t("editMessage")}
          </Dialog.Title>
          <textarea
            className="vs-textarea mt-3 min-h-[100px]"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="mt-4 flex justify-end gap-2">
            <Dialog.Close asChild>
              <button type="button" className={cn("vs-btn-outline-sm", "!w-auto")}>
                {t("cancel")}
              </button>
            </Dialog.Close>
            <button
              type="button"
              onClick={() => {
                onSave?.(text);
                onOpenChange?.(false);
              }}
              className={cn("vs-btn-primary-sm", "!w-auto px-4 py-2 text-sm")}
            >
              {t("saveEdit")}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function DeleteMessageDialog({
  open,
  onOpenChange,
  onConfirm,
  deleteCount = 0,
  showDeleteForEveryone = false,
  deleteForEveryone = false,
  onDeleteForEveryoneChange,
}) {
  const { t } = useTranslation();
  const isBulk = deleteCount > 1;
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[92] bg-black/40" />
        <Dialog.Content className="vs-dialog-content fixed left-1/2 top-1/2 z-[93] w-[min(92vw,400px)] -translate-x-1/2 -translate-y-1/2 p-4">
          <Dialog.Title className="text-lg font-semibold text-brand-700 dark:text-brand-300">
            {isBulk
              ? t("deleteSelectedMessages", { count: deleteCount })
              : t("deleteMessage")}
          </Dialog.Title>
          <p className="mt-2 text-sm text-muted">
            {isBulk ? t("confirmDeleteMessages") : t("confirmDeleteMessage")}
          </p>
          {showDeleteForEveryone ? (
            <label className="mt-3 flex cursor-pointer items-start gap-2 text-sm text-muted">
              <input
                type="checkbox"
                checked={deleteForEveryone}
                onChange={(e) => onDeleteForEveryoneChange?.(e.target.checked)}
                className="mt-0.5 accent-brand-600"
              />
              <span>{t("deleteForEveryoneHint")}</span>
            </label>
          ) : null}
          <div className="mt-4 flex justify-end gap-2">
            <Dialog.Close asChild>
              <button type="button" className={cn("vs-btn-outline-sm", "!w-auto")}>
                {t("cancel")}
              </button>
            </Dialog.Close>
            <button
              type="button"
              onClick={() => {
                onConfirm?.({
                  forEveryone: Boolean(showDeleteForEveryone && deleteForEveryone),
                });
                onOpenChange?.(false);
              }}
              className="vs-btn-danger"
            >
              {showDeleteForEveryone && deleteForEveryone
                ? t("deleteForEveryone")
                : t("deleteForMe")}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
