// @ts-nocheck

"use client";

import { useCallback } from "react";
import { useAppDispatch } from "@/store/hooks";
import { api } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { encryptMessageUtf8 } from "@/lib/e2eClient";
import {
  draftKey,
  notifyDraftChange,
  parseMentionIds,
  enqueueMessageOutbox,
} from "@/lib/chatCompose";
import {
  addOptimisticMessage,
  markOptimisticMessageStatus,
  reconcileOptimisticMessage,
} from "@/store/slices/chatSlice";
import { createClientTempId } from "@/lib/chatConversation";
import { buildRetrySendPayload } from "@/lib/messageSendPayload";
import { formatApiError } from "@/lib/apiError";

const SEND_ACK_TIMEOUT_MS = 10000;

export function useChatOutgoing({
  conversationId,
  cid,
  user,
  t,
  activeConv,
  canPostInConv,
  dmE2eActive,
  e2eConvKey,
  text,
  setText,
  setEmojiComposerOpen,
  setReplyTo,
  replyTo,
  scheduledFor,
  setScheduledFor,
  setScheduleOpen,
  disappearAfterSec,
  viewOnceNext,
  setViewOnceNext,
  activeTopicId,
  pollQuestion,
  pollOptions,
  pollAllowsMultiple,
  pollClosesAt,
  setPollOpen,
  setPollQuestion,
  setPollOptions,
  setPollAllowsMultiple,
  setPollClosesAt,
  setForwardStatus,
  sendBlocked,
  onAfterSend,
}) {
  const dispatch = useAppDispatch();

  const buildOptimisticMessage = useCallback(
    (payload, clientTempId) => ({
      _id: clientTempId,
      clientTempId,
      clientStatus: "sending",
      clientFailedReason: "",
      conversationId: String(payload.conversationId || conversationId),
      senderId: {
        _id: user?._id,
        name: user?.name,
        email: user?.email,
        profilePic: user?.profilePic,
      },
      text: payload.text || "",
      messageType: payload.messageType || "text",
      imageUrl: payload.imageUrl || "",
      fileName: payload.fileName || "",
      fileType: payload.fileType || "",
      fileSize: payload.fileSize || 0,
      fileData: payload.fileData || "",
      audioData: payload.audioData || "",
      audioDuration: payload.audioDuration || 0,
      location: payload.location || null,
      reaction: "",
      reactions: [],
      isEdited: false,
      seenBy: [],
      deliveredTo: [],
      deletedForEveryone: false,
      replyTo: payload.replyTo || null,
      forwardedFrom: payload.forwardedFrom || null,
      e2eVersion: payload.e2eVersion || 0,
      e2eBox: payload.e2eBox || "",
      e2eNonce: payload.e2eNonce || "",
      mentionedUserIds: payload.mentionedUserIds || [],
      poll: payload.poll || null,
      disappearAfterSec: payload.disappearAfterSec || 0,
      expiresAt:
        payload.disappearAfterSec > 0
          ? new Date(
              Date.now() + payload.disappearAfterSec * 1000,
            ).toISOString()
          : null,
      viewOnce: Boolean(payload.viewOnce),
      scheduledFor: payload.scheduledFor || null,
      scheduledStatus: payload.scheduledFor ? "pending" : "sent",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    [conversationId, user?._id, user?.name, user?.email, user?.profilePic],
  );

  const deliverOutgoing = useCallback(
    async (payload, options = {}) => {
      const socket = getSocket();
      const base = {
        ...payload,
        conversationId: payload.conversationId || conversationId,
      };
      const clientTempId = options.clientTempId || createClientTempId();
      const threadId = String(base.conversationId);
      const isGc = activeConv?.isGroup || activeConv?.isChannel;
      if (isGc && !canPostInConv) {
        setForwardStatus(t("chatCannotPostHint"));
        return { ok: false, error: t("chatCannotPostHint") };
      }
      if (sendBlocked && !options.isRetry) {
        return { ok: false, error: t("chatCannotPostHint") };
      }
      if (options.isRetry) {
        dispatch(
          markOptimisticMessageStatus({
            conversationId: threadId,
            clientTempId,
            status: "sending",
          }),
        );
      } else {
        dispatch(
          addOptimisticMessage({
            conversationId: threadId,
            message: buildOptimisticMessage(base, clientTempId),
          }),
        );
      }
      const requestPayload = { ...base, clientTempId };
      try {
        if (socket?.connected) {
          const ack = await new Promise((resolve, reject) => {
            const timer = setTimeout(
              () => reject(new Error("Message send timed out")),
              SEND_ACK_TIMEOUT_MS,
            );
            socket.emit("send-message", requestPayload, (response) => {
              clearTimeout(timer);
              if (!response?.ok || !response?.message) {
                reject(new Error(response?.error || t("messageSendFailed")));
                return;
              }
              resolve(response);
            });
          });
          dispatch(
            reconcileOptimisticMessage({
              conversationId: threadId,
              clientTempId,
              message: ack.message,
            }),
          );
          return { ok: true, clientTempId, message: ack.message };
        }
        try {
          const { senderId: _sk, ...rest } = base;
          const { data } = await api.post("/message/send", {
            conversationId: base.conversationId,
            clientTempId,
            ...rest,
          });
          dispatch(
            reconcileOptimisticMessage({
              conversationId: threadId,
              clientTempId,
              message: data,
            }),
          );
          return { ok: true, clientTempId, message: data };
        } catch (err) {
          const apiMsg = err?.response?.data?.message;
          enqueueMessageOutbox(requestPayload);
          throw new Error(apiMsg || formatApiError(err, t, "messageSendFailed"));
        }
      } catch (error) {
        dispatch(
          markOptimisticMessageStatus({
            conversationId: threadId,
            clientTempId,
            status: "failed",
            error: formatApiError(error, t, "messageSendFailed"),
          }),
        );
        return { ok: false, clientTempId, error };
      } finally {
        socket?.emit("stop-typing", {
          conversationId,
          userId: user?._id,
          userName: user?.name,
        });
      }
    },
    [
      conversationId,
      user?._id,
      user?.name,
      t,
      dispatch,
      buildOptimisticMessage,
      activeConv?.isGroup,
      activeConv?.isChannel,
      canPostInConv,
      setForwardStatus,
    ],
  );

  const retryMessage = useCallback(
    async (msg) => {
      if (!msg?.clientTempId || !user?._id) return;
      const isGc = activeConv?.isGroup || activeConv?.isChannel;
      if ((isGc && !canPostInConv) || sendBlocked) {
        setForwardStatus(t("chatCannotPostHint"));
        return;
      }
      await deliverOutgoing(
        buildRetrySendPayload(msg, conversationId, user._id),
        { clientTempId: msg.clientTempId, isRetry: true },
      );
    },
    [
      conversationId,
      user?._id,
      deliverOutgoing,
      activeConv?.isGroup,
      activeConv?.isChannel,
      canPostInConv,
      sendBlocked,
      setForwardStatus,
      t,
    ],
  );

  const send = useCallback(async () => {
    const v = text.trim();
    if (!v || !user?._id || sendBlocked) return;
    const normalizedScheduledFor = scheduledFor
      ? new Date(scheduledFor).toISOString()
      : "";
    const payload = {
      conversationId,
      senderId: user._id,
      text: v,
      messageType: "text",
    };
    if (normalizedScheduledFor) payload.scheduledFor = normalizedScheduledFor;
    if (disappearAfterSec > 0) payload.disappearAfterSec = disappearAfterSec;
    if (viewOnceNext) payload.viewOnce = true;
    if (activeConv?.isGroup || activeConv?.isChannel)
      payload.topicId = activeTopicId || "general";
    if (dmE2eActive && e2eConvKey) {
      const enc = encryptMessageUtf8(v, e2eConvKey);
      payload.text = "🔒 Encrypted message";
      payload.e2eVersion = enc.version;
      payload.e2eBox = enc.box;
      payload.e2eNonce = enc.nonce;
    } else if (activeConv?.isGroup || activeConv?.isChannel) {
      const ids = parseMentionIds(v, activeConv?.members || [], user._id);
      if (ids.length) payload.mentionedUserIds = ids;
    }
    if (replyTo?._id) payload.replyTo = replyTo._id;

    setText("");
    onAfterSend?.();
    setEmojiComposerOpen(false);
    setReplyTo(null);
    setScheduledFor("");
    setScheduleOpen(false);
    if (viewOnceNext) setViewOnceNext?.(false);
    try {
      localStorage.removeItem(draftKey(cid));
      notifyDraftChange(cid);
    } catch {}

    void deliverOutgoing(payload);
  }, [
    text,
    user?._id,
    sendBlocked,
    conversationId,
    scheduledFor,
    disappearAfterSec,
    activeConv,
    activeTopicId,
    dmE2eActive,
    e2eConvKey,
    replyTo,
    deliverOutgoing,
    setText,
    setEmojiComposerOpen,
    setReplyTo,
    setScheduledFor,
    setScheduleOpen,
    viewOnceNext,
    cid,
    setViewOnceNext,
    onAfterSend,
  ]);

  const resetPollComposer = useCallback(() => {
    setPollOpen(false);
    setPollQuestion("");
    setPollOptions(["", ""]);
    setPollAllowsMultiple(false);
    setPollClosesAt("");
  }, [
    setPollOpen,
    setPollQuestion,
    setPollOptions,
    setPollAllowsMultiple,
    setPollClosesAt,
  ]);

  const sendPoll = useCallback(async () => {
    if (!user?._id || (!activeConv?.isGroup && !activeConv?.isChannel)) return;
    const question = pollQuestion.trim();
    const options = pollOptions.map((option) => option.trim()).filter(Boolean);
    if (!question || options.length < 2) return;

    await deliverOutgoing({
      conversationId,
      senderId: user._id,
      text: question,
      messageType: "poll",
      topicId: activeTopicId || "general",
      poll: {
        question,
        options: options.map((text, index) => ({
          id: `opt-${index + 1}`,
          text,
        })),
        allowsMultiple: pollAllowsMultiple,
        closesAt: pollClosesAt ? new Date(pollClosesAt).toISOString() : "",
      },
    });

    resetPollComposer();
  }, [
    user?._id,
    activeConv?.isGroup,
    activeConv?.isChannel,
    activeTopicId,
    pollQuestion,
    pollOptions,
    pollAllowsMultiple,
    pollClosesAt,
    deliverOutgoing,
    conversationId,
    resetPollComposer,
  ]);

  return {
    deliverOutgoing,
    retryMessage,
    send,
    sendPoll,
    resetPollComposer,
  };
}
