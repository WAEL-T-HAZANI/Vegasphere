"use client";

import { useEffect, useState } from "react";
import PushNotificationBootstrap from "./PushNotificationBootstrap";
import ServiceWorkerSetup from "./ServiceWorkerSetup";

/** Registers SW + push after idle so they don't compete with route navigation. */
export default function DeferredBootstraps() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const run = () => setReady(true);
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(run, { timeout: 2500 });
      return () => window.cancelIdleCallback(id);
    }
    const timer = window.setTimeout(run, 1200);
    return () => window.clearTimeout(timer);
  }, []);

  if (!ready) return null;

  return (
    <>
      <ServiceWorkerSetup />
      <PushNotificationBootstrap />
    </>
  );
}
