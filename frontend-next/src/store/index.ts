import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import chatReducer from "./slices/chatSlice";
import uiReducer from "./slices/uiSlice";

export function makeStore(preloadedState?: unknown) {
  return configureStore({
    reducer: {
      auth: authReducer,
      chat: chatReducer,
      ui: uiReducer,
    },
    preloadedState,
    devTools: process.env.NODE_ENV !== "production",
  });
}

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
