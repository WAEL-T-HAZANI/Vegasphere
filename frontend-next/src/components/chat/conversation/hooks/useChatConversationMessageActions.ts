"use client";

import { useCallback } from "react";
import type { Dispatch } from "@reduxjs/toolkit";
import { api } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { showAppToast } from "@/lib/appToast";
import { formatApiError } from "@/lib/apiError";
import { setConversations, updateMessageInConversation } from "@/store/slices/chatSlice";
import type { Conversation, Message, User } from "@/types";
import type { TFunction } from "i18next";

type UseChatConversationMessageActionsParams = {
  cid: string;
  conversationId: string;
  user: User | null | undefined;
  conversations: Conversation[];
  dispatch: Dispatch;
  t: TFunction;
  reloadThread: () => Promise<void>;
  setEditTarget: (_msg: Message | null) => void;
  setDeleteTarget: (_msg: Message | null) => void;
  setDeleteForEveryone: (_v: boolean) => void;
  messagesById?: Record<string, Message>;
  decryptedById?: Record<string, string>;
};

export function useChatConversationMessageActions({
  cid,
  conversationId,
  user,
  conversations,
  dispatch,
  t,
  reloadThread,
  setEditTarget,
  setDeleteTarget,
  setDeleteForEveryone,
  messagesById = {},
  decryptedById = {},
}: UseChatConversationMessageActionsParams) {
  const onReact = useCallback(
    async (m: Message, reaction: string) => {
      const socket = getSocket();
      if (socket?.connected) {
        socket.emit("react-message", {
          messageId: m._id,
          reaction,
          conversationId,
        });
        return;
      }
      try {
        const { data } = await api.post<Message>("/message/react", {
          messageId: m._id,
          reaction,
        });
        dispatch(
          updateMessageInConversation({
            conversationId: cid,
            message: data,
          }),
        );
      } catch (e) {
        showAppToast({
          id: `react-fail-${Date.now()}`,
          conversationId: cid,
          body: formatApiError(e, t, "errorOccurred"),
        });
      }
    },
    [conversationId, cid, dispatch, t],
  );

  const onPin = useCallback(
    async (m: Message) => {
      try {
        await api.post("/message/pin", {
          messageId: m._id,
          conversationId,
          pinned: !m.isPinned,
        });
        await reloadThread();
      } catch (e) {
        showAppToast({
          id: `pin-fail-${Date.now()}`,
          conversationId: cid,
          body: formatApiError(e, t, "errorOccurred"),
        });
      }
    },
    [conversationId, reloadThread, cid, t],
  );

  const onStar = useCallback(
    async (m: Message) => {
      try {
        const meId = String(user?._id || "");
        const wasSaved =
          meId &&
          Array.isArray(m?.starredBy) &&
          m.starredBy.some((id) => String((id as { _id?: string })?._id || id) === meId);
        const { data } = await api.post<Message>("/message/star", {
          messageId: m._id,
        });
        dispatch(
          updateMessageInConversation({
            conversationId: cid,
            message: data,
          }),
        );

        if (!wasSaved && meId) {
          try {
            const selfConv =
              conversations.find((c) => c?.isSelfChat) ||
              (await api.get<Conversation>("/conversation/self")).data;
            const selfId = String(selfConv?._id || "");
            if (selfId) {
              await api.post("/message/forward", {
                messageId: m._id,
                toConversationId: selfId,
              });
            }
          } catch {
            /* ignore */
          }
        }
      } catch (e) {
        showAppToast({
          id: `star-fail-${Date.now()}`,
          conversationId: cid,
          body: formatApiError(e, t, "errorOccurred"),
        });
      }
    },
    [user?._id, cid, conversations, dispatch, t],
  );

  const onVotePoll = useCallback(
    async (message: Message, optionId: string) => {
      if (!message?._id || !optionId) return;
      try {
        const { data } = await api.post<Message>("/message/poll-vote", {
          messageId: message._id,
          optionId,
        });
        dispatch(
          updateMessageInConversation({
            conversationId: cid,
            message: data,
          }),
        );
      } catch (e) {
        showAppToast({
          id: `poll-fail-${Date.now()}`,
          conversationId: cid,
          body: formatApiError(e, t, "errorOccurred"),
        });
      }
    },
    [cid, dispatch, t],
  );

  const saveEdit = useCallback(
    async (newText: string, editTarget: Message | null) => {
      if (!editTarget?._id || !user?._id) return;
      const socket = getSocket();
      if (socket?.connected) {
        socket.emit("edit-message", {
          messageId: editTarget._id,
          text: newText,
          senderId: user._id,
          conversationId,
        });
      } else {
        try {
          const { data } = await api.post<Message>("/message/edit", {
            messageId: editTarget._id,
            text: newText,
          });
          dispatch(
            updateMessageInConversation({
              conversationId: cid,
              message: data,
            }),
          );
        } catch {
          showAppToast({
            id: `edit-fail-${Date.now()}`,
            conversationId: cid,
            body: t("messageEditFailed"),
          });
        }
      }
      setEditTarget(null);
    },
    [cid, conversationId, dispatch, setEditTarget, t, user?._id],
  );

  const confirmDelete = useCallback(
    async (
      deleteTarget: Message | null,
      { forEveryone }: { forEveryone?: boolean } = {},
    ) => {
      if (!deleteTarget?._id || !user?._id) return;
      const socket = getSocket();
      const fe = Boolean(forEveryone);
      if (socket?.connected) {
        socket.emit("delete-message", {
          messageId: deleteTarget._id,
          conversationId,
          deleteFrom: [user._id],
          forEveryone: fe,
        });
      } else {
        try {
          await api.post("/message/delete", {
            messageid: deleteTarget._id,
            userids: fe ? [] : [user._id],
            forEveryone: fe,
          });
        } catch (e) {
          showAppToast({
            id: `delete-fail-${Date.now()}`,
            conversationId: cid,
            body: formatApiError(e, t, "errorOccurred"),
          });
        }
      }
      setDeleteTarget(null);
      setDeleteForEveryone(false);
    },
    [conversationId, setDeleteForEveryone, setDeleteTarget, user?._id, cid, t],
  );

  const doForward = useCallback(
    async (
      toConversationId: string,
      forwardIds: string[],
      onStatus: (msg: string) => void,
      onDone: () => void,
      statusTimerRef: { current: number | ReturnType<typeof setTimeout> | null },
    ) => {
      if (!forwardIds.length) return;
      onStatus("");
      try {
        for (const messageId of forwardIds) {
          const msg = messagesById[String(messageId)];
          const plain =
            msg && Number(msg.e2eVersion) > 0
              ? String(decryptedById[String(messageId)] || "").trim()
              : String(msg?.text || "").trim();
          await api.post("/message/forward", {
            messageId,
            toConversationId,
            ...(plain ? { plaintext: plain } : {}),
          });
        }
        onStatus(t("forwardSent"));
        try {
          if (statusTimerRef.current) window.clearTimeout(statusTimerRef.current);
        } catch {
          /* ignore */
        }
        statusTimerRef.current = window.setTimeout(() => onStatus(""), 1800);
        onDone();
        const { data } = await api.get<Conversation[]>("/conversation/");
        dispatch(setConversations(data || []));
      } catch {
        onStatus(t("forwardFailed"));
        try {
          if (statusTimerRef.current) window.clearTimeout(statusTimerRef.current);
        } catch {
          /* ignore */
        }
        statusTimerRef.current = window.setTimeout(() => onStatus(""), 2200);
      }
    },
    [dispatch, t, messagesById, decryptedById],
  );

  const onCancelSchedule = useCallback(
    async (m: Message) => {
      if (!m?._id) return;
      try {
        const { data } = await api.post<Message>("/message/cancel-scheduled", {
          messageId: m._id,
        });
        dispatch(
          updateMessageInConversation({
            conversationId: cid,
            message: data,
          }),
        );
      } catch (e) {
        showAppToast({
          id: `cancel-sched-fail-${Date.now()}`,
          conversationId: cid,
          body: formatApiError(e, t, "errorOccurred"),
        });
      }
    },
    [cid, dispatch, t],
  );

  return {
    onReact,
    onPin,
    onStar,
    onVotePoll,
    onCancelSchedule,
    saveEdit,
    confirmDelete,
    doForward,
  };
}
