"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";

type LegalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function LegalError({ reset }: LegalErrorProps) {
  const { t } = useTranslation();

  return (
    <div className="vega-page flex min-h-[100dvh] flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-light tracking-tight">{t("legalErrorTitle")}</h1>
      <p className="mt-3 max-w-md text-sm vega-muted">{t("legalErrorBody")}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={reset} className="vega-btn-accent">
          {t("legalErrorRetry")}
        </button>
        <Link href="/" className="vega-btn-ghost">
          {t("legalErrorHome")}
        </Link>
      </div>
    </div>
  );
}
