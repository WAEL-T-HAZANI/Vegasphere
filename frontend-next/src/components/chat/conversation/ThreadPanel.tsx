"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { X, Send } from "lucide-react";
import { api } from "@/lib/api";
import { formatApiError } from "@/lib/apiError";
import type { Message } from "@/types";

type ThreadPanelProps = {
  rootId: string;
  conversationId: string;
  cid: string;
  onClose: () => void;
  onSent?: () => void | Promise<void>;
};

export default function ThreadPanel({
  rootId,
  conversationId,
  cid,
  onClose,
  onSent,
}: ThreadPanelProps) {
  const { t } = useTranslation();
  const [root, setRoot] = useState<Message | null>(null);
  const [replies, setReplies] = useState<Message[]>([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendErr, setSendErr] = useState("");

  const load = useCallback(async () => {
    if (!rootId) return;
    setLoading(true);
    setErr("");
    try {
      const { data } = await api.get<{
        root?: Message;
        messages?: Message[];
      }>(`/message/thread/${rootId}`);
      setRoot(data?.root || null);
      setReplies(Array.isArray(data?.messages) ? data.messages : []);
    } catch (e) {
      setRoot(null);
      setReplies([]);
      setErr(formatApiError(e, t, "errorOccurred"));
    } finally {
      setLoading(false);
    }
  }, [rootId, t]);

  useEffect(() => {
    load();
  }, [load]);

  const sendReply = async () => {
    const text = replyText.trim();
    if (!text || sending) return;
    setSending(true);
    setSendErr("");
    try {
      await api.post("/message/send", {
        conversationId,
        text,
        messageType: "text",
        threadRootId: rootId,
      });
      setReplyText("");
      await load();
      await onSent?.();
    } catch (e) {
      setSendErr(formatApiError(e, t, "messageSendFailed"));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center">
      <div className="vs-surface-card flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-brand-200/45 px-4 py-3 dark:border-white/10">
          <h2 className="text-sm font-semibold text-ink">{t("threadTitle")}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 transition hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-brand-900/25 dark:hover:text-brand-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {loading ? (
            <div className="h-16 animate-pulse rounded-xl bg-subtle/80" />
          ) : err ? (
            <p className="text-sm text-red-600">{err}</p>
          ) : (
            <>
              {root?.text ? (
                <p className="mb-4 rounded-xl border border-brand-200/35 bg-brand-50/35 px-3 py-2 text-sm text-ink dark:border-white/10 dark:bg-white/[0.025]">
                  {root.text}
                </p>
              ) : null}
              <ul className="space-y-2">
                {replies.map((m) => (
                  <li key={String(m._id)} className="text-sm text-ink">
                    <span className="font-semibold">
                      {(m.senderId as { name?: string })?.name || "—"}:{" "}
                    </span>
                    {m.text || "—"}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
        <div className="border-t border-brand-200/45 px-4 py-3 dark:border-white/10">
          {sendErr ? (
            <p className="mb-2 text-xs text-red-600 dark:text-red-300">{sendErr}</p>
          ) : null}
          <div className="flex items-end gap-2">
            <textarea
              rows={2}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder={t("addMessage")}
              className="vs-composer-input min-h-[2.5rem] flex-1 resize-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void sendReply();
                }
              }}
            />
            <button
              type="button"
              disabled={!replyText.trim() || sending}
              onClick={() => void sendReply()}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-40"
              aria-label={t("sendMessage")}
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
