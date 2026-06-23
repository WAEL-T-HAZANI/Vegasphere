"use client";

import { useTranslation } from "react-i18next";
import { Compass, Hash, MessageCircle, Users } from "lucide-react";
import IncomingInvitesPanel from "@/components/search/IncomingInvitesPanel";
import ContactMatchSection from "@/components/search/ContactMatchSection";
import NonFriendsSection from "@/components/search/NonFriendsSection";

export default function SearchDiscoverView() {
  const { t } = useTranslation();

  return (
    <div className="space-y-5 sm:space-y-6">
      <section className="vs-settings-card overflow-hidden !p-0">
        <div className="vs-brand-panel-head px-4 py-5 sm:px-6">
          <div className="flex items-start gap-3">
            <div className="vs-icon-tile h-11 w-11 shrink-0 rounded-2xl">
              <Compass className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-ink">{t("globalSearchWelcomeTitle")}</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted">
                {t("globalSearchWelcomeBody")}
              </p>
            </div>
          </div>
        </div>
        <ul className="grid gap-0 sm:grid-cols-3">
          <li className="flex items-start gap-3 border-b vs-brand-divider px-4 py-4 sm:border-b-0 sm:border-e dark:sm:border-e-brand-800/25">
            <Users className="vs-brand-icon-accent mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-ink">{t("globalSearchPeople")}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                {t("globalSearchWelcomePeopleHint")}
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3 border-b vs-brand-divider px-4 py-4 sm:border-b-0 sm:border-e dark:sm:border-e-brand-800/25">
            <Hash className="vs-brand-icon-accent mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-ink">{t("globalSearchChats")}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                {t("globalSearchWelcomeChatsHint")}
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3 px-4 py-4">
            <MessageCircle className="vs-brand-icon-accent mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-ink">{t("globalSearchMessages")}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                {t("globalSearchWelcomeMessagesHint")}
              </p>
            </div>
          </li>
        </ul>
      </section>

      <IncomingInvitesPanel />

      <div className="grid gap-5 lg:grid-cols-2 lg:gap-6">
        <ContactMatchSection />
        <NonFriendsSection />
      </div>
    </div>
  );
}
