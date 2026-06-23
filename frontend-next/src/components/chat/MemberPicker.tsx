"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, UserPlus2, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import { cn } from "@/lib/classNames";
import type { ConversationMember } from "@/types/api";

function normalizeUsers(list: ConversationMember[] | null | undefined) {
  return (Array.isArray(list) ? list : [])
    .filter((user) => user?._id)
    .map((user) => ({
      _id: String(user._id),
      name: String(user.name || "").trim(),
      username: String(user.username || "").trim(),
      email: String(user.email || "").trim(),
      profilePic: String(user.profilePic || "").trim(),
    }));
}

function matchesContactQuery(user: ReturnType<typeof normalizeUsers>[number], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    user.name.toLowerCase().includes(q) ||
    user.username.toLowerCase().includes(q) ||
    user.email.toLowerCase().includes(q)
  );
}

type MemberPickerProps = {
  title: string;
  placeholder?: string;
  selectedUsers: ConversationMember[];
  onChange: (_members: ConversationMember[]) => void;
  initialSuggestions?: ConversationMember[];
  excludeIds?: string[];
  disabled?: boolean;
  helperText?: string;
  emptyText?: string;
  loadingText?: string;
  addLabel?: string;
  contactsOnly?: boolean;
  instantAdd?: boolean;
  onInstantAdd?: (_user: ConversationMember) => void | Promise<void>;
};

export default function MemberPicker({
  title,
  placeholder,
  selectedUsers,
  onChange,
  initialSuggestions = [],
  excludeIds = [],
  disabled = false,
  helperText = "",
  emptyText,
  loadingText,
  addLabel,
  contactsOnly = false,
  instantAdd = false,
  onInstantAdd,
}: MemberPickerProps) {
  const { t, i18n } = useTranslation();
  const dir = i18n.dir();
  const resolvedEmpty = emptyText ?? t("memberPickerEmpty");
  const resolvedNoChats = t("memberPickerContactsNoChats");
  const resolvedLoading = loadingText ?? t("memberPickerSearching");
  const resolvedAdd = addLabel ?? t("groupAddMember");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [addingId, setAddingId] = useState("");
  const [results, setResults] = useState<ReturnType<typeof normalizeUsers>>([]);

  const selected = useMemo(() => normalizeUsers(selectedUsers), [selectedUsers]);
  const selectedIds = useMemo(
    () => new Set(selected.map((user) => String(user._id))),
    [selected],
  );
  const blockedIds = useMemo(
    () => new Set((excludeIds || []).map((id) => String(id))),
    [excludeIds],
  );

  const suggestions = useMemo(() => {
    const pool = contactsOnly
      ? normalizeUsers(initialSuggestions).filter((user) =>
          matchesContactQuery(user, query),
        )
      : query.trim().length >= 2
        ? results
        : normalizeUsers(initialSuggestions);

    return pool.filter((user) => {
      const id = String(user._id);
      return !selectedIds.has(id) && !blockedIds.has(id);
    });
  }, [blockedIds, contactsOnly, initialSuggestions, query, results, selectedIds]);

  useEffect(() => {
    if (contactsOnly) {
      setResults([]);
      setBusy(false);
      return undefined;
    }

    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setBusy(false);
      return undefined;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        setBusy(true);
        const { data } = await api.get("/user/search", { params: { q } });
        if (!cancelled) setResults(normalizeUsers(data));
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setBusy(false);
      }
    }, 220);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [contactsOnly, query]);

  const addUser = async (user: ReturnType<typeof normalizeUsers>[number]) => {
    if (instantAdd && onInstantAdd) {
      if (addingId || disabled) return;
      setAddingId(user._id);
      try {
        await onInstantAdd(user);
        setQuery("");
        setResults([]);
      } finally {
        setAddingId("");
      }
      return;
    }
    const next = [...selected];
    if (!next.some((entry) => String(entry._id) === String(user._id))) {
      next.push(user);
      onChange?.(next);
    }
    setQuery("");
    setResults([]);
  };

  const removeUser = (userId: string) => {
    onChange?.(selected.filter((user) => String(user._id) !== String(userId)));
  };

  const showEmpty =
    suggestions.length === 0 &&
    (contactsOnly ? query.trim().length > 0 : query.trim().length >= 2);

  return (
    <div dir={dir} className={cn("vs-settings-card space-y-3", "!p-4")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 text-start">
          <div className="text-sm font-semibold text-ink">{title}</div>
          {helperText ? <div className="mt-1 text-xs text-muted">{helperText}</div> : null}
        </div>
        <span className="vs-chip-current shrink-0 px-2 py-0.5 text-[10px]">
          {instantAdd ? "—" : selected.length}
        </span>
      </div>

      <div className="relative">
        <Search
          className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
          aria-hidden
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          dir="auto"
          className="vs-input !h-10 w-full py-2 ps-9 pe-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"
        />
      </div>

      {!instantAdd && selected.length ? (
        <div className="flex flex-wrap gap-2">
          {selected.map((user) => (
            <button
              key={user._id}
              type="button"
              onClick={() => removeUser(user._id)}
              disabled={disabled}
              className="inline-flex max-w-full items-center gap-2 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-900 outline-none transition hover:bg-brand-100 focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:cursor-not-allowed disabled:opacity-60 dark:bg-brand-900/40 dark:text-brand-100 dark:hover:bg-brand-900/60 dark:focus-visible:ring-offset-gray-950"
            >
              <span className="truncate max-w-[min(180px,70vw)]">
                {user.name || user.username || user.email}
              </span>
              <X className="h-3 w-3 shrink-0" />
            </button>
          ))}
        </div>
      ) : null}

      <div className="space-y-2">
        {busy ? (
          <div className="vs-brand-dashed-empty px-3 py-3 text-start text-xs">
            {resolvedLoading}
          </div>
        ) : suggestions.length ? (
          suggestions.slice(0, contactsOnly ? 12 : 8).map((user) => (
            <button
              key={user._id}
              type="button"
              onClick={() => void addUser(user)}
              disabled={disabled || Boolean(addingId)}
              className="flex w-full items-center gap-3 rounded-2xl border border-brand-200/45 bg-surface/85 px-3 py-3 text-start outline-none transition hover:bg-subtle focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-inset disabled:cursor-not-allowed disabled:opacity-60 dark:border-brand-800/35 dark:bg-brand-900/15"
            >
              {user.profilePic ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.profilePic}
                  alt=""
                  className="h-10 w-10 shrink-0 rounded-2xl object-cover ring-1 ring-brand-200/60 dark:ring-brand-800/50"
                />
              ) : (
                <div className="vs-icon-tile grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-sm font-bold">
                  {(user.name || user.email || "U").slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-ink">
                  {user.name || user.username || user.email}
                </div>
                <div className="truncate text-xs text-muted">
                  {user.username ? `@${user.username}` : user.email}
                </div>
              </div>
              <span className="vs-chip-current inline-flex shrink-0 items-center gap-1 px-2 py-1 text-[10px]">
                <UserPlus2 className="h-3 w-3 shrink-0" />
                {resolvedAdd}
              </span>
            </button>
          ))
        ) : showEmpty ? (
          <div className="vs-brand-dashed-empty px-3 py-3 text-start text-xs">
            {resolvedEmpty}
          </div>
        ) : contactsOnly && !query.trim() && !normalizeUsers(initialSuggestions).length ? (
          <div className="vs-brand-dashed-empty px-3 py-3 text-start text-xs">
            {resolvedNoChats}
          </div>
        ) : null}
      </div>
    </div>
  );
}
