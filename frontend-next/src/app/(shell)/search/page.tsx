"use client";

import { Suspense, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import { Search as SearchIcon } from "lucide-react";
import {
  authClient,
  userClient,
} from "@/lib/clients";
import { formatApiError } from "@/lib/apiError";
import { cn } from "@/lib/classNames";
import { openOrRequestDirectChat } from "@/lib/directChat";
import DashboardPageLayout from "@/components/layout/DashboardPageLayout";
import ProtectedPageGate from "@/components/layout/ProtectedPageGate";
import SearchQueryBar from "@/components/search/SearchQueryBar";
import SearchDiscoverView from "@/components/search/SearchDiscoverView";
import SearchResultsView from "@/components/search/SearchResultsView";
import { useGlobalSearch } from "@/hooks/useGlobalSearch";
import { usePresenceBatch } from "@/hooks/usePresenceBatch";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setUser } from "@/store/slices/authSlice";

function SearchHubInner() {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const me = useAppSelector((s) => s.auth.user);
  const conversations = useAppSelector((s) => s.chat.conversations);
  const authStatus = useAppSelector((s) => s.auth.status);

  const {
    q,
    setQ,
    clearQuery,
    isSearching,
    isTooShort,
    loading,
    error,
    focusUserId,
    result,
    users,
    removeUser,
  } = useGlobalSearch({ t });

  const [actionBusy, setActionBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [lastBlockedId, setLastBlockedId] = useState<string | null>(null);

  const presenceIds = useMemo(
    () => users.map((u) => String(u._id)).filter(Boolean),
    [users],
  );

  const { presenceById } = usePresenceBatch(presenceIds, {
    enabled: Boolean(me?._id) && isSearching,
  });

  const startChat = async (otherId: string) => {
    if (!me?._id) return;
    setMsg("");
    setLastBlockedId(null);
    setActionBusy(true);
    try {
      const result = await openOrRequestDirectChat({
        myUserId: me._id,
        otherUserId: otherId,
        conversations,
        dispatch,
        t,
      });
      if (result.ok === false) {
        setMsg(result.error);
      } else if (result.kind === "opened") {
        router.push(`/chats/${result.conversationId}`);
      }
    } finally {
      setActionBusy(false);
    }
  };

  const blockUser = async (id: string) => {
    setMsg("");
    setLastBlockedId(null);
    try {
      setActionBusy(true);
      await userClient.blockUser(id);
      removeUser(id);
      setLastBlockedId(id);
      setMsg(t("blockUserDone"));
    } catch (e) {
      setMsg(formatApiError(e, t) || t("inviteActionFailed"));
    } finally {
      setActionBusy(false);
    }
  };

  const unblockLast = async () => {
    if (!lastBlockedId) return;
    setMsg("");
    try {
      setActionBusy(true);
      await userClient.unblockUser(lastBlockedId);
      setLastBlockedId(null);
      setMsg(t("unblockUserDone"));
    } catch (e) {
      setMsg(formatApiError(e, t, "errorOccurred"));
    } finally {
      setActionBusy(false);
    }
  };

  const ignoreNotificationsFrom = async (id: string) => {
    setMsg("");
    try {
      setActionBusy(true);
      await userClient.ignoreUser(id);
      const { data } = await authClient.getMe();
      dispatch(setUser(data));
      setMsg(t("contactIgnoreDone"));
    } catch (e) {
      setMsg(formatApiError(e, t) || t("inviteActionFailed"));
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <ProtectedPageGate titleKey="navSearch" status={authStatus} user={me}>
      <DashboardPageLayout
        title={t("navSearch")}
        description={t("globalSearchHint")}
        maxWidth="5xl"
        headerExtra={
          <SearchQueryBar
            value={q}
            onChange={setQ}
            onClear={clearQuery}
            isTooShort={isTooShort}
          />
        }
      >
        {msg ? (
          <div role="status" className="vs-muted-panel mb-5 text-sm leading-relaxed">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <span>{msg}</span>
              {lastBlockedId ? (
                <button
                  type="button"
                  onClick={() => void unblockLast()}
                  disabled={actionBusy}
                  className="vs-brand-text-link text-sm font-semibold disabled:opacity-60"
                >
                  {t("blockUndo")}
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        {isSearching ? (
          <SearchResultsView
            query={q.trim()}
            loading={loading}
            error={error}
            result={result}
            focusUserId={focusUserId}
            actionBusy={actionBusy}
            presenceById={presenceById}
            onStartChat={startChat}
            onViewProfile={(id) => router.push(`/user/${id}`)}
            onBlock={blockUser}
            onIgnore={ignoreNotificationsFrom}
          />
        ) : (
          <SearchDiscoverView />
        )}
      </DashboardPageLayout>
    </ProtectedPageGate>
  );
}

function SearchFallback() {
  const { t, i18n } = useTranslation();
  const rtl = i18n.dir() === "rtl";
  const authStatus = useAppSelector((s) => s.auth.status);
  const me = useAppSelector((s) => s.auth.user);
  return (
    <ProtectedPageGate titleKey="navSearch" status={authStatus} user={me}>
      <DashboardPageLayout
        title={t("navSearch")}
        description={t("globalSearchHint")}
        maxWidth="5xl"
        headerExtra={
          <div className="relative" dir={rtl ? "rtl" : "ltr"}>
            <SearchIcon
              className="pointer-events-none absolute start-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted"
              aria-hidden
            />
            <input
              readOnly
              disabled
              aria-hidden
              dir={rtl ? "rtl" : "ltr"}
              placeholder={t("globalSearchPlaceholder")}
              className={cn(
                "vs-input w-full cursor-wait py-3 ps-11 pe-4 text-start opacity-70",
              )}
            />
          </div>
        }
      >
        <p className="text-sm text-muted">{t("loading")}</p>
      </DashboardPageLayout>
    </ProtectedPageGate>
  );
}

export default function GlobalSearchPage() {
  return (
    <Suspense fallback={<SearchFallback />}>
      <SearchHubInner />
    </Suspense>
  );
}
