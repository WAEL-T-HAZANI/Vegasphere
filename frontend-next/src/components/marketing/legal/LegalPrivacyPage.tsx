"use client";

import { ShieldCheck } from "lucide-react";
import LegalPageShell from "./LegalPageShell";
import { cn } from "@/lib/classNames";

export type LegalSectionContent = {
  id: string;
  title: string;
  body: string;
};

export type LegalPrivacyPageProps = {
  title: string;
  intro: string;
  backLabel: string;
  sections: LegalSectionContent[];
};

export default function LegalPrivacyPage({
  title,
  intro,
  backLabel,
  sections,
}: LegalPrivacyPageProps) {
  return (
    <LegalPageShell
      backLabel={backLabel}
      currentPath="/legal/privacy"
    >
      <div className="text-center md:text-start">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border vega-hairline vega-glass md:mx-0">
          <ShieldCheck className="h-8 w-8 vega-brand-text" />
        </div>
        <h1 className="mt-4 text-2xl font-light tracking-tight min-[390px]:text-3xl sm:mt-6 md:text-4xl">
          {title}
        </h1>
        <p className="vega-ar-copy mx-auto mt-4 max-w-2xl text-sm leading-7 vega-muted md:mx-0">
          {intro}
        </p>
      </div>

      <div className="relative mt-8 space-y-0 sm:mt-10 md:mt-12">
        <div className="absolute start-3 top-0 bottom-0 w-px bg-gradient-to-b from-[rgb(var(--vega-brand)/0.4)] via-[rgb(var(--vega-muted)/0.35)] to-transparent sm:start-4 md:start-5" />
        {sections.map((section, index) => (
          <section
            key={section.id}
            id={section.id}
            className={cn("relative py-5 ps-10 sm:py-6 sm:ps-12 md:py-7 md:ps-14")}
          >
            <span className="absolute start-0 flex h-8 w-8 items-center justify-center rounded-full border vega-hairline bg-[rgb(var(--vega-paper))] text-[10px] font-bold md:start-1">
              {index + 1}
            </span>
            <h2 className="text-base font-semibold tracking-wide sm:text-lg">
              {section.title}
            </h2>
            <p className="vega-ar-copy mt-2.5 text-sm leading-7 vega-muted">{section.body}</p>
          </section>
        ))}
      </div>
    </LegalPageShell>
  );
}
