import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type AiReplyTone = "default" | "friendly" | "formal" | "short" | "funny";

export const uiInitialState = {
  theme: "dark",
  sidebarOpen: true,
  floatingNav: false,
  floatingNavOpen: false,
  aiReplyTone: "default",

  mediaViewer: null,

  notificationPrefs: {
    browserPush: false,
    sound: true,
    permissionAsked: false,
    doNotDisturb: false,
    direct: true,
    groups: true,
    mentions: true,
    callIncoming: true,
    callReminders: true,
  },
};

const uiSlice = createSlice({
  name: "ui",
  initialState: uiInitialState,
  reducers: {
    setTheme(state, action) {
      state.theme = action.payload;
    },

    setSidebarOpen(state, action) {
      state.sidebarOpen = Boolean(action.payload);
    },

    toggleSidebar(state) {
      state.sidebarOpen = !state.sidebarOpen;
    },

    setFloatingNav(state, action) {
      state.floatingNav = Boolean(action.payload);
      if (!state.floatingNav) state.floatingNavOpen = false;
    },

    setFloatingNavOpen(state, action) {
      state.floatingNavOpen = Boolean(action.payload);
    },

    setAiReplyTone(state, action: PayloadAction<AiReplyTone>) {
      const next = action.payload;
      if (
        next === "default" ||
        next === "friendly" ||
        next === "formal" ||
        next === "short" ||
        next === "funny"
      ) {
        state.aiReplyTone = next;
      }
    },

    openMediaViewer(state, action) {
      const payload = action.payload;

      if (Array.isArray(payload?.items) && payload.items.length > 0) {
        const index = Math.min(
          Math.max(0, payload.index ?? 0),
          payload.items.length - 1,
        );

        state.mediaViewer = {
          items: payload.items,
          index,
        };

        return;
      }

      if (payload?.url) {
        state.mediaViewer = {
          items: [
            {
              url: payload.url,
              type: payload.type || "image",
              title: payload.title,
            },
          ],
          index: 0,
        };
      }
    },

    mediaViewerNavigate(state, action) {
      const delta = action.payload;
      const mediaViewer = state.mediaViewer;

      if (!mediaViewer?.items?.length) return;

      const total = mediaViewer.items.length;
      mediaViewer.index =
        (((mediaViewer.index + delta) % total) + total) % total;
    },

    closeMediaViewer(state) {
      state.mediaViewer = null;
    },

    setNotificationPrefs(state, action) {
      state.notificationPrefs = {
        ...state.notificationPrefs,
        ...action.payload,
      };
    },

  },
});

export const {
  setTheme,
  setSidebarOpen,
  toggleSidebar,
  setFloatingNav,
  setFloatingNavOpen,
  setAiReplyTone,
  openMediaViewer,
  mediaViewerNavigate,
  closeMediaViewer,
  setNotificationPrefs,
} = uiSlice.actions;

export default uiSlice.reducer;
