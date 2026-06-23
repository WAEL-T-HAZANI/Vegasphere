"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useReducedMotion } from "framer-motion";
import { useAppSelector } from "@/store/hooks";

import MarketingPageShell from "@/components/marketing/MarketingPageShell";
import VegaLoadingScreen from "@/components/marketing/VegaLoadingScreen";
import FeaturesPanel from "@/components/marketing/landing/FeaturesPanel";
import HomePanel from "@/components/marketing/landing/HomePanel";
import LandingPanelsNav from "@/components/marketing/landing/LandingPanelsNav";
import PrivacyPanel from "@/components/marketing/landing/PrivacyPanel";
import StartPanel from "@/components/marketing/landing/StartPanel";
import { LANDING_PANELS } from "@/components/marketing/landing/constants";

export default function LandingExperience() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const rtl = i18n.dir() === "rtl";

  const user = useAppSelector((s) => s.auth.user);
  const status = useAppSelector((s) => s.auth.status);

  const deckRef = useRef<HTMLDivElement>(null);
  const activePanelRef = useRef(0);
  const [activePanel, setActivePanel] = useState(0);

  const isAuthed = status === "authenticated" && Boolean(user?._id);

  useEffect(() => {
    if (isAuthed) router.replace("/chats");
  }, [isAuthed, router]);

  const readPanelIndex = useCallback(
    (deck: HTMLDivElement) => {
      const w = deck.clientWidth || 1;
      const count = LANDING_PANELS.length;

      if (!rtl) {
        return Math.min(count - 1, Math.max(0, Math.round(deck.scrollLeft / w)));
      }

      // RTL horizontal scroll: browsers use 0 at the start edge (right) and
      // negative or inverted values when moving to later panels on the left.
      if (deck.scrollLeft <= 0) {
        return Math.min(count - 1, Math.max(0, Math.round(Math.abs(deck.scrollLeft) / w)));
      }

      const maxScroll = deck.scrollWidth - deck.clientWidth;
      return Math.min(
        count - 1,
        Math.max(0, Math.round((maxScroll - deck.scrollLeft) / w)),
      );
    },
    [rtl],
  );

  const syncActiveFromScroll = useCallback(() => {
    const deck = deckRef.current;
    if (!deck) return;
    const idx = readPanelIndex(deck);
    activePanelRef.current = idx;
    setActivePanel(idx);
  }, [readPanelIndex]);

  useEffect(() => {
    const deck = deckRef.current;
    if (!deck) return undefined;
    deck.addEventListener("scroll", syncActiveFromScroll, { passive: true });
    syncActiveFromScroll();
    return () => deck.removeEventListener("scroll", syncActiveFromScroll);
  }, [syncActiveFromScroll]);

  const scrollToPanelIndex = useCallback(
    (deck: HTMLDivElement, index: number, behavior: ScrollBehavior) => {
      const w = deck.clientWidth;
      if (w <= 0) return;

      let left = w * index;
      if (rtl) {
        if (deck.scrollLeft <= 0 || getComputedStyle(deck).direction === "rtl") {
          left = -w * index;
        } else {
          const maxScroll = deck.scrollWidth - deck.clientWidth;
          left = maxScroll - w * index;
        }
      }

      deck.scrollTo({ left, behavior });
    },
    [rtl],
  );

  const goToPanel = useCallback(
    (index: number) => {
      const deck = deckRef.current;
      if (!deck) return;

      activePanelRef.current = index;
      setActivePanel(index);
      scrollToPanelIndex(deck, index, reduceMotion ? "auto" : "smooth");
    },
    [reduceMotion, scrollToPanelIndex],
  );

  useEffect(() => {
    const deck = deckRef.current;
    if (!deck) return;
    scrollToPanelIndex(deck, activePanelRef.current, "auto");
  }, [rtl, scrollToPanelIndex]);

  if (isAuthed) {
    return <VegaLoadingScreen />;
  }

  return (
    <MarketingPageShell className="h-[100dvh] max-h-[100dvh] overflow-hidden">
      <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col">
        <LandingPanelsNav
          rtl={rtl}
          activePanel={activePanel}
          onSelect={goToPanel}
        />

        <div
          ref={deckRef}
          dir={rtl ? "rtl" : "ltr"}
          className="relative z-10 flex min-h-0 w-full min-w-0 flex-1 flex-row snap-x snap-mandatory overflow-x-auto overflow-y-hidden scroll-smooth overscroll-x-contain overscroll-y-none touch-pan-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ scrollSnapType: "x mandatory" }}
        >
          <HomePanel t={t} rtl={rtl} isActive={activePanel === 0} />
          <FeaturesPanel t={t} rtl={rtl} isActive={activePanel === 1} />
          <PrivacyPanel t={t} rtl={rtl} isActive={activePanel === 2} />
          <StartPanel t={t} rtl={rtl} isActive={activePanel === 3} />
        </div>
      </div>

      <p className="sr-only">{t("landingScrollHint")}</p>
    </MarketingPageShell>
  );
}
