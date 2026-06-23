"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { MessageSquare, Shield, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/classNames";
import { activeChannelTopics } from "@/lib/channelsHub";
import { displayTopicName } from "@/lib/topicDisplay";
import type { Conversation } from "@/types/api";

type GroupInfoOverviewProps = {
  conversation: Conversation;
  conversationId: string;
  isAdmin: boolean;
  memberCount: number;
};

function DetailRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Users;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-brand-200/45 bg-gradient-to-br from-surface/95 to-brand-50/35 px-4 py-3 dark:border-brand-800/35 dark:from-brand-900/20 dark:to-brand-950/10">
      <div className="flex items-start gap-3 text-start">
        <div className="vs-icon-tile grid h-9 w-9 shrink-0 place-items-center rounded-xl">
          <Icon className="h-4 w-4 text-brand-700 dark:text-brand-200" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</div>
          <div className="mt-1 text-sm font-semibold text-ink">{children}</div>
        </div>
      </div>
    </div>
  );
}

export default function GroupInfoOverview({
  conversation,
  conversationId,
  isAdmin,
  memberCount,
}: GroupInfoOverviewProps) {
  const { t, i18n } = useTranslation();
  const dir = i18n.dir();
  const topics = activeChannelTopics(conversation.topics);

  return (
    <section dir={dir} className="vs-settings-card space-y-4">
      <div className="text-start">
        <h2 className="text-base font-semibold text-ink">{t("groupInfoOverviewTitle")}</h2>
        <p className="mt-1 text-sm text-muted">{t("groupInfoOverviewHint")}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <DetailRow icon={Users} label={t("groupInfoMembersLabel")}>
          {t("groupListMemberHint", { count: memberCount })}
        </DetailRow>
        <DetailRow icon={Shield} label={t("groupInfoYourRole")}>
          {isAdmin ? t("groupRoleAdmin") : t("groupRoleMember")}
        </DetailRow>
      </div>

      {topics.length > 0 ? (
        <div className="text-start">
          <div className="text-sm font-semibold text-ink">
            {t("groupInfoTopicsCount", { count: topics.length })}
          </div>
          <ul className="mt-2 list-none space-y-2">
            {topics.map((topic) => {
              const topicId = String(topic.id || "");
              const label = displayTopicName(String(topic.name || ""), t);
              return (
                <li key={topicId}>
                  <Link
                    href={`/chat/${conversationId}?topicId=${encodeURIComponent(topicId)}`}
                    className={cn(
                      "flex items-center justify-between gap-3 rounded-xl border border-brand-200/45 px-3 py-2.5 text-sm transition",
                      "hover:border-brand-400/60 hover:bg-brand-50/50 dark:border-brand-800/35 dark:hover:bg-brand-900/20",
                    )}
                  >
                    <span className="truncate font-medium text-ink" dir="auto">
                      {label}
                    </span>
                    <span className="shrink-0 text-xs font-semibold text-brand-700 dark:text-brand-200">
                      {t("groupInfoOpenTopic")}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <Link
        href={`/chat/${conversationId}`}
        className="vs-btn-outline inline-flex min-h-10 w-full items-center justify-center gap-2 px-4 py-2 text-sm sm:w-auto"
      >
        <MessageSquare className="h-4 w-4 shrink-0" aria-hidden />
        {t("groupInfoOpenChat")}
      </Link>
    </section>
  );

}
