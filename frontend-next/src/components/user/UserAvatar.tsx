"use client";

import { useState } from "react";
import { cn } from "@/lib/classNames";
import {
  brandDefaultAvatarUrl,
  resolveAvatarUrl,
  shouldUseLocalAvatarFallback,
} from "@/lib/avatarUrl";

const SIZE_CLASS = {
  xs: "h-8 w-8 text-[10px]",
  sm: "h-10 w-10 text-xs",
  md: "h-12 w-12 text-sm",
  lg: "h-16 w-16 text-base",
};

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
    !shouldUseLocalAvatarFallback(profilePic);
  const src = showPhoto ? resolved : brandDefaultAvatarUrl(label);

  return (
    <div
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-2xl vs-icon-tile font-extrabold",
        SIZE_CLASS[size],
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        className={cn("h-full w-full object-cover", imgClassName)}
        onError={() => setFailed(true)}
      />
    </div>
  );
}
