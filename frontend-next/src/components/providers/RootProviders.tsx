"use client";

import StoreProvider from "@/store/StoreProvider";
import TranslationProvider from "./TranslationProvider";
import ThemeSynchronizer from "./ThemeSynchronizer";
import PreferencesLoader from "./PreferencesLoader";
import DeferredBootstraps from "./DeferredBootstraps";
import AppToaster from "./AppToaster";
import SessionBootstrap from "@/components/providers/SessionBootstrap";
import DocumentHeadSync from "@/components/providers/DocumentHeadSync";
import NotificationSoundUnlock from "@/components/providers/NotificationSoundUnlock";

export default function RootProviders({
  children,
  initialI18nLng = "en",
  initialTheme,
}) {
  return (
    <StoreProvider initialTheme={initialTheme}>
      <TranslationProvider initialI18nLng={initialI18nLng}>
        <SessionBootstrap />
        <PreferencesLoader />
        <NotificationSoundUnlock />
        <DeferredBootstraps />
        <ThemeSynchronizer />
        <DocumentHeadSync />
        <AppToaster />
        {children}
      </TranslationProvider>
    </StoreProvider>
  );
}
