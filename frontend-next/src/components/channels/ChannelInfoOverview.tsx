"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Copy, Download, Globe, Hash, Lock, Megaphone, Shield } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/classNames";
import {
  activeChannelTopics,
  channelPostingModeLabel,
  channelVisibilityLabel,
  formatChannelSlug,
  isPrivateChannel,
} from "@/lib/channelsHub";
import { displayTopicName } from "@/lib/topicDisplay";
import { showAppToast } from "@/lib/appToast";
import { api } from "@/lib/api";
import { triggerBrowserDownload } from "@/lib/messageFormat";
import type { Conversation } from "@/types/api";

type ChannelInfoOverviewProps = {
  conversation: Conversation;
  conversationId: string;
  isAdmin: boolean;
};

function DetailRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Hash;
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

export default function ChannelInfoOverview({
  conversation,
  conversationId,
  isAdmin,
}: ChannelInfoOverviewProps) {
  const { t, i18n } = useTranslation();
  const dir = i18n.dir();
  const slug = formatChannelSlug(String(conversation.channelSlug || ""));
  const privateChannel = isPrivateChannel(conversation.visibility);
  const topics = activeChannelTopics(conversation.topics);

  const copySlug = async () => {
    if (!slug) return;
    try {
      await navigator.clipboard.writeText(slug);
      showAppToast({ id: "channel-slug-copy", body: t("channelInfoSlugCopied") });
    } catch {
      showAppToast({ id: "channel-slug-copy-err", body: t("copyFailed") });
    }
  };

  const exportChat = async () => {
    try {
      const { data } = await api.get(`/message/export/${conversationId}`, {
        responseType: "blob",
      });
      const blob =
        data instanceof Blob
          ? data
          : new Blob([JSON.stringify(data)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      triggerBrowserDownload(url, `vegasphere-export-${conversationId.slice(-8)}.json`);
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      showAppToast({ id: "export-done", body: t("exportConversationDone") });
    } catch {
      showAppToast({ id: "export-err", body: t("exportConversationFailed") });
    }
  };

  return (
    <section dir={dir} className="vs-settings-card space-y-4">
      <div className="text-start">
        <h2 className="text-base font-semibold text-ink">{t("channelInfoOverviewTitle")}</h2>
        <p className="mt-1 text-sm text-muted">
          {privateChannel ? t("channelInfoVisibilityHintPrivate") : t("channelInfoVisibilityHintPublic")}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <DetailRow icon={privateChannel ? Lock : Globe} label={t("channelsVisibilityLabel")}>
          {channelVisibilityLabel(conversation.visibility, t)}
        </DetailRow>

        <DetailRow icon={Megaphone} label={t("channelPostingMode")}>
          {channelPostingModeLabel(conversation.channelPostingMode, t)}
        </DetailRow>

        {slug ? (
          <DetailRow icon={Hash} label={t("channelInfoSlugLabel")}>
            <div className="flex flex-wrap items-center gap-2">
              <span dir="ltr" className="font-mono text-sm">
                {slug}
              </span>
              <button
                type="button"
                onClick={() => void copySlug()}
                className="vs-btn-outline-sm inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px]"
              >
                <Copy className="h-3 w-3 shrink-0" aria-hidden />
                {t("channelInfoCopySlug")}
              </button>
            </div>
          </DetailRow>
        ) : null}

        <DetailRow icon={Shield} label={t("channelInfoYourRole")}>
          {isAdmin ? t("groupRoleAdmin") : t("channelRoleSubscriber")}
        </DetailRow>
      </div>

      {topics.length > 0 ? (
        <div className="text-start">
          <div className="text-sm font-semibold text-ink">
            {t("channelInfoTopicsCount", { count: topics.length })}
          </div>
          <ul className="mt-2 list-none space-y-2">
            {topics.map((topic) => {
              const topicId = String(topic.id || "");
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
                      {displayTopicName(String(topic.name || ""), t) || topicId}
                    </span>
                    <span className="shrink-0 text-xs font-semibold text-brand-700 dark:text-brand-200">
                      {t("channelInfoOpenTopic")}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {!privateChannel ? (
        <Link
          href="/channels#discover-channels"
          className="vs-btn-outline inline-flex min-h-10 w-full items-center justify-center gap-2 px-4 py-2 text-sm sm:w-auto"
        >
          {t("channelInfoBrowseDirectory")}
        </Link>
      ) : null}

      <div className="flex flex-col gap-2 border-t border-brand-200/35 pt-4 dark:border-brand-800/30">
        <button
          type="button"
          onClick={() => void exportChat()}
          className="vs-btn-outline inline-flex min-h-10 w-full items-center justify-center gap-2 px-4 py-2 text-sm sm:w-auto"
        >
          <Download className="h-4 w-4 shrink-0" aria-hidden />
          {t("exportConversation")}
        </button>
        <p className="text-xs text-muted">{t("chatExportHint")}</p>
      </div>
    </section>
  );
}
