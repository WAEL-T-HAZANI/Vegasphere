"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Hash, MessageCircle, Users } from "lucide-react";
import { cn } from "@/lib/classNames";
import { dashboardListLinkClass } from "@/components/layout/DashboardPageLayout";
import SearchPersonRow from "@/components/search/SearchPersonRow";
import {
  conversationPreview,
  messagePreview,
  searchTotals,
  type GlobalSearchResult,
} from "@/lib/searchHub";
import { buildMessageResultHref } from "@/lib/chatList";
import type { User } from "@/types";

type SearchResultsViewProps = {
  query: string;
  loading: boolean;
  error: string;
  result: GlobalSearchResult;
  focusUserId: string;
  actionBusy: boolean;
  presenceById?: Record<string, { online?: boolean; lastSeen?: string }>;
  onStartChat: (_userId: string) => void;
  onViewProfile: (_userId: string) => void;
  onBlock: (_userId: string) => void;
  onIgnore: (_userId: string) => void;
};

function SectionShell({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Users;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("vs-settings-card space-y-4", "!p-4 sm:!p-5 md:!p-6")}>
      <h2 className="flex items-center gap-2 border-b vs-brand-divider pb-3 text-xs font-bold uppercase tracking-wider text-muted dark:border-brand-800/30">
        <Icon className="vs-brand-icon-accent h-4 w-4 shrink-0" />
        {title}
      </h2>
      {children}
    </section>
  );
}

function EmptyHint({ children }: { children: ReactNode }) {
  return (
    <p className="vs-brand-dashed-empty px-4 py-6 text-sm">
      {children}
    </p>
  );
}

export default function SearchResultsView({
  query,
  loading,
  error,
  result,
  focusUserId,
  actionBusy,
  presenceById,
  onStartChat,
  onViewProfile,
  onBlock,
  onIgnore,
}: SearchResultsViewProps) {
  const { t } = useTranslation();
  const totals = searchTotals(result);

  if (loading) {
    return (
      <div className="vs-muted-panel flex items-center gap-3 text-sm">
        <span
          className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-brand-700 border-t-transparent dark:border-brand-500 dark:border-t-transparent"
          aria-hidden
        />
        {t("globalSearchLoading")}
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="rounded-2xl vs-brand-inset px-4 py-3 text-sm">
        <p className="font-semibold text-ink">{t("globalSearchResultsFor", { query })}</p>
        <p className="mt-1 text-xs text-muted">
          {t("globalSearchResultsSummary", {
            people: totals.people,
            chats: totals.chats,
            messages: totals.messages,
          })}
        </p>
      </div>

      {error ? (
        <div role="alert" className="vs-muted-panel text-sm leading-relaxed text-red-600 dark:text-red-300">
          {error}
        </div>
      ) : null}

      {!error && totals.all === 0 ? (
        <EmptyHint>{t("globalSearchNoResults")}</EmptyHint>
      ) : null}

      <SectionShell icon={Users} title={t("globalSearchPeople")}>
        {result.users.length === 0 ? (
          <EmptyHint>{t("globalSearchNoPeople")}</EmptyHint>
        ) : (
          <ul className="list-none space-y-3">
            {result.users.map((u: User) => (
              <SearchPersonRow
                key={String(u._id)}
                user={u}
                focused={Boolean(focusUserId) && String(u._id) === focusUserId}
                actionBusy={actionBusy}
                presenceById={presenceById}
                onStartChat={onStartChat}
                onViewProfile={onViewProfile}
                onBlock={onBlock}
                onIgnore={onIgnore}
              />
            ))}
          </ul>
        )}
      </SectionShell>

      <SectionShell icon={Hash} title={t("globalSearchChats")}>
        {result.conversations.length === 0 ? (
          <EmptyHint>{t("globalSearchNoChats")}</EmptyHint>
        ) : (
          <ul className="space-y-2">
            {result.conversations.map((c) => (
              <li key={String(c._id)}>
                <Link href={`/chats/${c._id}`} className={dashboardListLinkClass()}>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-ink">{c.name}</span>
                    {c.isChannel ? (
                      <span className="vs-chip-current rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                        {t("channelBadge")}
                      </span>
                    ) : null}
                    {c.isGroup && !c.isChannel ? (
                      <span className="vs-chip-current rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                        {t("groupBadge")}
                      </span>
                    ) : null}
                  </div>
                  <span className="mt-1 block truncate text-xs text-muted">
                    {conversationPreview(c) || "—"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </SectionShell>

      <SectionShell icon={MessageCircle} title={t("globalSearchMessages")}>
        {result.messages.length === 0 ? (
          <EmptyHint>{t("globalSearchNoMessages")}</EmptyHint>
        ) : (
          <ul className="space-y-2">
            {result.messages.map((m) => (
              <li key={String(m._id)}>
                <Link href={buildMessageResultHref(m)} className={dashboardListLinkClass()}>
                  <span className="vs-brand-text-link text-xs">
                    {m.conversationName}
                  </span>
                  <p className="mt-1 line-clamp-2 text-sm text-ink">{messagePreview(m)}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </SectionShell>
    </div>
  );
}
