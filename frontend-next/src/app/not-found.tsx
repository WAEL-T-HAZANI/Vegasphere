"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { buttonClassName } from "@/components/ui/Button";

export default function NotFound() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-6 py-20 text-center text-ink">
      <div className="vs-surface-card max-w-md text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-600 dark:text-brand-400">
          {t("notFoundCode")}
        </p>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-brand-800 dark:text-brand-200">
          {t("notFoundTitle")}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">{t("notFoundBody")}</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className={buttonClassName("primary", "text-center no-underline sm:w-auto sm:min-w-[10rem]", false)}
          >
            {t("notFoundBackHome")}
          </Link>
          <Link
            href="/chats"
            className={buttonClassName("ghost", "text-center no-underline sm:w-auto sm:min-w-[10rem]", false)}
          >
            {t("navChats")}
          </Link>
        </div>
      </div>
    </div>
  );
}
