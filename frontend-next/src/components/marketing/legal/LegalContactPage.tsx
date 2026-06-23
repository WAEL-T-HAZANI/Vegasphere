"use client";

import Link from "next/link";
import {
  ArrowRight,
  Clock,
  Mail,
  MapPin,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import LegalPageShell from "./LegalPageShell";
import { cn } from "@/lib/classNames";

export type ContactCard = {
  title: string;
  body: string;
  icon: "mail" | "clock" | "map";
};

const ICONS = { mail: Mail, clock: Clock, map: MapPin };

export type LegalContactPageProps = {
  title: string;
  intro: string;
  backLabel: string;
  emailCta: string;
  privacyLabel: string;
  cards: ContactCard[];
};

export default function LegalContactPage({
  title,
  intro,
  backLabel,
  emailCta,
  privacyLabel,
  cards,
}: LegalContactPageProps) {
  const { i18n } = useTranslation();
  const rtl = i18n.dir() === "rtl";

  return (
    <LegalPageShell
      backLabel={backLabel}
      currentPath="/legal/contact"
      maxWidth="lg"
    >
      <div className="text-center md:text-start">
        <h1 className="text-2xl font-light tracking-tight min-[390px]:text-3xl md:text-4xl">
          {title}
        </h1>
        <p className="vega-ar-copy mx-auto mt-4 max-w-lg text-sm leading-7 vega-muted md:mx-0">
          {intro}
        </p>

        <div className="mt-6 flex w-full flex-col items-stretch gap-3 sm:mt-8 sm:flex-row sm:flex-wrap md:justify-start">
          <a
            href="mailto:wael.t.hazani@gmail.com"
            className="vega-btn-accent inline-flex w-full gap-2 sm:w-auto"
          >
            {emailCta}
            <ArrowRight className={cn("h-4 w-4 shrink-0", rtl && "rotate-180")} />
          </a>
          <Link
            href="/legal/privacy"
            className="vega-btn-ghost w-full text-xs sm:w-auto"
          >
            {privacyLabel}
          </Link>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-3 sm:mt-10 sm:grid-cols-2 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => {
          const Icon = ICONS[card.icon];
          return (
            <div
              key={card.title}
              className="rounded-2xl border vega-hairline vega-glass p-5 text-center sm:p-6 md:text-start"
            >
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border vega-hairline bg-[rgb(var(--vega-paper))] md:mx-0">
                <Icon className="h-5 w-5 vega-brand-text" />
              </div>
              <h2 className="mt-4 text-sm font-semibold">{card.title}</h2>
              <p className="vega-ar-copy mt-2 text-xs leading-6 vega-muted">{card.body}</p>
            </div>
          );
        })}
      </div>
    </LegalPageShell>
  );
}
