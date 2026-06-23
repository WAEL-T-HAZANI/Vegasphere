"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/classNames";

export const DropdownRoot = DropdownMenu.Root;
export const DropdownPortal = DropdownMenu.Portal;
export const DropdownTrigger = DropdownMenu.Trigger;
export const DropdownSub = DropdownMenu.Sub;

export type VegaDropdownContentProps = ComponentPropsWithoutRef<
  typeof DropdownMenu.Content
> & {
  wide?: boolean;
  select?: boolean;
  scroll?: boolean;
};

export const VegaDropdownContent = forwardRef<
  HTMLDivElement,
  VegaDropdownContentProps
>(function VegaDropdownContent(
  { className, wide, select, scroll, sideOffset = 6, ...props },
  ref,
) {
  return (
    <DropdownMenu.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "vs-dropdown-content",
        wide && "vs-dropdown-content--wide",
        select && "vs-dropdown-content--select",
        scroll && "vs-dropdown-content--scroll",
        className,
      )}
      {...props}
    />
  );
});

export type VegaDropdownItemProps = ComponentPropsWithoutRef<
  typeof DropdownMenu.Item
> & {
  variant?: "default" | "danger" | "selected";
};

export const VegaDropdownItem = forwardRef<HTMLDivElement, VegaDropdownItemProps>(
  function VegaDropdownItem({ className, variant = "default", ...props }, ref) {
    return (
      <DropdownMenu.Item
        ref={ref}
        className={cn(
          "vs-dropdown-item",
          variant === "danger" && "vs-dropdown-item-danger",
          variant === "selected" && "vs-dropdown-item-selected",
          className,
        )}
        {...props}
      />
    );
  },
);

export const VegaDropdownSeparator = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof DropdownMenu.Separator>
>(function VegaDropdownSeparator({ className, ...props }, ref) {
  return (
    <DropdownMenu.Separator
      ref={ref}
      className={cn("vs-dropdown-separator", className)}
      {...props}
    />
  );
});

export const VegaDropdownSubContent = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof DropdownMenu.SubContent>
>(function VegaDropdownSubContent({ className, sideOffset = 4, ...props }, ref) {
  return (
    <DropdownMenu.SubContent
      ref={ref}
      sideOffset={sideOffset}
      className={cn("vs-dropdown-sub-content", className)}
      {...props}
    />
  );
});

export const VegaDropdownSubTrigger = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof DropdownMenu.SubTrigger>
>(function VegaDropdownSubTrigger({ className, ...props }, ref) {
  return (
    <DropdownMenu.SubTrigger
      ref={ref}
      className={cn("vs-dropdown-sub-trigger", className)}
      {...props}
    />
  );
});

export type VegaDropdownIconTriggerProps = ComponentPropsWithoutRef<"button">;

export const VegaDropdownIconTrigger = forwardRef<
  HTMLButtonElement,
  VegaDropdownIconTriggerProps
>(function VegaDropdownIconTrigger({ className, type = "button", ...props }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn("vs-dropdown-icon-trigger", className)}
      {...props}
    />
  );
});

export const VegaDropdownReactionItem = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof DropdownMenu.Item>
>(function VegaDropdownReactionItem({ className, ...props }, ref) {
  return (
    <DropdownMenu.Item
      ref={ref}
      className={cn("vs-dropdown-reaction-item", className)}
      {...props}
    />
  );
});
