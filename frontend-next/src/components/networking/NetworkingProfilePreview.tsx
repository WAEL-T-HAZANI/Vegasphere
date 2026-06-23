"use client";

import { useTranslation } from "react-i18next";
import Link from "next/link";
import { ExternalLink, UserRound } from "lucide-react";
import { cn } from "@/lib/classNames";

type NetworkingProfilePreviewProps = {
  userId?: string;
  name?: string;
  username?: string;
  profilePic?: string;
};

export default function NetworkingProfilePreview({
  userId,
  name,
  username,
  profilePic,
}: NetworkingProfilePreviewProps) {
  const { t, i18n } = useTranslation();
  const rtl = i18n.dir() === "rtl";
  const label = name || username || t("navProfile");
  const initials = label.slice(0, 2).toUpperCase();

  if (!userId) return null;

  return (
    <div
      dir={rtl ? "rtl" : "ltr"}
      className="rounded-2xl border border-brand-200/40 bg-surface/70 p-3 ring-1 ring-brand-700/[0.03] dark:border-brand-800/40 dark:bg-brand-900/20 dark:ring-brand-800/20"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
        {t("networkingProfilePreviewTitle")}
      </p>
      <div className="mt-3 flex items-center gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-2xl vs-icon-tile text-sm font-extrabold">
          {profilePic ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profilePic} alt="" className="h-full w-full object-cover" />
          ) : (
            initials
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-ink">{label}</div>
          <p className="mt-0.5 text-xs leading-relaxed text-muted">
            {t("networkingProfilePreviewHint")}
          </p>
        </div>
        <Link
          href={`/user/${encodeURIComponent(userId)}`}
          className="vs-btn-outline-sm inline-flex shrink-0 items-center gap-1.5 px-3 py-2 text-xs"
        >
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          {t("networkingPreviewProfile")}
        </Link>
      </div>
      <Link
        href="/profile"
        className={cn(
          "vs-brand-text-link mt-3 inline-flex items-center gap-1.5 text-xs font-semibold",
        )}
      >
        <UserRound className="h-3.5 w-3.5" aria-hidden />
        {t("networkingEditMainProfile")}
      </Link>
    </div>
  );
}
