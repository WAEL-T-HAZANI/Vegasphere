"use client";

import { cn } from "@/lib/classNames";
import { conversationAvatarUrl } from "@/lib/avatarUrl";
import { groupInitials } from "@/lib/groupsHub";

type ConversationAvatarTileProps = {
  name: string;
  avatar?: string | null;
  fallback?: string;
  size?: "xs" | "sm" | "md" | "lg";
  rounded?: "2xl" | "full";
  className?: string;
  imgFailed?: boolean;
  onImageError?: () => void;
};

const sizeClasses = {
  xs: "h-9 w-9 text-sm",
  sm: "h-11 w-11 text-sm",
  md: "h-11 w-11 text-sm sm:h-12 sm:w-12 sm:text-base",
  lg: "h-24 w-24 text-2xl",
};

export default function ConversationAvatarTile({
  name,
  avatar,
  fallback = "?",
  size = "sm",
  rounded = "2xl",
  className,
  imgFailed = false,
  onImageError,
}: ConversationAvatarTileProps) {
  const url = conversationAvatarUrl(avatar);
  const initials = groupInitials(name, fallback);
  const roundedClass = rounded === "full" ? "rounded-full" : "rounded-2xl";

  if (url && !imgFailed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        className={cn(
          "shrink-0 object-cover ring-1 ring-brand-200/60 dark:ring-brand-800/50",
          sizeClasses[size],
          roundedClass,
          className,
        )}
        onError={onImageError}
      />
    );
  }

  return (
    <div
      className={cn(
        "vs-icon-tile grid shrink-0 place-items-center font-extrabold",
        sizeClasses[size],
        roundedClass,
        className,
      )}
      aria-hidden
    >
      {initials}
    </div>
  );
}
