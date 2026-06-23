"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, HelpCircle } from "lucide-react";
import { cn } from "@/lib/classNames";

export default function CallsHelpSection() {
  const { t, i18n } = useTranslation();
  const rtl = i18n.dir() === "rtl";
  const [open, setOpen] = useState(false);

  return (
    <section
      className="vs-settings-card overflow-hidden"
      dir={rtl ? "rtl" : "ltr"}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-4 py-4 text-start md:px-5"
        aria-expanded={open}
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="vs-icon-tile h-10 w-10 rounded-2xl">
            <HelpCircle className="h-5 w-5" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-ink">{t("callsHelpTitle")}</span>
            <span className="mt-0.5 block text-xs text-muted">{t("callsHelpOpenChatHint")}</span>
          </span>
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted transition",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      {open ? (
        <div className="space-y-3 border-t border-brand-200/35 px-4 pb-4 pt-3 dark:border-brand-800/30 md:px-5 md:pb-5">
          <p className="text-sm text-muted">{t("callsHelpGroupHint")}</p>
          <div className="vs-muted-panel space-y-1 text-sm">
            <p className="font-semibold text-ink">{t("callsHelpTechTitle")}</p>
            <p className="text-muted">{t("callsHelpTechBody")}</p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
