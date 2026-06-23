"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useAppDispatch } from "@/store/hooks";
import { api } from "@/lib/api";
import { isSearchQueryLongEnough } from "@/lib/searchQuery";
import { openOrRequestDirectChat } from "@/lib/directChat";
import {
  buildChatHref,
  displayUserPrimaryLabel,
  dmPeerUserId,
} from "@/lib/chatList";

type ChatsNewDmModalProps = {
  open: boolean;
  onClose: () => void;
  list: Array<{ _id?: string; isGroup?: boolean; isChannel?: boolean; members?: unknown[] }>;
  userId?: string;
};

export default function ChatsNewDmModal({
  open,
  onClose,
  list,
  userId,
}: ChatsNewDmModalProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setErr("");
    }
  }, [open]);

  useEffect(() => {
    const q = query.trim();
    if (!open || !isSearchQueryLongEnough(q)) {
      setResults([]);
      return undefined;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get("/user/search", { params: { q } });
        if (!cancelled) setResults(Array.isArray(data) ? data.slice(0, 8) : []);
      } catch {
        if (!cancelled) setResults([]);
      }
    }, 240);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, query]);

  const openDm = useCallback(
    async (otherId: string) => {
      if (!userId || !otherId || busy) return;
      const existing = (list || []).find((conv) => {
        if (!conv || conv.isGroup || conv.isChannel) return false;
        return dmPeerUserId(conv, userId) === String(otherId);
      });
      if (existing?._id) {
        router.push(buildChatHref(existing._id, existing, { from: "chats" }));
        onClose();
        return;
      }
      setBusy(true);
      setErr("");
      try {
        const result = await openOrRequestDirectChat({
          myUserId: userId,
          otherUserId: otherId,
          conversations: list,
          dispatch,
          t,
        });
        if (result.ok === false) {
          setErr(result.error);
        } else if (result.kind === "opened") {
          router.push(
            buildChatHref(result.conversationId, undefined, { from: "chats" }),
          );
          onClose();
        }
      } finally {
        setBusy(false);
      }
    },
    [userId, busy, list, router, onClose, dispatch, t],
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center">
      <div className="vs-surface-card w-full max-w-md overflow-hidden">
        <div className="border-b border-brand-200/45 px-4 py-3 dark:border-white/10">
          <h2 className="text-sm font-semibold text-ink">{t("chatNewDm")}</h2>
          <p className="mt-1 text-xs text-muted">{t("chatNewDmHint")}</p>
        </div>
        <div className="space-y-3 px-4 py-3">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("globalSearchHint")}
            className="vs-input"
            autoFocus
          />
          {err ? <p className="text-xs text-red-600">{err}</p> : null}
          <ul className="max-h-64 space-y-1 overflow-y-auto">
            {results.map((person) => (
              <li key={String(person._id)}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void openDm(String(person._id))}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm hover:bg-subtle disabled:opacity-50"
                >
                  <span className="font-medium text-ink">
                    {displayUserPrimaryLabel(person)}
                  </span>
                  <span className="text-xs text-brand-700 dark:text-brand-200">
                    {t("startChat")}
                  </span>
                </button>
              </li>
            ))}
            {query.trim().length >= 2 && !results.length ? (
              <li className="px-3 py-4 text-center text-xs text-muted">
                {t("unifiedSearchEmpty")}
              </li>
            ) : null}
          </ul>
        </div>
        <div className="flex justify-end gap-2 border-t border-brand-200/45 px-4 py-3 dark:border-white/10">
          <button type="button" className="vs-btn-outline px-4 py-2 text-sm" onClick={onClose}>
            {t("cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
