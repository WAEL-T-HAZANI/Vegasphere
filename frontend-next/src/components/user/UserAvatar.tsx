"use client";

import { useState } from "react";
import { cn } from "@/lib/classNames";
import {
  isCustomAvatar,
  resolveAvatarUrl,
  shouldUseLocalAvatarFallback,
} from "@/lib/avatarUrl";

const SIZE_CLASS = {
  xs: "h-8 w-8 text-[10px]",
  sm: "h-10 w-10 text-xs",
  md: "h-12 w-12 text-sm",
  lg: "h-16 w-16 text-base",
};

function avatarInitials(name: string) {
  return (
    String(name || "V")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "V"
  );
}

type UserAvatarProps = {
  name?: string;
  profilePic?: string | null;
  size?: keyof typeof SIZE_CLASS;
  className?: string;
  imgClassName?: string;
};

export default function UserAvatar({
  name = "",
  profilePic,
  size = "md",
  className,
  imgClassName,
}: UserAvatarProps) {
  const [failed, setFailed] = useState(false);
  const label = String(name || "V").trim() || "V";
  const resolved = resolveAvatarUrl(profilePic);
  const showPhoto =
    Boolean(resolved) &&
    !failed &&
    isCustomAvatar(profilePic) &&
    !shouldUseLocalAvatarFallback(profilePic);

  if (!showPhoto) {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-brand-100 font-extrabold text-brand-700 ring-1 ring-brand-200/60 dark:bg-brand-900/30 dark:text-brand-200 dark:ring-brand-800/50",
          SIZE_CLASS[size],
          className,
        )}
        aria-hidden
      >
        {avatarInitials(label)}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-2xl ring-1 ring-brand-200/60 dark:ring-brand-800/50",
        SIZE_CLASS[size],
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={resolved}
        alt=""
        className={cn("h-full w-full object-cover", imgClassName)}
        onError={() => setFailed(true)}
      />
    </div>
  );
}
