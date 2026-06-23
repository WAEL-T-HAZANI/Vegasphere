"use client";

import dynamic from "next/dynamic";
import { createContext, useCallback, useContext, useMemo, useState } from "react";

const AiDashboardTour = dynamic(() => import("@/components/ai/AiDashboardTour"), {
  ssr: false,
});

type AiTourContextValue = {
  open: boolean;
  aiTab: string | null;
  startTour: () => void;
  closeTour: () => void;
};

const AiTourContext = createContext<AiTourContextValue | null>(null);

export function AiTourProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [aiTab, setAiTab] = useState<string | null>(null);

  const startTour = useCallback(() => setOpen(true), []);
  const closeTour = useCallback(() => {
    setOpen(false);
    setAiTab(null);
  }, []);

  const value = useMemo(
    () => ({ open, aiTab, startTour, closeTour }),
    [open, aiTab, startTour, closeTour],
  );

  return (
    <AiTourContext.Provider value={value}>
      {children}
      {open ? (
        <AiDashboardTour
          open={open}
          onClose={closeTour}
          onAiTabChange={setAiTab}
        />
      ) : null}
    </AiTourContext.Provider>
  );
}

export function useAiTour() {
  const ctx = useContext(AiTourContext);
  if (!ctx) {
    throw new Error("useAiTour must be used within AiTourProvider");
  }
  return ctx;
}
