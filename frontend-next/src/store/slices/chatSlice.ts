import { createSlice } from "@reduxjs/toolkit";

const chatInitialState = {
  conversations: [],
  activeConversationId: null,

  messagesByConversation: {},

  typingByConversationId: {},
  typingDisplayNames: {},

  socketReady: false,

  searchQuery: "",
  searchResults: [],

  localUnreadDelta: {},
};

function normalizeId(value) {
  return value ? String(value) : "";
}

function getConversationId(message) {
  return normalizeId(message?.conversationId);
}

function isSameMessage(message, { messageId, clientTempId }) {
  if (!message) return false;

  const id = normalizeId(messageId);
  const tempId = normalizeId(clientTempId);

  if (id && normalizeId(message._id) === id) return true;
  if (tempId && normalizeId(message.clientTempId) === tempId) return true;

  return false;
}

function updateMessageList(list, matcher, updater) {
  return list.map((message) => (matcher(message) ? updater(message) : message));
}

const chatSlice = createSlice({
  name: "chat",
  initialState: chatInitialState,
  reducers: {
    setConversations(state, action) {
      state.conversations = Array.isArray(action.payload) ? action.payload : [];
    },

    setActiveConversation(state, action) {
      state.activeConversationId = action.payload;
    },

    setMessagesForConversation(state, action) {
      const { conversationId, messages } = action.payload || {};
      if (!conversationId) return;

      state.messagesByConversation[normalizeId(conversationId)] = Array.isArray(
        messages,
      )
        ? messages
        : [];
    },

    prependOlderMessages(state, action) {
      const { conversationId, messages } = action.payload || {};
      if (!conversationId || !Array.isArray(messages)) return;

      const cid = normalizeId(conversationId);
      const currentMessages = state.messagesByConversation[cid] || [];
      const currentIds = new Set(
        currentMessages.map((message) => normalizeId(message._id)),
      );

      const olderMessages = messages.filter(
        (message) => message?._id && !currentIds.has(normalizeId(message._id)),
      );

      state.messagesByConversation[cid] = [
        ...olderMessages,
        ...currentMessages,
      ];
    },

    appendMessage(state, action) {
      const message = action.payload;
      const cid = getConversationId(message);
      if (!cid) return;

      const messages = state.messagesByConversation[cid] || [];
      const messageId = normalizeId(message?._id);
      const clientTempId = normalizeId(message?.clientTempId);

      const existingIndex = messages.findIndex((item) =>
        isSameMessage(item, { messageId, clientTempId }),
      );

      if (existingIndex >= 0) {
        state.messagesByConversation[cid] = messages.map((item, index) =>
          index === existingIndex
            ? {
                ...item,
                ...message,
                clientFailedReason: "",
                clientStatus:
                  clientTempId &&
                  normalizeId(item.clientTempId) === clientTempId
                    ? "sent"
                    : message.clientStatus,
              }
            : item,
        );
        return;
      }

      state.messagesByConversation[cid] = [...messages, message];
    },

    addOptimisticMessage(state, action) {
      const { conversationId, message } = action.payload || {};
      if (!conversationId || !message) return;

      const cid = normalizeId(conversationId);
      const messages = state.messagesByConversation[cid] || [];

      const existingIndex = messages.findIndex((item) =>
        isSameMessage(item, {
          messageId: message._id,
          clientTempId: message.clientTempId,
        }),
      );

      if (existingIndex >= 0) {
        state.messagesByConversation[cid] = messages.map((item, index) =>
          index === existingIndex ? { ...item, ...message } : item,
        );
        return;
      }

      state.messagesByConversation[cid] = [...messages, message];
    },

    markOptimisticMessageStatus(state, action) {
      const { conversationId, messageId, clientTempId, status, error } =
        action.payload || {};

      if (!conversationId || (!messageId && !clientTempId) || !status) return;

      const cid = normalizeId(conversationId);
      const messages = state.messagesByConversation[cid];
      if (!messages?.length) return;

      state.messagesByConversation[cid] = updateMessageList(
        messages,
        (message) => isSameMessage(message, { messageId, clientTempId }),
        (message) => ({
          ...message,
          clientStatus: status,
          clientFailedReason: status === "failed" ? String(error || "") : "",
        }),
      );
    },

    reconcileOptimisticMessage(state, action) {
      const { conversationId, clientTempId, message } = action.payload || {};
      if (!conversationId || !message) return;

      const cid = normalizeId(conversationId);
      const messages = state.messagesByConversation[cid] || [];

      const tempId = clientTempId || message.clientTempId;

      const existingIndex = messages.findIndex((item) =>
        isSameMessage(item, {
          messageId: message._id,
          clientTempId: tempId,
        }),
      );

      const reconciledMessage = {
        ...message,
        clientTempId: tempId || "",
        clientStatus: "sent",
        clientFailedReason: "",
      };

      if (existingIndex >= 0) {
        state.messagesByConversation[cid] = messages.map((item, index) =>
          index === existingIndex
            ? {
                ...item,
                ...reconciledMessage,
                clientTempId:
                  tempId || message.clientTempId || item.clientTempId,
              }
            : item,
        );
        return;
      }

      state.messagesByConversation[cid] = [...messages, reconciledMessage];
    },

    updateMessageInConversation(state, action) {
      const { conversationId, message } = action.payload || {};
      if (!conversationId || !message?._id) return;

      const cid = normalizeId(conversationId);
      const messages = state.messagesByConversation[cid];
      if (!messages) return;

      const messageId = normalizeId(message._id);

      state.messagesByConversation[cid] = updateMessageList(
        messages,
        (item) => normalizeId(item._id) === messageId,
        (item) => ({ ...item, ...message }),
      );
    },

    removeMessageFromConversation(state, action) {
      const { conversationId, messageId } = action.payload || {};
      if (!conversationId || !messageId) return;

      const cid = normalizeId(conversationId);
      const messages = state.messagesByConversation[cid];
      if (!messages) return;

      state.messagesByConversation[cid] = messages.filter(
        (message) => normalizeId(message._id) !== normalizeId(messageId),
      );
    },

    applyMessageReaction(state, action) {
      const { conversationId, messageId, reactions, reaction } =
        action.payload || {};

      if (!conversationId || !messageId) return;

      const cid = normalizeId(conversationId);
      const messages = state.messagesByConversation[cid];
      if (!messages) return;

      state.messagesByConversation[cid] = updateMessageList(
        messages,
        (message) => normalizeId(message._id) === normalizeId(messageId),
        (message) => ({
          ...message,
          reaction: reaction || "",
          reactions: Array.isArray(reactions)
            ? reactions
            : message.reactions || [],
        }),
      );
    },

    bumpLocalUnread(state, action) {
      const cid = normalizeId(action.payload);
      if (!cid) return;

      state.localUnreadDelta[cid] = (state.localUnreadDelta[cid] || 0) + 1;
    },

    clearLocalUnread(state, action) {
      delete state.localUnreadDelta[normalizeId(action.payload)];
    },

    patchConversationInList(state, action) {
      const conversation = action.payload;
      if (!conversation?._id) return;

      const conversationId = normalizeId(conversation._id);
      const index = state.conversations.findIndex(
        (item) => normalizeId(item._id) === conversationId,
      );

      if (index >= 0) {
        state.conversations[index] = {
          ...state.conversations[index],
          ...conversation,
        };
      }
    },

    setTypingForUser(state, action) {
      const { conversationId, userId, active, displayName } =
        action.payload || {};

      if (!conversationId || !userId) return;

      const cid = normalizeId(conversationId);
      const uid = normalizeId(userId);

      if (!state.typingByConversationId[cid]) {
        state.typingByConversationId[cid] = {};
      }

      if (!state.typingDisplayNames[cid]) {
        state.typingDisplayNames[cid] = {};
      }

      if (active) {
        state.typingByConversationId[cid][uid] = true;

        if (displayName) {
          state.typingDisplayNames[cid][uid] = displayName;
        }

        return;
      }

      delete state.typingByConversationId[cid][uid];
      delete state.typingDisplayNames[cid][uid];
    },

    clearTypingForConversation(state, action) {
      const cid = normalizeId(action.payload);

      delete state.typingByConversationId[cid];
      delete state.typingDisplayNames[cid];
    },

    setSocketReady(state, action) {
      state.socketReady = Boolean(action.payload);
    },

    setSearchQuery(state, action) {
      state.searchQuery = action.payload;
    },

    setSearchResults(state, action) {
      state.searchResults = Array.isArray(action.payload) ? action.payload : [];
    },

    syncPinsForConversation(state, action) {
      const { conversationId, pinnedMessageId } = action.payload || {};
      if (!conversationId) return;

      const cid = normalizeId(conversationId);
      const messages = state.messagesByConversation[cid];
      if (!messages?.length) return;

      const pinId = normalizeId(pinnedMessageId);

      state.messagesByConversation[cid] = messages.map((message) => ({
        ...message,
        isPinned: Boolean(pinId && normalizeId(message._id) === pinId),
      }));
    },
  },
});

export const {
  setConversations,
  setActiveConversation,
  setMessagesForConversation,
  prependOlderMessages,
  appendMessage,
  addOptimisticMessage,
  markOptimisticMessageStatus,
  reconcileOptimisticMessage,
  updateMessageInConversation,
  removeMessageFromConversation,
  applyMessageReaction,
  bumpLocalUnread,
  clearLocalUnread,
  patchConversationInList,
  setTypingForUser,
  clearTypingForConversation,
  setSocketReady,
  setSearchQuery,
  setSearchResults,
  syncPinsForConversation,
} = chatSlice.actions;

export default chatSlice.reducer;
