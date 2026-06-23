"use client";

/**
 * Client layout for the (shell) route group: auth guard, sidebar (AppShell), socket, media viewer.
 */
import dynamic from "next/dynamic";
import { Suspense } from "react";
import DashboardAuthGuard from "@/components/layout/DashboardAuthGuard";
import DashboardShellLoading from "@/components/layout/DashboardShellLoading";
import ShellRouteTransition from "@/components/layout/ShellRouteTransition";
import { AiTourProvider } from "@/components/ai/AiTourProvider";

const AppShell = dynamic(() => import("@/components/layout/AppShell"), {
  loading: () => (
    <div className="flex min-h-dvh bg-canvas text-ink">
      <DashboardShellLoading className="min-h-dvh" />
    </div>
  ),
});

const SocketBridge = dynamic(() => import("@/components/socket/SocketBridge"), {
  ssr: false,
});

const MediaViewerHost = dynamic(
  () => import("@/components/media/MediaViewerHost"),
  { ssr: false },
);

const CallManagerProvider = dynamic(
  () => import("@/components/calls/CallManagerProvider"),
  { ssr: false },
);

export default function DashboardLayout({ children }) {
  return (
    <DashboardAuthGuard>
      <AiTourProvider>
        <AppShell>
          <SocketBridge />
          <Suspense fallback={null}>
            <CallManagerProvider />
          </Suspense>
          <ShellRouteTransition>{children}</ShellRouteTransition>
          <MediaViewerHost />
        </AppShell>
      </AiTourProvider>
    </DashboardAuthGuard>
  );
}
