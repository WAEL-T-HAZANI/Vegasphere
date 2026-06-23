"use client";

import { Scale } from "lucide-react";
import LegalPageShell from "./LegalPageShell";
import type { LegalSectionContent } from "./LegalPrivacyPage";

export type LegalTermsPageProps = {
  title: string;
  intro: string;
  backLabel: string;
  contentsLabel: string;
  sections: LegalSectionContent[];
};

export default function LegalTermsPage({
  title,
  intro,
  backLabel,
  contentsLabel,
  sections,
}: LegalTermsPageProps) {
  return (
    <LegalPageShell
      backLabel={backLabel}
      currentPath="/legal/terms"
      maxWidth="xl"
    >
      <div className="flex flex-col items-center gap-4 border-b vega-hairline pb-6 text-center sm:flex-row sm:items-start sm:gap-4 sm:pb-8 sm:text-start">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border vega-hairline vega-glass">
          <Scale className="h-7 w-7 vega-brand-text" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-light tracking-tight min-[390px]:text-3xl md:text-4xl">
            {title}
          </h1>
          <p className="vega-ar-copy mt-3 max-w-3xl text-sm leading-7 vega-muted">{intro}</p>
        </div>
      </div>

      <nav
        className="mt-8 flex gap-2 overflow-x-auto pb-1 lg:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Table of contents"
      >
        {sections.map((s, i) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="shrink-0 rounded-full border vega-hairline px-3 py-1.5 text-[11px] font-medium vega-muted transition hover:vega-brand-text"
          >
            {i + 1}. {s.title}
          </a>
        ))}
      </nav>

      <div className="mt-8 grid gap-6 sm:mt-10 sm:gap-8 lg:grid-cols-[minmax(0,1fr)_240px] lg:gap-10">
        <div className="space-y-4">
          {sections.map((section, index) => (
            <article
              key={section.id}
              id={section.id}
              className="rounded-2xl border vega-hairline vega-glass p-5 sm:p-6"
            >
              <span className="vega-latin-display text-[10px] font-bold vega-brand-text">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h2 className="mt-2 text-base font-semibold sm:text-lg">
                {section.title}
              </h2>
              <p className="vega-ar-copy mt-2 text-sm leading-7 vega-muted">{section.body}</p>
            </article>
          ))}
        </div>

        <aside className="hidden lg:block">
          <nav
            className="sticky top-8 space-y-1 rounded-2xl border vega-hairline vega-glass p-3"
            aria-label="Table of contents"
          >
            <p className="vega-latin-display px-3 py-2 text-[10px] font-bold vega-muted">
              {contentsLabel}
            </p>
            {sections.map((s, i) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="block rounded-xl px-3 py-2 text-xs font-medium vega-muted transition hover:bg-[rgb(var(--vega-muted)/0.08)] hover:text-[rgb(var(--vega-ink))]"
              >
                {i + 1}. {s.title}
              </a>
            ))}
          </nav>
        </aside>
      </div>
    </LegalPageShell>
  );
}
