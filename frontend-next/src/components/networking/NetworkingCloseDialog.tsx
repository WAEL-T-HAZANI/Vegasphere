"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/classNames";

type NetworkingCloseDialogProps = {
  open: boolean;
  onOpenChange: (_open: boolean) => void;
  onConfirm: () => void;
};

export default function NetworkingCloseDialog({
  open,
  onOpenChange,
  onConfirm,
}: NetworkingCloseDialogProps) {
  const { t, i18n } = useTranslation();
  const rtl = i18n.dir() === "rtl";

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[92] bg-black/40" />
        <Dialog.Content
          dir={rtl ? "rtl" : "ltr"}
          className="vs-dialog-content fixed left-1/2 top-1/2 z-[93] w-[min(92vw,400px)] -translate-x-1/2 -translate-y-1/2 p-4"
        >
          <Dialog.Title className="text-start text-lg font-semibold text-brand-700 dark:text-brand-300">
            {t("networkingClosePost")}
          </Dialog.Title>
          <p className="mt-2 text-start text-sm text-muted">{t("networkingClosePostConfirm")}</p>
          <div className="mt-4 flex justify-end gap-2">
            <Dialog.Close asChild>
              <button type="button" className={cn("vs-btn-outline-sm", "!w-auto")}>
                {t("cancel")}
              </button>
            </Dialog.Close>
            <button
              type="button"
              onClick={() => {
                onConfirm();
                onOpenChange(false);
              }}
              className="vs-btn-danger"
            >
              {t("networkingClosePost")}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
