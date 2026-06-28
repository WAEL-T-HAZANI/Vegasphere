// @ts-nocheck
"use client";

import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/classNames";
import ChatMessageBubble from "@/components/chat/message/ChatMessageBubble";

const VIRTUALIZE_MIN_ROWS = 48;
const ESTIMATE_ROW_PX = 96;
const STICK_TO_BOTTOM_PX = 140;

const ConversationMessageList = forwardRef(function ConversationMessageList(
  {
    visibleThreadRows,
    isEmpty = false,
    threadLoading = false,
    i18nLanguage,
    t,
    pinnedMessages,
    hasMoreOlder,
    onLoadOlder,
    messageRefs,
    messagesById,
    decryptedById,
    user,
    peerUserId,
    activeConv,
    groupRecipientCount,
    selectionMode,
    selectedIds,
    toggleSelect,
    handleReplyToMessage,
    handleForwardMessage,
    openMaybeViewOnceMedia,
    handleEditMessage,
    handleDeleteMessage,
    handleCancelSchedule,
    onReact,
    onPin,
    onStar,
    retryMessage,
    globalSearchQuery,
    focusedMessageId,
    activeSearchResult,
    handleJumpToReply,
    onVotePoll,
    onViewThread,
    onVisibleMessageIds,
  },
  ref,
) {
  const parentRef = useRef(null);
  const stickToBottomRef = useRef(true);
  const prevRowCountRef = useRef(0);
  const prevFirstRowIdRef = useRef("");
  const scrollSnapshotRef = useRef({ height: 0, top: 0 });
  const didInitialScrollRef = useRef(false);
  const useVirtual = visibleThreadRows.length >= VIRTUALIZE_MIN_ROWS;

  const scrollToBottom = (behavior = "auto") => {
    const el = parentRef.current;
    if (!el) return;
    if (useVirtual && visibleThreadRows.length > 0) {
      virtualizer.scrollToIndex(visibleThreadRows.length - 1, {
        align: "end",
        behavior,
      });
      return;
    }
    if (behavior === "smooth") {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    } else {
      el.scrollTop = el.scrollHeight;
    }
  };

  const reportVisibleIds = (instance) => {
    if (!onVisibleMessageIds || !instance) return;
    const ids = instance
      .getVirtualItems()
      .map((virtualRow) => visibleThreadRows[virtualRow.index])
      .filter((row) => row?.message?._id)
      .map((row) => String(row.message._id));
    onVisibleMessageIds(ids);
  };

  const virtualizer = useVirtualizer({
    count: visibleThreadRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ESTIMATE_ROW_PX,
    overscan: 8,
    enabled: useVirtual,
    onChange: reportVisibleIds,
  });

  useImperativeHandle(
    ref,
    () => ({
      scrollToBottom,
      scrollToMessageId(messageId) {
        const id = String(messageId || "");
        if (!id) return false;
        const idx = visibleThreadRows.findIndex(
          (row) =>
            row?.message?._id && String(row.message._id) === id,
        );
        if (idx < 0) return false;
        if (useVirtual) {
          virtualizer.scrollToIndex(idx, { align: "center", behavior: "smooth" });
        } else {
          messageRefs.current[id]?.scrollIntoView?.({
            behavior: "smooth",
            block: "center",
          });
        }
        return true;
      },
    }),
    [visibleThreadRows, useVirtual, virtualizer, messageRefs, scrollToBottom],
  );

  useLayoutEffect(() => {
    const el = parentRef.current;
    if (!el || !visibleThreadRows.length) return;

    const firstRowId = String(visibleThreadRows[0]?.id || "");
    const prepended =
      prevFirstRowIdRef.current &&
      firstRowId &&
      firstRowId !== prevFirstRowIdRef.current &&
      visibleThreadRows.length >= prevRowCountRef.current;

    if (prepended) {
      const delta = el.scrollHeight - scrollSnapshotRef.current.height;
      el.scrollTop = scrollSnapshotRef.current.top + Math.max(0, delta);
    } else if (!didInitialScrollRef.current) {
      scrollToBottom("auto");
      didInitialScrollRef.current = true;
      stickToBottomRef.current = true;
    } else if (
      visibleThreadRows.length > prevRowCountRef.current &&
      stickToBottomRef.current
    ) {
      scrollToBottom("auto");
    }

    prevRowCountRef.current = visibleThreadRows.length;
    prevFirstRowIdRef.current = firstRowId;
  }, [visibleThreadRows, useVirtual, virtualizer]);

  useEffect(() => {
    if (!useVirtual || !onVisibleMessageIds) return;
    reportVisibleIds(virtualizer);
  }, [useVirtual, virtualizer, visibleThreadRows, onVisibleMessageIds]);

  const renderRow = (row) => {
    if (row.type === "date") {
      const dt = new Date(`${row.dayKey}T12:00:00`);
      const label = Number.isNaN(dt.getTime())
        ? row.dayKey
        : new Intl.DateTimeFormat(i18nLanguage || "en", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }).format(dt);
      return (
        <li key={row.id} className="flex justify-center py-1 pb-2.5">
          <span className="rounded-full border border-brand-200/45 bg-surface/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/[0.04]">
            {label}
          </span>
        </li>
      );
    }

    const m = row.message;
    const isMine = String(m.senderId?._id || m.senderId) === String(user?._id);
    const parentId = m.replyTo?._id || m.replyTo;
    const replyParent = parentId ? messagesById[String(parentId)] : null;
    const senderLabel =
      m.senderId?.name || m.senderName || m.senderId?.email || "";

    return (
      <div
        key={m._id}
        className="pb-2.5"
        ref={(node) => {
          messageRefs.current[String(m._id)] = node;
        }}
      >
        <ChatMessageBubble
          message={m}
          replyParent={replyParent}
          displayText={
            Number(m.e2eVersion) > 0
              ? decryptedById[String(m._id)]
              : undefined
          }
          replyDisplayText={
            replyParent && Number(replyParent.e2eVersion) > 0
              ? decryptedById[String(replyParent._id)]
              : undefined
          }
          isMine={isMine}
          currentUserId={user?._id}
          peerUserId={peerUserId}
          isGroupChat={Boolean(activeConv?.isGroup || activeConv?.isChannel)}
          groupRecipientCount={groupRecipientCount}
          readReceiptsEnabled={user?.readReceiptsEnabled !== false}
          selectionMode={selectionMode}
          selected={selectedIds.has(String(m._id))}
          onToggleSelect={toggleSelect}
          onReply={handleReplyToMessage}
          onForward={handleForwardMessage}
          onOpenMedia={openMaybeViewOnceMedia}
          onEdit={handleEditMessage}
          onDelete={handleDeleteMessage}
          onCancelSchedule={handleCancelSchedule}
          onReact={onReact}
          onPin={onPin}
          onStar={onStar}
          onRetry={retryMessage}
          searchQuery={globalSearchQuery}
          isSearchFocused={
            String(focusedMessageId || activeSearchResult?._id || "") ===
            String(m._id)
          }
          groupPosition={row.groupPosition}
          senderLabel={senderLabel}
          onJumpToReply={handleJumpToReply}
          onVote={onVotePoll}
          onViewThread={onViewThread}
        />
      </div>
    );
  };

  const listContent = useVirtual ? (
    <div
      style={{
        height: `${virtualizer.getTotalSize()}px`,
        width: "100%",
        position: "relative",
      }}
    >
      {virtualizer.getVirtualItems().map((virtualRow) => {
        const row = visibleThreadRows[virtualRow.index];
        return (
          <div
            key={row.id || row.message?._id || virtualRow.index}
            data-index={virtualRow.index}
            ref={virtualizer.measureElement}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            {renderRow(row)}
          </div>
        );
      })}
    </div>
  ) : (
    visibleThreadRows.map((row) => renderRow(row))
  );

  return (
    <ScrollArea.Root className="vs-chat-scroll-area flex min-h-0 flex-1">
      <ScrollArea.Viewport
        ref={parentRef}
        className="vs-chat-message-viewport relative min-h-0 flex-1 p-4 md:p-6"
        onScroll={(e) => {
          const el = e.currentTarget;
          const distanceFromBottom =
            el.scrollHeight - el.scrollTop - el.clientHeight;
          stickToBottomRef.current = distanceFromBottom <= STICK_TO_BOTTOM_PX;
          scrollSnapshotRef.current = {
            height: el.scrollHeight,
            top: el.scrollTop,
          };
          if (el.scrollTop < 72) onLoadOlder();
          if (!useVirtual && onVisibleMessageIds) {
            const pending = [];
            for (const row of visibleThreadRows) {
              if (!row?.message?._id) continue;
              const node = messageRefs.current[String(row.message._id)];
              if (!node) continue;
              const rect = node.getBoundingClientRect();
              const visibleHeight =
                Math.min(rect.bottom, window.innerHeight) -
                Math.max(rect.top, 0);
              const ratio = rect.height > 0 ? visibleHeight / rect.height : 0;
              if (ratio >= 0.6) pending.push(String(row.message._id));
            }
            onVisibleMessageIds(pending);
          }
        }}
      >
        {hasMoreOlder ? (
          <div className="mb-2 text-center text-[10px] text-muted">
            {t("loadOlderMessagesHint")}
          </div>
        ) : null}
        {threadLoading ? (
          <div className="flex min-h-[12rem] flex-col items-center justify-center py-10 text-center">
            <Loader2 className="h-8 w-8 animate-spin vega-brand-text" aria-hidden />
            <p className="mt-3 text-sm text-muted">{t("loading")}</p>
          </div>
        ) : isEmpty && !hasMoreOlder ? (
          <div className="flex min-h-[12rem] flex-col items-center justify-center py-10 text-center">
            <p className="text-sm font-semibold text-ink">{t("chatNoMessagesYet")}</p>
            <p className="mt-2 max-w-xs text-sm text-muted">{t("chatNoMessagesHint")}</p>
          </div>
        ) : (
          <ul className={cn(useVirtual && "relative block")}>
            {listContent}
          </ul>
        )}
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar
        className="vs-chat-scroll-track"
        orientation="vertical"
      >
        <ScrollArea.Thumb className="vs-chat-scroll-thumb" />
      </ScrollArea.Scrollbar>
    </ScrollArea.Root>
  );
});

export default ConversationMessageList;
