import type { ReactNode } from "react";
import { cn } from "@/lib/classNames";

type PanelShellProps = {
  children: ReactNode;
  id: string;
  rtl: boolean;
  /** Vertically center shorter panels (home, get started). */
  centered?: boolean;
};

export default function PanelShell({
  children,
  id,
  rtl,
  centered = false,
}: PanelShellProps) {
  return (
    <section
      id={id}
      className="flex h-full min-h-0 w-full min-w-0 flex-[0_0_100%] shrink-0 snap-center snap-always flex-col overflow-hidden overscroll-y-none py-2 sm:py-3"
    >
      <div
        dir={rtl ? "rtl" : "ltr"}
        className={cn(
          "vega-marketing-body mx-auto flex h-full w-full min-w-0 max-w-6xl flex-col overflow-hidden px-3 min-[390px]:px-4 sm:px-6 md:px-8 lg:px-10",
          centered ? "justify-center" : "justify-start",
        )}
      >
        <div className="min-h-0 w-full min-w-0 flex-1 overflow-y-auto overscroll-y-contain">{children}</div>
      </div>
    </section>
  );
}
