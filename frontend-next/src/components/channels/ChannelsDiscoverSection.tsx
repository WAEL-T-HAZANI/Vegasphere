"use client";

import { ChevronRight, Hash, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import ConversationAvatarTile from "@/components/conversation/ConversationAvatarTile";
import { cn } from "@/lib/classNames";
import {
  channelVisibilityLabel,
  formatChannelSlug,
  type ChannelDirectoryEntry,
} from "@/lib/channelsHub";

type ChannelsDiscoverSectionProps = {
  channels: ChannelDirectoryEntry[];
  loading: boolean;
  busy: boolean;
  joinBusyId: string;
  onRefresh: () => void;
  onJoin: (_id: string) => void;
  onScrollToCreate: () => void;
};

export default function ChannelsDiscoverSection({
  channels,
  loading,
  busy,
  joinBusyId,
  onRefresh,
  onJoin,
  onScrollToCreate,
}: ChannelsDiscoverSectionProps) {
  const { t, i18n } = useTranslation();
  const dir = i18n.dir();
  const rtl = dir === "rtl";

  return (
    <section id="discover-channels" dir={dir} className="vs-settings-card space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 flex-1 text-start">
          <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
            <Hash className="vs-brand-icon-accent h-5 w-5 shrink-0" aria-hidden />
            {t("channelsDiscoverTitle")}
          </h2>
          <p className="mt-1 text-sm text-muted">{t("channelsDiscoverIntro")}</p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={busy || loading}
          className="vs-btn-outline-sm inline-flex min-h-10 items-center gap-2 rounded-full px-4 py-2 disabled:opacity-60"
        >
          <RefreshCw
            className={cn("h-4 w-4 shrink-0", (busy || loading) && "animate-spin")}
            aria-hidden
          />
          {t("refreshList")}
        </button>
      </div>

      {loading ? (
        <div className="h-28 animate-pulse rounded-3xl border border-brand-200/35 bg-brand-100/50 dark:border-brand-800/30 dark:bg-brand-900/25" />
      ) : channels.length === 0 ? (
        <div className="vs-brand-dashed-empty px-5 py-10 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200">
            <Hash className="h-5 w-5" aria-hidden />
          </div>
          <p className="mt-4 text-sm font-semibold text-ink">{t("channelsDiscoverEmpty")}</p>
          <p className="mt-2 text-xs leading-relaxed text-muted">{t("channelsDiscoverEmptyHint")}</p>
          <button
            type="button"
            onClick={onScrollToCreate}
            className="vs-btn-primary-pill mt-5 inline-flex items-center gap-1 px-4 py-2 text-sm"
          >
            {t("createNewChannelSection")}
            <ChevronRight className={cn("h-4 w-4", rtl && "rotate-180")} aria-hidden />
          </button>
        </div>
      ) : (
        <ul className="list-none space-y-3">
          {channels.map((channel) => {
            const channelId = String(channel._id || "");
            const channelName = String(channel.name || channelId);
            const slugLabel = formatChannelSlug(channel.channelSlug);
            const subtitle = String(channel.description || "").trim() || slugLabel;
            const joining = joinBusyId === channelId;

            return (
              <li
                key={channelId}
                className="flex flex-col gap-3 rounded-2xl border border-brand-200/45 bg-surface/85 p-3 sm:flex-row sm:items-center sm:gap-3 dark:border-brand-800/35 dark:bg-brand-900/15"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <ConversationAvatarTile
                    name={channelName}
                    avatar={channel.avatar}
                    fallback={t("channelInitialFallback")}
                  />
                  <div className="min-w-0 flex-1 text-start">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-semibold text-ink" dir="auto">
                        {channelName}
                      </span>
                      <span className="vs-chip-current shrink-0 px-2 py-0.5 text-[10px]">
                        {channelVisibilityLabel(channel.visibility, t)}
                      </span>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted" dir="auto">
                      {subtitle}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 sm:ms-auto">
                  <button
                    type="button"
                    onClick={() => onJoin(channelId)}
                    disabled={busy || joining}
                    className="vs-btn-primary inline-flex min-h-10 w-full items-center justify-center rounded-full px-4 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                  >
                    {joining ? t("channelsSaving") : t("joinChannel")}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
