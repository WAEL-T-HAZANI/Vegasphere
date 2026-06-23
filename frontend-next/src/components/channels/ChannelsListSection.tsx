"use client";

import Link from "next/link";
import { ChevronRight, Hash, Settings2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import ConversationAvatarTile from "@/components/conversation/ConversationAvatarTile";
import { dashboardListLinkClass } from "@/components/layout/DashboardPageLayout";
import { cn } from "@/lib/classNames";
import { buildChatHref } from "@/lib/chatList";
import { isConversationAdmin } from "@/lib/groupsHub";
import {
  channelVisibilityLabel,
  formatChannelSlug,
  formatChannelUpdatedAt,
} from "@/lib/channelsHub";
import type { Conversation } from "@/types/api";

type ChannelsListSectionProps = {
  channels: Conversation[];
  loading: boolean;
  currentUserId?: string;
  onScrollToDiscover: () => void;
  onScrollToCreate: () => void;
};

export default function ChannelsListSection({
  channels,
  loading,
  currentUserId,
  onScrollToDiscover,
  onScrollToCreate,
}: ChannelsListSectionProps) {
  const { t, i18n } = useTranslation();
  const dir = i18n.dir();
  const rtl = dir === "rtl";
  const locale = i18n.resolvedLanguage || i18n.language;

  return (
    <section dir={dir} className="vs-settings-card space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 flex-1 text-start">
          <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
            <Hash className="vs-brand-icon-accent h-5 w-5 shrink-0" aria-hidden />
            {t("channelsYourChannelsTitle")}
          </h2>
          <p className="mt-1 text-sm text-muted">{t("channelsYourChannelsIntro")}</p>
        </div>
        {channels.length > 0 ? (
          <span className="vs-chip-current shrink-0 px-3 py-1 text-xs">
            {t("channelsCount", { count: channels.length })}
          </span>
        ) : null}
      </div>

      {loading ? (
        <div className="h-28 animate-pulse rounded-3xl border border-brand-200/35 bg-brand-100/50 dark:border-brand-800/30 dark:bg-brand-900/25" />
      ) : channels.length === 0 ? (
        <div className="vs-brand-dashed-empty px-5 py-10 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200">
            <Hash className="h-5 w-5" aria-hidden />
          </div>
          <p className="mt-4 text-sm font-semibold text-ink">{t("channelsYourChannelsEmpty")}</p>
          <div className="mt-5 flex flex-col gap-2 min-[420px]:flex-row min-[420px]:justify-center">
            <button
              type="button"
              onClick={onScrollToDiscover}
              className="vs-btn-outline inline-flex min-h-10 items-center justify-center gap-1 px-4 py-2 text-sm"
            >
              {t("channelsDiscoverTitle")}
              <ChevronRight className={cn("h-4 w-4", rtl && "rotate-180")} aria-hidden />
            </button>
            <button
              type="button"
              onClick={onScrollToCreate}
              className="vs-btn-primary-pill inline-flex min-h-10 items-center justify-center gap-1 px-4 py-2 text-sm"
            >
              {t("createNewChannelSection")}
              <ChevronRight className={cn("h-4 w-4", rtl && "rotate-180")} aria-hidden />
            </button>
          </div>
        </div>
      ) : (
        <ul className="list-none space-y-3">
          {channels.map((channel) => {
            const channelId = String(channel._id || "");
            const channelName = String(channel.name || channelId);
            const memberCount = channel.members?.length ?? 0;
            const timeLabel = formatChannelUpdatedAt(channel.updatedAt, locale);
            const slugLabel = formatChannelSlug(
              String(channel.channelSlug || ""),
            );
            const visibility = channelVisibilityLabel(channel.visibility, t);
            const isAdmin = isConversationAdmin(channel, currentUserId);

            return (
              <li key={channelId}>
                <div
                  className={cn(
                    dashboardListLinkClass(),
                    "flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:gap-3",
                  )}
                >
                  <Link
                    href={buildChatHref(channelId, channel, { from: "channels" })}
                    className="flex min-w-0 flex-1 items-center gap-3"
                  >
                    <ConversationAvatarTile
                      name={channelName}
                      avatar={channel.avatar}
                      fallback={t("channelInitialFallback")}
                    />
                    <div className="min-w-0 flex-1 text-start">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className="truncate text-sm font-semibold text-ink"
                              dir="auto"
                            >
                              {channelName}
                            </span>
                            <span className="vs-chip-current shrink-0 px-2 py-0.5 text-[10px]">
                              {visibility}
                            </span>
                            {isAdmin ? (
                              <span className="vs-chip-current shrink-0 px-2 py-0.5 text-[10px]">
                                {t("groupRoleAdmin")}
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-0.5 text-xs text-muted">
                            {t("channelListSubscriberHint", { count: memberCount })}
                            {slugLabel ? (
                              <span className="ms-2 font-medium text-brand-700 dark:text-brand-200">
                                {slugLabel}
                              </span>
                            ) : null}
                          </div>
                        </div>
                        {timeLabel ? (
                          <span className="shrink-0 text-[10px] font-semibold text-muted">
                            {timeLabel}
                          </span>
                        ) : null}
                      </div>
                      {channel.description ? (
                        <p className="mt-1 line-clamp-1 text-xs text-muted" dir="auto">
                          {String(channel.description)}
                        </p>
                      ) : null}
                    </div>
                    <ChevronRight
                      className={cn(
                        "h-4 w-4 shrink-0 text-muted opacity-60",
                        rtl && "rotate-180",
                      )}
                      aria-hidden
                    />
                  </Link>
                  {isAdmin ? (
                    <Link
                      href={`/chat/${channelId}/info`}
                      className="vs-btn-outline-sm inline-flex w-full items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs sm:w-auto sm:py-1.5"
                      title={t("channelManageLink")}
                    >
                      <Settings2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      {t("channelManageLink")}
                    </Link>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
