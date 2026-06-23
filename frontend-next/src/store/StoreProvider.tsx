"use client";

import { useRef } from "react";
import { Provider } from "react-redux";
import { makeStore, type AppStore } from "./index";
import { uiInitialState } from "./slices/uiSlice";

function getInitialTheme(initialTheme) {
  if (initialTheme === "light" || initialTheme === "dark") {
    return initialTheme;
  }

  return undefined;
}

export default function StoreProvider({ children, initialTheme }) {
  const storeRef = useRef<AppStore | undefined>(undefined);

  if (!storeRef.current) {
    const resolvedTheme = getInitialTheme(initialTheme);

    storeRef.current = makeStore(
      resolvedTheme === "light" || resolvedTheme === "dark"
        ? { ui: { ...uiInitialState, theme: resolvedTheme } }
        : undefined,
    );
  }

  return <Provider store={storeRef.current}>{children}</Provider>;
}
