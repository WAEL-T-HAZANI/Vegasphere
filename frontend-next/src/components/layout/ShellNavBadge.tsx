import { cn } from "@/lib/classNames";

type ShellNavBadgeProps = {
  count?: number;
  compact?: boolean;
  className?: string;
};

export function formatShellBadgeCount(count?: number) {
  const value = Number(count || 0);
  if (!Number.isFinite(value) || value <= 0) return "";
  return value > 99 ? "99+" : String(Math.floor(value));
}

export default function ShellNavBadge({
  count,
  compact = false,
  className,
}: ShellNavBadgeProps) {
  const label = formatShellBadgeCount(count);
  if (!label) return null;

  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-extrabold leading-5 text-white shadow-md shadow-red-600/25 ring-2 ring-surface dark:ring-gray-950",
        compact && "min-w-4 px-1 text-[9px] leading-4",
        className,
      )}
    >
      {label}
    </span>
  );
}
