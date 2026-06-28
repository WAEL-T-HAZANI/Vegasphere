import { conversationClient } from "@/lib/clients";
import { api } from "@/lib/api";
import {
  setConversations,
  appendMessage,
  setTypingForUser,
  updateMessageInConversation,
  removeMessageFromConversation,
  applyMessageReaction,
  bumpLocalUnread,
  syncPinsForConversation,
  patchConversationInList,
} from "@/store/slices/chatSlice";
import { setUser } from "@/store/slices/authSlice";
import { showAppToast } from "@/lib/appToast";
import { playVegasphereNotifySound } from "@/lib/notificationSound";
import i18n from "@/i18n/client";
import { formatConversationPreview } from "@/lib/chatList";

function messagePreviewLine(msg) {
  const text = msg?.text && String(msg.text).trim();
  if (text) return text.slice(0, 120);
  const type = String(msg?.messageType || "text");
  const tokenByType = {
    image: "__image__",
    video: "__video__",
    file: "__file__",
    audio: "__audio__",
    location: "__location__",
    poll: "Poll",
  };
  const token = tokenByType[type];
  if (token) {
    if (token === "Poll") return i18n.t("chatPreviewPoll");
    return formatConversationPreview(token, (key) => i18n.t(key));
  }
  return i18n.t("newMessageToastTitle");
}

function buildMessageToastBody(msg) {
  const preview = messagePreviewLine(msg);
  const sid = msg.senderId;
  const name =
    sid && typeof sid === "object" && sid.name ? String(sid.name) : "";
  return name ? `${name}: ${preview}` : preview;
}

function notificationCategoryForMessage(msg) {
  if (msg?.conversationId?.isChannel) return "channel";
  if (msg?.conversationId?.isGroup) return "group";
  return "direct";
}

function shouldNotifyForMessage(msg, state) {
  const prefs = state.ui.notificationPrefs || {};
  const me = String(state.auth.user?._id || "");
  const mentionedMe =
    me &&
    Array.isArray(msg?.mentionedUserIds) &&
    msg.mentionedUserIds.some((id) => String(id) === me);
  const category = notificationCategoryForMessage(msg);
  if (category === "direct") return prefs.direct !== false;
  if (mentionedMe) return prefs.mentions !== false;
  return prefs.groups !== false;
}

export function attachSocketChatListeners(socket, { dispatch, getState, userId }) {
  let refetchTimer = null;

  const scheduleConvRefresh = () => {
    if (refetchTimer) clearTimeout(refetchTimer);
    refetchTimer = setTimeout(async () => {
      try {
        const { data } = await conversationClient.listConversations();
        dispatch(setConversations(data || []));
      } catch {}
    }, 500);
  };

  const onReceive = (msg) => {
    dispatch(appendMessage(msg));
    const state = getState();
    const me = String(state.auth.user?._id || "");
    const sender = String(msg.senderId?._id || msg.senderId || "");
    const cid = String(msg.conversationId || "");
    const active = state.chat.activeConversationId
      ? String(state.chat.activeConversationId)
      : "";
    const prefs = state.ui.notificationPrefs;
    const dnd = Boolean(prefs.doNotDisturb || state.auth.user?.doNotDisturb);
    const muted = new Set(
      (state.auth.user?.mutedConversationIds || []).map(String)
    );

    if (sender && sender !== me && msg._id) {
      api.post("/message/delivered", { messageId: msg._id }).catch(() => {});
    }

    if (sender && sender !== me && cid) {
      if (cid !== active && !muted.has(cid)) {
        dispatch(bumpLocalUnread(cid));
      }
      if (
        typeof document !== "undefined" &&
        document.hidden &&
        sender !== me &&
        !muted.has(cid) &&
        !dnd &&
        shouldNotifyForMessage(msg, state)
      ) {
        if (prefs.sound) playVegasphereNotifySound();
        if (
          prefs.browserPush &&
          typeof Notification !== "undefined" &&
          Notification.permission === "granted"
        ) {
          const body =
            (msg.text && String(msg.text).slice(0, 120)) ||
            (msg.messageType === "image"
              ? "Image"
              : msg.messageType === "audio"
                ? "Voice message"
                : "New message");
          try {
            new Notification("Vegasphere", { body, tag: cid });
          } catch {}
        }
      }
    }
    scheduleConvRefresh();
  };

  const onTyping = (data) => {
    if (!data?.conversationId || !data?.userId) return;
    if (String(data.userId) === String(userId)) return;
    if (getState().auth.user?.typingIndicatorsEnabled === false) return;
    dispatch(
      setTypingForUser({
        conversationId: data.conversationId,
        userId: data.userId,
        active: true,
        displayName: data.userName || data.displayName,
      })
    );
  };

  const onStopTyping = (data) => {
    if (!data?.conversationId || !data?.userId) return;
    if (String(data.userId) === String(userId)) return;
    if (getState().auth.user?.typingIndicatorsEnabled === false) return;
    dispatch(
      setTypingForUser({
        conversationId: data.conversationId,
        userId: data.userId,
        active: false,
      })
    );
  };

  const onEdited = (updated) => {
    if (!updated?._id || !updated.conversationId) return;
    dispatch(
      updateMessageInConversation({
        conversationId: updated.conversationId,
        message: updated,
      })
    );
  };

  const onMessageUpdated = (updated) => {
    if (updated?.viewOnceConsumed && updated?._id && updated?.conversationId) {
      dispatch(
        removeMessageFromConversation({
          conversationId: updated.conversationId,
          messageId: updated._id,
        })
      );
      scheduleConvRefresh();
      return;
    }
    onEdited(updated);
    scheduleConvRefresh();
  };

  const onMessageDelivered = (data) => {
    if (!data?.conversationId || !data?.userId) return;
    const state = getState();
    const list =
      state.chat.messagesByConversation[String(data.conversationId)] || [];
    const ids = Array.isArray(data.messageIds)
      ? data.messageIds.map(String)
      : data.messageId
        ? [String(data.messageId)]
        : [];
    if (!ids.length) return;
    const idSet = new Set(ids);
    for (const msg of list) {
      if (!idSet.has(String(msg._id))) continue;
      const deliveredTo = [...(msg.deliveredTo || [])];
      if (
        !deliveredTo.some((d) => String(d.user?._id || d.user) === String(data.userId))
      ) {
        deliveredTo.push({
          user: data.userId,
          deliveredAt: data.deliveredAt || new Date().toISOString(),
        });
      }
      dispatch(
        updateMessageInConversation({
          conversationId: data.conversationId,
          message: { ...msg, deliveredTo },
        })
      );
    }
  };

  const onMessageRead = (data) => {
    if (
      !data?.conversationId ||
      !Array.isArray(data.messageIds) ||
      !data.messageIds.length ||
      !data?.userId
    ) {
      return;
    }
    const state = getState();
    const cid = String(data.conversationId);
    const list = state.chat.messagesByConversation[cid] || [];
    const idSet = new Set(data.messageIds.map(String));
    for (const msg of list) {
      if (!idSet.has(String(msg._id))) continue;
      const seenBy = [...(msg.seenBy || [])];
      if (!seenBy.some((row) => String(row.user?._id || row.user) === String(data.userId))) {
        seenBy.push({ user: data.userId, seenAt: data.readAt || new Date().toISOString() });
      }
      const deliveredTo = [...(msg.deliveredTo || [])];
      if (!deliveredTo.some((row) => String(row.user?._id || row.user) === String(data.userId))) {
        deliveredTo.push({
          user: data.userId,
          deliveredAt: data.readAt || new Date().toISOString(),
        });
      }
      dispatch(
        updateMessageInConversation({
          conversationId: cid,
          message: { ...msg, seenBy, deliveredTo },
        })
      );
    }
    scheduleConvRefresh();
  };

  const onDeleted = (data) => {
    if (!data?.messageId || !data?.conversationId) return;
    dispatch(
      removeMessageFromConversation({
        conversationId: data.conversationId,
        messageId: data.messageId,
      })
    );
    scheduleConvRefresh();
  };

  const onReacted = (data) => {
    if (!data?.messageId || !data?.conversationId) return;
    dispatch(
      applyMessageReaction({
        conversationId: data.conversationId,
        messageId: data.messageId,
        reaction: "",
        reactions: Array.isArray(data.reactions) ? data.reactions : [],
      })
    );
  };

  const onPinSync = (data) => {
    if (!data?.conversationId) return;
    dispatch(
      syncPinsForConversation({
        conversationId: data.conversationId,
        pinnedMessageId: data.pinnedMessageId ?? null,
        pinnedMessageIds: Array.isArray(data.pinnedMessageIds)
          ? data.pinnedMessageIds
          : undefined,
      })
    );
  };

  const onE2eSync = (data) => {
    if (!data?.conversationId) return;
    dispatch(
      patchConversationInList({
        _id: data.conversationId,
        e2eEnabled: Boolean(data.e2eEnabled),
        e2eWrappedKeys: Array.isArray(data.e2eWrappedKeys)
          ? data.e2eWrappedKeys
          : [],
        e2eIssuerId: data.e2eIssuerId,
        e2eIssuerPublicKey: data.e2eIssuerPublicKey || "",
      }),
    );
  };
  const onNewMessageNotification = (msg) => {
    if (!msg?.conversationId) return;
    const cid = String(msg.conversationId);
    const state = getState();
    const active = state.chat.activeConversationId
      ? String(state.chat.activeConversationId)
      : "";
    const me = String(state.auth.user?._id || "");
    const sender = String(msg.senderId?._id || msg.senderId || "");
    if (sender === me) return;
    const ignored = new Set(
      (state.auth.user?.ignoredUserIds || []).map(String)
    );
    if (sender && ignored.has(sender)) return;
    if (state.chat.messagesByConversation[cid]) {
      dispatch(appendMessage(msg));
    }
    scheduleConvRefresh();
    const prefs = state.ui.notificationPrefs;
    const dnd = Boolean(prefs.doNotDisturb || state.auth.user?.doNotDisturb);
    const muted = new Set(
      (state.auth.user?.mutedConversationIds || []).map(String)
    );
    const notViewing = cid !== active;
    const tabVisible =
      typeof document !== "undefined" && !document.hidden;
    const allowNotify = shouldNotifyForMessage(msg, state);
    if (notViewing && tabVisible && !muted.has(cid) && !dnd && allowNotify) {
      showAppToast({
        id: `nmn-${msg._id || "x"}-${cid}-${Date.now()}`,
        titleKey: "newMessageToastTitle",
        body: buildMessageToastBody(msg),
        conversationId: cid,
      });
    }
    if (notViewing && prefs.sound && !muted.has(cid) && !dnd && allowNotify) {
      playVegasphereNotifySound();
    }
    if (
      notViewing &&
      typeof document !== "undefined" &&
      document.hidden &&
      !dnd &&
      allowNotify &&
      prefs.browserPush &&
      typeof Notification !== "undefined" &&
      Notification.permission === "granted"
    ) {
      const body = messagePreviewLine(msg);
      try {
        new Notification(i18n.t("newMessageToastTitle"), { body, tag: cid });
      } catch {}
    }
  };

  socket.on("receive-message", onReceive);
  socket.on("typing", onTyping);
  socket.on("stop-typing", onStopTyping);
  socket.on("message-edited", onEdited);
  socket.on("message-updated", onMessageUpdated);
  socket.on("message-delivered", onMessageDelivered);
  socket.on("message-read", onMessageRead);
  socket.on("message-deleted", onDeleted);
  socket.on("message-reacted", onReacted);
  socket.on("message-pin-sync", onPinSync);
  socket.on("conversation-e2e-sync", onE2eSync);
  socket.on("new-message-notification", onNewMessageNotification);

  const onProfileUpdated = (payload) => {
    const updatedId = String(payload?.userId || "");
    const profilePic = String(payload?.profilePic || "");
    if (!updatedId) return;
    const state = getState();
    const me = String(state.auth.user?._id || "");
    if (me && me === updatedId && profilePic) {
      dispatch(setUser({ ...state.auth.user, profilePic }));
    }
    scheduleConvRefresh();
  };
  socket.on("profile-updated", onProfileUpdated);

  const onPresenceChanged = (payload) => {
    const userId = String(payload?.userId || "");
    if (!userId || typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent("vegasphere-presence-changed", {
        detail: {
          userId,
          online: payload?.eventName === "receiver-online",
        },
      }),
    );
  };
  socket.on("receiver-online", (payload) =>
    onPresenceChanged({ ...payload, eventName: "receiver-online" }),
  );
  socket.on("receiver-offline", (payload) =>
    onPresenceChanged({ ...payload, eventName: "receiver-offline" }),
  );

  return () => {
    socket.off("receive-message", onReceive);
    socket.off("typing", onTyping);
    socket.off("stop-typing", onStopTyping);
    socket.off("message-edited", onEdited);
    socket.off("message-updated", onMessageUpdated);
    socket.off("message-delivered", onMessageDelivered);
    socket.off("message-read", onMessageRead);
    socket.off("message-deleted", onDeleted);
    socket.off("message-reacted", onReacted);
    socket.off("message-pin-sync", onPinSync);
    socket.off("conversation-e2e-sync", onE2eSync);
    socket.off("new-message-notification", onNewMessageNotification);
    socket.off("profile-updated", onProfileUpdated);
    socket.off("receiver-online");
    socket.off("receiver-offline");
    if (refetchTimer) clearTimeout(refetchTimer);
  };
}
