"use client";

import Link from "next/link";
import {
  MessageSquare,
  Users,
  ImageIcon,
  FileText,
  Loader2,
  SearchX,
} from "lucide-react";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import { cn } from "@/lib/classNames";
import {
  conversationTitle,
  conversationKindMeta,
  buildMessageResultHref,
  buildChatHref,
  resolvePersonSearchHref,
  senderLabelForResult,
  displayUserPrimaryLabel,
  conversationLatestPreview,
  formatConversationPreview,
} from "@/lib/chatList";

function SearchSection({ title, icon: Icon, children, compact }) {
  return (
    <section className={cn(compact ? "px-1" : "px-0")}>
      <div className="flex items-center gap-2 px-3 py-2">
        <Icon className="h-3.5 w-3.5 text-brand-700 dark:text-brand-300" aria-hidden />
        <h3 className="text-start text-[11px] font-bold uppercase tracking-wide text-brand-800 dark:text-[rgb(var(--vega-ink))]/90">
          {title}
        </h3>
      </div>
      <ul className="divide-y divide-brand-200/30 dark:divide-brand-800/35">
        {children}
      </ul>
    </section>
  );
}

function SearchResultRow({ href, title, subtitle, badge = null, badgeTone = "muted" }) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-center gap-3 px-3 py-2.5 text-start transition hover:bg-brand-50/60 dark:hover:bg-brand-800/25"
      >
        <div className="min-w-0 flex-1 text-start">
          <div className="flex min-w-0 items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-start text-sm font-semibold text-ink" dir="auto">
              {title}
            </span>
            {badge ? (
              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                  badgeTone,
                )}
              >
                {badge}
              </span>
            ) : null}
          </div>
          {subtitle ? (
            <p className="mt-0.5 truncate text-start text-xs text-muted" dir="auto">
              {subtitle}
            </p>
          ) : null}
        </div>
      </Link>
    </li>
  );
}

export default function ChatsInboxSearchPanel({
  t,
  rtl = false,
  q,
  searchBusy,
  searchChatMatches,
  searchMessages,
  searchMedia,
  searchPeople,
  conversationMap,
  list,
  userId,
  compact = false,
}) {
  const query = q.trim();
  const hasChats = searchChatMatches.length > 0;
  const hasMessages = searchMessages.length > 0;
  const hasMedia = searchMedia.length > 0;
  const hasPeople = searchPeople.length > 0;
  const hasAny = hasChats || hasMessages || hasMedia || hasPeople;

  return (
    <div
      dir={rtl ? "rtl" : "ltr"}
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-hidden border-brand-200/45 dark:border-brand-800/35",
        compact
          ? "mx-0 border-t"
          : "rounded-2xl border bg-surface/90 shadow-sm dark:bg-black/20",
      )}
    >
      <div
        className={cn(
          "flex shrink-0 items-center justify-between gap-3 border-b border-brand-200/40 px-3 py-2.5 dark:border-brand-800/35",
          compact ? "bg-surface/90" : "bg-brand-50/40 dark:bg-brand-900/20",
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          {searchBusy ? (
            <Loader2
              className="h-4 w-4 shrink-0 animate-spin text-brand-700 dark:text-brand-300"
              aria-hidden
            />
          ) : null}
          <p className="truncate text-start text-sm font-semibold text-ink">
            {searchBusy
              ? t("chatSearchBusy")
              : t("chatInboxSearchResults", { query })}
          </p>
        </div>
        <Link
          href={`/search?q=${encodeURIComponent(query)}`}
          className="shrink-0 text-xs font-semibold text-brand-700 hover:underline dark:text-brand-200"
        >
          {t("unifiedSearchOpenFull")}
        </Link>
      </div>

      <ScrollArea.Root className="min-h-0 flex-1">
        <ScrollArea.Viewport
          className={cn(
            "h-full w-full",
            compact ? "max-h-[calc(100svh-10rem)]" : "max-h-[calc(100svh-14rem)]",
          )}
        >
          {searchBusy && !hasAny ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <Loader2
                className="h-8 w-8 animate-spin text-brand-600 dark:text-brand-400"
                aria-hidden
              />
              <p className="mt-3 text-sm text-muted">{t("chatSearchBusy")}</p>
            </div>
          ) : !searchBusy && !hasAny ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <SearchX
                className="h-10 w-10 text-muted/70"
                aria-hidden
              />
              <p className="mt-3 text-sm font-semibold text-ink">
                {t("chatInboxSearchNoResults")}
              </p>
              <p className="mt-1 text-xs text-muted">{query}</p>
            </div>
          ) : (
            <div className="pb-4">
              {hasChats ? (
                <SearchSection
                  title={t("unifiedSearchChats")}
                  icon={MessageSquare}
                  compact={compact}
                >
                  {searchChatMatches.map((conv) => {
                    const kind = conversationKindMeta(conv, t);
                    return (
                      <SearchResultRow
                        key={conv._id}
                        href={buildChatHref(conv._id, conv, { from: "chats" })}
                        title={conversationTitle(conv)}
                        subtitle={formatConversationPreview(
                          conversationLatestPreview(conv),
                          t,
                        )}
                        badge={kind.label}
                        badgeTone={kind.tone}
                      />
                    );
                  })}
                </SearchSection>
              ) : null}

              {hasMessages ? (
                <SearchSection
                  title={t("unifiedSearchMessages")}
                  icon={FileText}
                  compact={compact}
                >
                  {searchMessages.map((msg) => {
                    const conv = conversationMap[String(msg.conversationId)] || null;
                    const kind = conversationKindMeta(conv, t);
                    const senderLabel = senderLabelForResult(msg, t);
                    const topicLabel =
                      conv?.isGroup || conv?.isChannel
                        ? String(msg.topicName || msg.topicId || "").trim()
                        : "";
                    const subtitle = [
                      senderLabel,
                      topicLabel ? `#${topicLabel}` : "",
                      msg.text || t("fileAttachment"),
                    ]
                      .filter(Boolean)
                      .join(" · ");
                    return (
                      <SearchResultRow
                        key={msg._id}
                        href={buildMessageResultHref(msg)}
                        title={conv ? conversationTitle(conv) : t("navChats")}
                        subtitle={subtitle}
                        badge={kind.label}
                        badgeTone={kind.tone}
                      />
                    );
                  })}
                </SearchSection>
              ) : null}

              {hasMedia ? (
                <SearchSection
                  title={t("unifiedSearchMedia")}
                  icon={ImageIcon}
                  compact={compact}
                >
                  {searchMedia.map((msg) => {
                    const conv = conversationMap[String(msg.conversationId)] || null;
                    const kind = conversationKindMeta(conv, t);
                    const mediaLabel =
                      msg.fileName ||
                      (msg.messageType === "image"
                        ? t("replyBannerMedia")
                        : msg.messageType === "audio"
                          ? t("voiceMessage")
                          : msg.messageType === "file"
                            ? t("fileAttachment")
                            : msg.text || "—");
                    return (
                      <SearchResultRow
                        key={`media-${msg._id}`}
                        href={buildMessageResultHref(msg)}
                        title={conv ? conversationTitle(conv) : t("navChats")}
                        subtitle={mediaLabel}
                        badge={kind.label}
                        badgeTone={kind.tone}
                      />
                    );
                  })}
                </SearchSection>
              ) : null}

              {hasPeople ? (
                <SearchSection
                  title={t("unifiedSearchPeople")}
                  icon={Users}
                  compact={compact}
                >
                  {searchPeople.map((person) => (
                    <SearchResultRow
                      key={person._id}
                      href={resolvePersonSearchHref(person, list, userId)}
                      title={displayUserPrimaryLabel(person)}
                      subtitle={
                        person.username
                          ? `@${person.username}`
                          : person.email || ""
                      }
                    />
                  ))}
                </SearchSection>
              ) : null}
            </div>
          )}
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar
          className="flex w-2 touch-none select-none bg-brand-100/50 p-0.5 dark:bg-brand-900/40"
          orientation="vertical"
        >
          <ScrollArea.Thumb className="relative flex-1 rounded-full bg-brand-400 dark:bg-brand-700" />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>
    </div>
  );
}
