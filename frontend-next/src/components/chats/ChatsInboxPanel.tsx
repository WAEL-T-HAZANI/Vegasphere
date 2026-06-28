"use client";

import Link from "next/link";
import { useMemo, useState, useEffect, useCallback, useRef, Fragment } from "react";
import { useTranslation } from "react-i18next";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useAppSelector, useAppDispatch } from "@/store/hooks";

import { isSearchQueryLongEnough } from "@/lib/searchQuery";
import { api } from "@/lib/api";
import { formatApiError } from "@/lib/apiError";
import { showAppToast } from "@/lib/appToast";
import { setUser } from "@/store/slices/authSlice";
import { setConversations } from "@/store/slices/chatSlice";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import { cn } from "@/lib/classNames";
import DashboardPageLayout from "@/components/layout/DashboardPageLayout";
import BrandMark from "@/components/brand/BrandMark";
import { usePresenceBatch } from "@/hooks/usePresenceBatch";
import { DRAFT_CHANGE_EVENT, readStoredDraft } from "@/lib/chatCompose";
import {
  dmPeerUserId,
  passesInboxListFilters,
  conversationTitle,
  buildChatHref,
  conversationLatestPreview,
  formatConversationPreview,
} from "@/lib/chatList";
import ChatListVirtualSection from "@/components/chats/ChatListVirtualSection";
import ChatListRow from "@/components/chats/ChatListRow";
import ChatsInboxToolbar, { CHAT_LIST_FILTERS } from "@/components/chats/ChatsInboxToolbar";
import ChatsInboxSearchPanel from "@/components/chats/ChatsInboxSearchPanel";

const INBOX_SECTION_CLASS =
  "rounded-xl bg-brand-100/90 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-brand-800 dark:bg-brand-900/40 dark:text-[rgb(var(--vega-ink))] sm:px-4 sm:text-xs";

function InboxSectionLabel({ children, compact }) {
  return (
    <li
      className={cn(
        INBOX_SECTION_CLASS,
        "text-start",
        "!border-t-0",
        compact ? "mx-2 mt-2" : "mx-3 mt-3",
      )}
    >
      {children}
    </li>
  );
}

function InboxChatList({
  compact,
  chatListScrollRef,
  pinnedMain,
  draftMain,
  regularMain,
  filteredArchived,
  hiddenChats,
  archivedExpanded,
  setArchivedExpanded,
  hiddenExpanded,
  setHiddenExpanded,
  activeListFilter,
  hasVisibleChatRows,
  mainList,
  archivedList,
  listLoading,
  renderRow,
  t,
  restoreHidden,
  rtl = false,
}) {
  return (
    <ScrollArea.Root className="min-h-0 flex-1">
      <ScrollArea.Viewport
        ref={chatListScrollRef}
        className={cn(
          "h-full w-full",
          compact
            ? "max-h-[calc(100svh-8.5rem)]"
            : "max-h-[calc(100svh-12rem)] sm:max-h-[calc(100svh-11rem)]",
        )}
      >
        <ul dir={rtl ? "rtl" : "ltr"}>
          {pinnedMain?.length ? (
            <>
              <InboxSectionLabel compact={compact}>{t("chatsPinnedSection")}</InboxSectionLabel>
              {pinnedMain.map((c, idx) => (
                <Fragment key={String(c._id ?? idx)}>
                  {renderRow(c, { suppressTopBorder: idx === 0 })}
                </Fragment>
              ))}
            </>
          ) : null}
          {draftMain?.length ? (
            <>
              <InboxSectionLabel compact={compact}>{t("chatListDraftSection")}</InboxSectionLabel>
              {draftMain.map((c, idx) => (
                <Fragment key={String(c._id ?? idx)}>
                  {renderRow(c, { suppressTopBorder: idx === 0 })}
                </Fragment>
              ))}
            </>
          ) : null}
          {regularMain?.length ? (
            <ChatListVirtualSection
              conversations={regularMain}
              renderRow={(c, opts) =>
                renderRow(c, {
                  suppressTopBorder:
                    Boolean(opts?.suppressTopBorder) &&
                    Boolean(pinnedMain?.length || draftMain?.length),
                })
              }
              scrollElementRef={chatListScrollRef}
            />
          ) : listLoading ? (
            <li className={cn(compact ? "px-3 py-10" : "px-4 py-12 sm:px-6")}>
              <p className="text-center text-sm text-muted">{t("loading")}</p>
            </li>
          ) : !hasVisibleChatRows ? (
            <li className={cn(compact ? "px-3 py-8" : "px-4 py-10 sm:px-6")}>
              <div
                className={cn(
                  "vs-settings-card mx-auto text-center",
                  compact ? "max-w-none p-4" : "max-w-md p-6",
                )}
              >
                <BrandMark className="mx-auto h-10 w-10 rounded-2xl border border-brand-200/60 bg-brand-100 text-lg text-brand-800 shadow-none dark:border-brand-800/50 dark:bg-brand-900/30 dark:text-brand-200 sm:h-12 sm:w-12 sm:text-xl" />
                <p className="mt-3 text-sm font-semibold text-ink">
                  {mainList?.length || archivedList?.length
                    ? t("noChatsForFilter")
                    : t("noConversation")}
                </p>
                <p className="mt-2 text-xs text-muted sm:text-sm">{t("homeUnifiedIntro")}</p>
                <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
                  <Link href="/search" className="vs-btn-primary inline-flex px-4 py-2 text-sm">
                    {t("chatListFindPeople")}
                  </Link>
                  <Link href="/profile" className="vs-btn-outline inline-flex px-4 py-2 text-sm">
                    {t("navProfile")}
                  </Link>
                </div>
              </div>
            </li>
          ) : null}
          {activeListFilter === "all" && filteredArchived?.length ? (
            <>
              <li className={cn(compact ? "mx-2 mt-2" : "mx-3 mt-3", "!border-t-0")}>
                <button
                  type="button"
                  onClick={() => setArchivedExpanded((v) => !v)}
                  className={cn(
                    INBOX_SECTION_CLASS,
                    "flex w-full items-center justify-between gap-2 text-start transition hover:bg-brand-200/80 dark:hover:bg-brand-900/55",
                  )}
                >
                  <span>{t("chatsArchivedSection")} ({filteredArchived.length})</span>
                  <span className="text-[10px] font-bold opacity-70">
                    {archivedExpanded ? "▲" : "▼"}
                  </span>
                </button>
              </li>
              {archivedExpanded
                ? filteredArchived.map((c, idx) => (
                    <Fragment key={String(c._id ?? idx)}>
                      {renderRow(c, { suppressTopBorder: idx === 0 })}
                    </Fragment>
                  ))
                : null}
            </>
          ) : null}
          {activeListFilter === "all" && hiddenChats.length > 0 ? (
            <>
              <li className={cn(compact ? "mx-2 mt-2" : "mx-3 mt-3", "!border-t-0")}>
                <button
                  type="button"
                  onClick={() => setHiddenExpanded((v) => !v)}
                  className={cn(
                    INBOX_SECTION_CLASS,
                    "flex w-full items-center justify-between gap-2 text-start transition hover:bg-brand-200/80 dark:hover:bg-brand-900/55",
                  )}
                >
                  <span>{t("chatsHiddenSection")} ({hiddenChats.length})</span>
                  <span className="text-[10px] font-bold opacity-70">
                    {hiddenExpanded ? "▲" : "▼"}
                  </span>
                </button>
              </li>
              {hiddenExpanded
                ? hiddenChats.map((c, idx) => {
                const id = c._id;
                const title =
                  c.name || c.members?.[0]?.name || c.members?.[0]?.email || "Chat";
                return (
                  <li
                    key={String(id)}
                    className={cn(
                      "flex flex-wrap items-center justify-between gap-2 border-t border-brand-200/35 px-3 py-2.5 dark:border-brand-800/30 sm:px-4",
                      idx === 0 && "border-t-0",
                    )}
                  >
                    <div className="min-w-0 flex-1 text-start">
                      <div className="block truncate text-sm font-medium text-ink">
                        {title}
                      </div>
                      <div className="text-start text-[10px] text-muted">{t("chatsHiddenHint")}</div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => restoreHidden(id)}
                        className="rounded-full bg-brand-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-800 dark:bg-brand-700 dark:hover:bg-brand-800"
                      >
                        {t("chatRestoreToList")}
                      </button>
                      <Link
                        href={buildChatHref(id, c, { from: "chats" })}
                        className="rounded-full border border-brand-300/70 px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-50 dark:border-brand-700/50 dark:text-brand-200 dark:hover:bg-brand-900/25"
                      >
                        {t("openChat")}
                      </Link>
                    </div>
                  </li>
                );
              })
                : null}
            </>
          ) : null}
        </ul>
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar
        className="flex w-2 touch-none select-none bg-brand-100/50 p-0.5 dark:bg-brand-900/40"
        orientation="vertical"
      >
        <ScrollArea.Thumb className="relative flex-1 rounded-full bg-brand-400 dark:bg-brand-700" />
      </ScrollArea.Scrollbar>
    </ScrollArea.Root>
  );
}

export default function ChatsInboxPanel({ compact = false } = {}) {
  const chatListScrollRef = useRef(null);
  const { t, i18n } = useTranslation();
  const rtl = i18n.dir() === "rtl";
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const validFilters = useMemo(
    () => new Set(CHAT_LIST_FILTERS.map((item) => item.id)),
    [],
  );
  const list = useAppSelector((s) => s.chat.conversations);
  const user = useAppSelector((s) => s.auth.user);
  const localDelta = useAppSelector((s) => s.chat.localUnreadDelta);
  const [optimisticFilter, setOptimisticFilter] = useState(null);
  const filterFromUrl = useMemo(() => {
    const param = searchParams.get("filter");
    return param && validFilters.has(param) ? param : "all";
  }, [searchParams, validFilters]);
  const activeListFilter = optimisticFilter ?? filterFromUrl;
  const [q, setQ] = useState("");
  const [hiddenChats, setHiddenChats] = useState([]);
  const [draftsByConversation, setDraftsByConversation] = useState({});
  const [searchBusy, setSearchBusy] = useState(false);
  const [searchPeople, setSearchPeople] = useState([]);
  const [searchMessages, setSearchMessages] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [archivedExpanded, setArchivedExpanded] = useState(false);
  const [hiddenExpanded, setHiddenExpanded] = useState(false);

  const activeConversationId = useMemo(() => {
    const match = String(pathname || "").match(/\/chats\/([^/?#]+)/);
    return match?.[1] ? String(match[1]) : "";
  }, [pathname]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.title = `Vegasphere | ${t("navChats")}`;
  }, [t, activeListFilter]);

  useEffect(() => {
    if (optimisticFilter != null && optimisticFilter === filterFromUrl) {
      setOptimisticFilter(null);
    }
  }, [filterFromUrl, optimisticFilter]);

  const handleListFilterChange = useCallback(
    (next) => {
      setOptimisticFilter(next);
      const params = new URLSearchParams(searchParams.toString());
      if (!next || next === "all") params.delete("filter");
      else params.set("filter", next);
      const qs = params.toString();
      router.replace(qs ? `/chats?${qs}` : "/chats", { scroll: false });
    },
    [router, searchParams],
  );

  const searchMedia = useMemo(
    () =>
      (searchMessages || [])
        .filter(
          (msg) =>
            msg?.messageType === "image" ||
            msg?.messageType === "video" ||
            msg?.messageType === "file" ||
            msg?.messageType === "audio" ||
            Boolean(msg?.imageUrl) ||
            Boolean(msg?.fileData) ||
            Boolean(msg?.audioData),
        )
        .slice(0, 6),
    [searchMessages],
  );

  const loadHidden = useCallback(async () => {
    if (!user?._id) {
      setHiddenChats([]);
      return;
    }
    try {
      const { data } = await api.get("/conversation/hidden");
      setHiddenChats(Array.isArray(data) ? data : []);
    } catch {
      setHiddenChats([]);
    }
  }, [user?._id]);

  useEffect(() => {
    loadHidden();
  }, [loadHidden]);

  useEffect(() => {
    if (!user?._id) {
      setListLoading(false);
      return;
    }
    let cancelled = false;
    setListLoading(true);
    (async () => {
      try {
        const { data } = await api.get("/conversation/");
        if (!cancelled) dispatch(setConversations(data || []));
      } catch {
        // socket / later refresh may populate the list
      } finally {
        if (!cancelled) setListLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?._id, dispatch]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const refreshDrafts = () => {
      const next = {};
      for (const conv of list || []) {
        const draft = readStoredDraft(conv._id);
        const value = draft.text.trim();
        if (value) {
          next[String(conv._id)] = {
            text: value,
            updatedAt: draft.updatedAt || 0,
          };
        }
      }
      setDraftsByConversation(next);
    };
    refreshDrafts();
    window.addEventListener("storage", refreshDrafts);
    window.addEventListener("focus", refreshDrafts);
    window.addEventListener(DRAFT_CHANGE_EVENT, refreshDrafts);
    return () => {
      window.removeEventListener("storage", refreshDrafts);
      window.removeEventListener("focus", refreshDrafts);
      window.removeEventListener(DRAFT_CHANGE_EVENT, refreshDrafts);
    };
  }, [list]);

  useEffect(() => {
    const query = q.trim();
    if (!isSearchQueryLongEnough(query)) {
      setSearchPeople([]);
      setSearchMessages([]);
      setSearchBusy(false);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        setSearchBusy(true);
        const [{ data: people }, { data: messages }] = await Promise.all([
          api.get("/user/search", { params: { q: query } }),
          api.get("/message/search", { params: { q: query } }),
        ]);
        if (cancelled) return;
        setSearchPeople(Array.isArray(people) ? people.slice(0, 6) : []);
        setSearchMessages(Array.isArray(messages) ? messages.slice(0, 8) : []);
      } catch {
        if (cancelled) return;
        setSearchPeople([]);
        setSearchMessages([]);
      } finally {
        if (!cancelled) setSearchBusy(false);
      }
    }, 260);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [q]);

  const restoreHidden = async (conversationId) => {
    try {
      const { data: me } = await api.patch("/user/chat-inbox", {
        conversationId,
        action: "show",
      });
      dispatch(setUser(me));
      const { data: convs } = await api.get("/conversation/");
      dispatch(setConversations(convs || []));
      await loadHidden();
    } catch (e) {
      showAppToast({
        id: `inbox-restore-${Date.now()}`,
        body: formatApiError(e, t, "errorOccurred"),
      });
    }
  };

  const dmPeerIds = useMemo(() => {
    if (!user?._id || !list?.length) return [];
    const ids = [];
    for (const c of list) {
      const pid = dmPeerUserId(c, user._id);
      if (pid) ids.push(pid);
    }
    return ids;
  }, [list, user?._id]);

  const { presenceById } = usePresenceBatch(dmPeerIds, {
    enabled: Boolean(user?._id),
  });

  const { mainList, archivedList } = useMemo(() => {
    const main = [];
    const arch = [];
    for (const c of list || []) {
      if (c.isArchivedForMe) arch.push(c);
      else main.push(c);
    }
    return { mainList: main, archivedList: arch };
  }, [list]);

  const searchActive = isSearchQueryLongEnough(q);
  const inlineQuery = searchActive ? "" : q;

  const inboxFilterArgs = useMemo(
    () => ({
      filter: activeListFilter,
      userId: user?._id,
      localDelta,
      draftsByConversation,
      presenceById,
      query: inlineQuery,
    }),
    [activeListFilter, user?._id, localDelta, draftsByConversation, presenceById, inlineQuery],
  );

  const filteredMain = useMemo(
    () => mainList.filter((c) => passesInboxListFilters({ conv: c, ...inboxFilterArgs })),
    [mainList, inboxFilterArgs],
  );
  const filteredArchived = useMemo(
    () => archivedList.filter((c) => passesInboxListFilters({ conv: c, ...inboxFilterArgs })),
    [archivedList, inboxFilterArgs],
  );

  const pinnedMain = useMemo(
    () => filteredMain.filter((c) => c.isPinnedForMe && !draftsByConversation[String(c._id)]),
    [filteredMain, draftsByConversation],
  );
  const draftMain = useMemo(
    () =>
      filteredMain
        .filter((c) => Boolean(draftsByConversation[String(c._id)]))
        .sort(
          (a, b) =>
            Number(draftsByConversation[String(b._id)]?.updatedAt || 0) -
            Number(draftsByConversation[String(a._id)]?.updatedAt || 0),
        ),
    [filteredMain, draftsByConversation],
  );
  const regularMain = useMemo(
    () =>
      filteredMain.filter(
        (c) => !c.isPinnedForMe && !draftsByConversation[String(c._id)],
      ),
    [filteredMain, draftsByConversation],
  );
  const hasVisibleChatRows = Boolean(
    pinnedMain.length ||
      draftMain.length ||
      regularMain.length ||
      filteredArchived.length,
  );

  const togglePinned = useCallback(
    async (conversationId, pinned) => {
      try {
        const action = pinned ? "unpin" : "pin";
        const { data: me } = await api.patch("/user/chat-inbox", {
          conversationId,
          action,
        });
        dispatch(setUser(me));
        dispatch(
          setConversations(
            (list || []).map((c) =>
              String(c?._id) === String(conversationId)
                ? { ...c, isPinnedForMe: action === "pin" }
                : c,
            ),
          ),
        );
      } catch (e) {
        showAppToast({
          id: `inbox-pin-${Date.now()}`,
          body: formatApiError(e, t, "errorOccurred"),
        });
      }
    },
    [dispatch, list, t],
  );

  const applyInboxAction = useCallback(
    async (conversationId, action) => {
      try {
        const { data: me } = await api.patch("/user/chat-inbox", {
          conversationId,
          action,
        });
        dispatch(setUser(me));
        dispatch(
          setConversations(
            (list || []).flatMap((c) => {
              const id = String(c?._id);
              if (id !== String(conversationId)) return [c];
              const next = { ...c };
              if (action === "mute") next.isMutedForMe = true;
              if (action === "unmute") next.isMutedForMe = false;
        if (action === "archive") {
          next.isArchivedForMe = true;
          setArchivedExpanded(true);
        }
        if (action === "unarchive") next.isArchivedForMe = false;
        if (action === "pin") next.isPinnedForMe = true;
        if (action === "unpin") next.isPinnedForMe = false;
        if (action === "hide") {
          setHiddenExpanded(true);
          return [];
        }
              return [next];
            }),
          ),
        );
        if (action === "show" || action === "hide") {
          await loadHidden();
        }
      } catch (e) {
        showAppToast({
          id: `inbox-${action}-${Date.now()}`,
          body: formatApiError(e, t, "errorOccurred"),
        });
      }
    },
    [dispatch, list, loadHidden, t],
  );

  const conversationMap = useMemo(() => {
    const map = {};
    for (const conv of list || []) {
      map[String(conv._id)] = conv;
    }
    return map;
  }, [list]);

  const searchChatMatches = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (query.length < 2) return [];
    return [...mainList, ...archivedList]
      .filter(
        (conv, index, arr) =>
          arr.findIndex((row) => String(row._id) === String(conv._id)) === index,
      )
      .filter((conv) => {
        const title = conversationTitle(conv);
        const preview = conversationLatestPreview(conv);
        return (
          String(title).toLowerCase().includes(query) ||
          String(preview).toLowerCase().includes(query)
        );
      })
      .slice(0, 6);
  }, [q, mainList, archivedList]);

  const renderRow = useCallback(
    (c, { suppressTopBorder = false } = {}) => (
      <ChatListRow
        c={c}
        user={user}
        t={t}
        language={i18n.language}
        draftsByConversation={draftsByConversation}
        localDelta={localDelta}
        presenceById={presenceById}
        onTogglePinned={togglePinned}
        onInboxAction={applyInboxAction}
        suppressTopBorder={suppressTopBorder}
        compact={compact}
        isActive={activeConversationId === String(c._id)}
        chatHref={buildChatHref(c._id, c, { from: "chats", filter: activeListFilter })}
        rtl={rtl}
      />
    ),
    [
      user,
      t,
      i18n.language,
      draftsByConversation,
      localDelta,
      presenceById,
      togglePinned,
      applyInboxAction,
      activeListFilter,
      compact,
      activeConversationId,
      rtl,
    ],
  );

  const toolbar = (
    <ChatsInboxToolbar
      t={t}
      rtl={rtl}
      compact={compact}
      q={q}
      setQ={setQ}
      listFilter={activeListFilter}
      setListFilter={handleListFilterChange}
    />
  );

  const searchPanel = searchActive ? (
    <ChatsInboxSearchPanel
      t={t}
      rtl={rtl}
      q={q}
      searchBusy={searchBusy}
      searchChatMatches={searchChatMatches}
      searchMessages={searchMessages}
      searchMedia={searchMedia}
      searchPeople={searchPeople}
      conversationMap={conversationMap}
      list={list}
      userId={user?._id}
      compact={compact}
    />
  ) : null;

  const chatList = (
    <InboxChatList
      compact={compact}
      chatListScrollRef={chatListScrollRef}
      pinnedMain={pinnedMain}
      draftMain={draftMain}
      regularMain={regularMain}
      filteredArchived={filteredArchived}
      hiddenChats={hiddenChats}
      archivedExpanded={archivedExpanded}
      setArchivedExpanded={setArchivedExpanded}
      hiddenExpanded={hiddenExpanded}
      setHiddenExpanded={setHiddenExpanded}
      activeListFilter={activeListFilter}
      hasVisibleChatRows={hasVisibleChatRows}
      mainList={mainList}
      archivedList={archivedList}
      listLoading={listLoading}
      renderRow={renderRow}
      t={t}
      restoreHidden={restoreHidden}
      rtl={rtl}
    />
  );

  if (compact) {
    return (
      <div
        dir={i18n.dir()}
        className="flex min-h-0 flex-1 flex-col bg-canvas text-ink"
      >
        <header className="shrink-0 border-b border-brand-200/45 bg-surface/90 px-3 py-3 backdrop-blur-xl dark:border-brand-800/30 dark:bg-black/80">
          <h1 className="truncate text-start text-lg font-semibold tracking-tight text-ink">
            {t("navChats")}
          </h1>
        </header>
        {toolbar}
        {searchActive ? searchPanel : chatList}
      </div>
    );
  }

  return (
    <DashboardPageLayout
      variant="simple"
      title={t("navChats")}
      description={searchActive ? null : t("chatListPageSubtitle")}
      maxWidth="6xl"
      pageClassName="vs-chats-page flex min-h-0 flex-1 flex-col"
    >
      <div dir={i18n.dir()} className="-mt-2 flex min-h-0 min-w-0 flex-1 flex-col gap-3 pb-2 sm:-mt-4">
        {toolbar}
        {searchActive ? searchPanel : chatList}
      </div>
    </DashboardPageLayout>
  );
}
