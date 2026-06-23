import { createSlice } from "@reduxjs/toolkit";
import { syncAuthSessionCookie } from "@/lib/routes";

const authInitialState = {
  user: null,
  token: null,
  status: "idle",
};

const authSlice = createSlice({
  name: "auth",
  initialState: authInitialState,
  reducers: {
    hydrateFromStorage(state) {
      if (typeof window === "undefined") return;

      const token = localStorage.getItem("token");
      state.token = token || null;
      syncAuthSessionCookie(Boolean(token));
    },

    setUser(state, action) {
      state.user = action.payload;
    },

    setToken(state, action) {
      state.token = action.payload;

      if (typeof window === "undefined") return;

      if (action.payload) {
        localStorage.setItem("token", action.payload);
        syncAuthSessionCookie(true);
      } else {
        localStorage.removeItem("token");
        syncAuthSessionCookie(false);
      }
    },

    logout(state) {
      state.user = null;
      state.token = null;
      state.status = "anonymous";

      if (typeof window === "undefined") return;

      localStorage.removeItem("token");
      localStorage.removeItem("user");
      syncAuthSessionCookie(false);
    },

    setAuthStatus(state, action) {
      state.status = action.payload;
    },
  },
});

export const {
  hydrateFromStorage,
  setUser,
  setToken,
  logout,
  setAuthStatus,
} = authSlice.actions;

export default authSlice.reducer;
