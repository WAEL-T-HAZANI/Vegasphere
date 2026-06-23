"use client";

import { useTranslation } from "react-i18next";
import { MoreHorizontal, UserRound } from "lucide-react";
import { cn } from "@/lib/classNames";
import {
  DropdownPortal,
  DropdownRoot,
  DropdownTrigger,
  VegaDropdownContent,
  VegaDropdownIconTrigger,
  VegaDropdownItem,
} from "@/components/ui/VegaDropdownMenu";
import {
  displayUserPrimaryLabel,
  userHandleLine,
  userInitials,
} from "@/lib/searchHub";
import PresenceDot from "@/components/presence/PresenceDot";
import { presenceStateForUser } from "@/hooks/usePresenceBatch";
import type { User } from "@/types";

type SearchPersonRowProps = {
  user: User;
  focused?: boolean;
  actionBusy?: boolean;
  presenceById?: Record<string, { online?: boolean; lastSeen?: string }>;
  onStartChat: (_userId: string) => void;
  onViewProfile: (_userId: string) => void;
  onBlock: (_userId: string) => void;
  onIgnore: (_userId: string) => void;
};

export default function SearchPersonRow({
  user,
  focused = false,
  actionBusy = false,
  presenceById,
  onStartChat,
  onViewProfile,
  onBlock,
  onIgnore,
}: SearchPersonRowProps) {
  const { t, i18n } = useTranslation();
  const rtl = i18n.dir() === "rtl";
  const userId = String(user._id || "");
  const label = displayUserPrimaryLabel(user);
  const handle = userHandleLine(user);
  const avatarUrl = String(user.profilePic || "").trim();
  const initials = userInitials(label);

  return (
    <li
      className={cn(
        "rounded-2xl vs-brand-inset px-3 py-3 shadow-sm sm:px-4 sm:py-4",
        focused && "ring-2 ring-brand-500",
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="relative h-11 w-11 shrink-0">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt=""
                className="h-11 w-11 rounded-2xl object-cover ring-1 ring-brand-200/60 dark:ring-brand-800/50"
              />
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl vs-icon-tile text-sm font-extrabold">
                {initials || "V"}
              </div>
            )}
            <span className="pointer-events-none absolute bottom-0 end-0 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-surface ring-1 ring-brand-200/60 dark:bg-black dark:ring-white/10">
              <PresenceDot state={presenceStateForUser(presenceById, userId)} />
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-base font-semibold leading-snug text-ink">{label}</div>
            {handle ? (
              <div className="mt-0.5 truncate text-xs leading-snug text-muted">{handle}</div>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
          <button
            type="button"
            onClick={() => onStartChat(userId)}
            disabled={actionBusy}
            className="vs-btn-primary-pill min-h-10 w-full px-4 py-2 sm:w-auto"
          >
            {t("startChat")}
          </button>
          <button
            type="button"
            onClick={() => onViewProfile(userId)}
            disabled={actionBusy}
            className="vs-btn-outline-sm inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-full px-4 py-2 disabled:opacity-60 sm:w-auto"
          >
            <UserRound className="h-4 w-4" aria-hidden />
            {t("viewProfile")}
          </button>

          <div className="flex w-full flex-col gap-2 md:hidden">
            <button
              type="button"
              onClick={() => onIgnore(userId)}
              disabled={actionBusy}
              className="vs-btn-outline-sm min-h-10 w-full rounded-full px-4 py-2 disabled:opacity-60"
            >
              {t("contactIgnoreNotifications")}
            </button>
            <button
              type="button"
              onClick={() => onBlock(userId)}
              disabled={actionBusy}
              className="min-h-10 w-full rounded-full border border-red-200/80 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60 dark:border-red-900/50 dark:text-red-300 dark:hover:bg-red-950/40"
            >
              {t("blockUser")}
            </button>
          </div>

          <DropdownRoot dir={rtl ? "rtl" : "ltr"}>
            <DropdownTrigger asChild>
              <VegaDropdownIconTrigger
                disabled={actionBusy}
                className="hidden md:inline-flex"
                aria-label={t("searchMoreActions")}
              >
                <MoreHorizontal className="h-4 w-4" aria-hidden />
              </VegaDropdownIconTrigger>
            </DropdownTrigger>
            <DropdownPortal>
              <VegaDropdownContent align="end" className="z-[300]">
                <VegaDropdownItem onSelect={() => onIgnore(userId)}>
                  {t("contactIgnoreNotifications")}
                </VegaDropdownItem>
                <VegaDropdownItem variant="danger" onSelect={() => onBlock(userId)}>
                  {t("blockUser")}
                </VegaDropdownItem>
              </VegaDropdownContent>
            </DropdownPortal>
          </DropdownRoot>
        </div>
      </div>
    </li>
  );
}
