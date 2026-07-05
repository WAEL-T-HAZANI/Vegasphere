"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import * as Dialog from "@radix-ui/react-dialog";
import { Loader2, PhoneOff } from "lucide-react";
import { cn } from "@/lib/classNames";
import { kickCallRingtoneOnGesture } from "@/lib/callRingtone";
import IncomingCallActions from "@/components/calls/IncomingCallActions";
import {
  JITSI_DOMAIN,
  buildJitsiEmbedOptions,
  loadJitsiExternalApi,
  prefetchJitsiExternalApi,
  wireJitsiCallApi,
} from "@/lib/jitsiConfig";

function formatCallDuration(totalSec) {
  const s = Math.max(0, Math.floor(totalSec || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

function callNoticeMessage(notice, t) {
  switch (notice) {
    case "busy":
      return t("callBusyRemote");
    case "declined":
      return t("callDeclinedRemote");
    case "missed":
      return t("callMissedRemote");
    case "no-answer":
      return t("callNoAnswer");
    case "failed":
      return t("callMediaFailed");
    default:
      return "";
  }
}

export default function JitsiCallScreen({
  open,
  callState,
  peerDisplayName,
  isVideoCall,
  isGroupCall = false,
  roomName,
  callElapsedSec = 0,
  callNotice = "",
  jitsiActive = false,
  acceptingIncoming = false,
  userDisplayName = "",
  userEmail = "",
  onAcceptIncoming,
  onRejectIncoming,
  onHangup,
  onJitsiReadyToClose,
}) {
  const { t } = useTranslation();
  const containerRef = useRef(null);
  const apiRef = useRef(null);
  const closedRef = useRef(false);
  const [jitsiLoading, setJitsiLoading] = useState(false);
  const [jitsiError, setJitsiError] = useState("");

  const isIncoming = callState === "ringing_in";
  const isOutgoing = callState === "ringing_out";
  const isActive = callState === "active";
  const showJitsi = jitsiActive && Boolean(roomName);

  useEffect(() => {
    if (!open) return;
    prefetchJitsiExternalApi();
  }, [open]);

  useEffect(() => {
    closedRef.current = false;
    setJitsiError("");
  }, [roomName, jitsiActive]);

  useEffect(() => {
    if (!showJitsi || !containerRef.current || !roomName) {
      setJitsiLoading(false);
      return undefined;
    }

    let disposed = false;
    setJitsiLoading(true);
    setJitsiError("");

    const notifyClose = () => {
      if (closedRef.current) return;
      closedRef.current = true;
      onJitsiReadyToClose?.();
    };

    void (async () => {
      try {
        const JitsiMeetExternalAPI = await loadJitsiExternalApi();
        if (disposed || !containerRef.current) return;

        try {
          apiRef.current?.dispose?.();
        } catch {}
        apiRef.current = null;
        containerRef.current.innerHTML = "";

        const api = new JitsiMeetExternalAPI(
          JITSI_DOMAIN,
          buildJitsiEmbedOptions({
            roomName,
            displayName: userDisplayName,
            email: userEmail,
            audioOnly: !isVideoCall,
            container: containerRef.current,
          }),
        );

        apiRef.current = api;
        wireJitsiCallApi(api, {
          displayName: userDisplayName,
          audioOnly: !isVideoCall,
        });
        api.addListener("readyToClose", notifyClose);
        api.addListener("videoConferenceLeft", notifyClose);
        api.addListener("videoConferenceJoined", () => {
          wireJitsiCallApi(api, {
            displayName: userDisplayName,
            audioOnly: !isVideoCall,
          });
          if (!disposed) setJitsiLoading(false);
        });
        api.addListener("participantJoined", () => {
          if (!disposed) setJitsiLoading(false);
        });
        if (!disposed) setJitsiLoading(false);
      } catch (e) {
        console.warn("Jitsi embed failed:", e);
        if (!disposed) {
          setJitsiLoading(false);
          setJitsiError(t("callMediaFailed"));
        }
      }
    })();

    return () => {
      disposed = true;
      try {
        apiRef.current?.dispose?.();
      } catch {}
      apiRef.current = null;
      const node = containerRef.current;
      if (node) node.innerHTML = "";
    };
  }, [
    showJitsi,
    roomName,
    isVideoCall,
    userDisplayName,
    userEmail,
    onJitsiReadyToClose,
    t,
  ]);

  const statusLabel = isIncoming
    ? t("callStatusRingingIn")
    : isOutgoing
      ? t("callStatusRingingOut")
      : t("callStatusActive");

  const showRingUi = (isIncoming || isOutgoing) && !showJitsi;

  return (
    <Dialog.Root open={open}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[96] bg-black/88 backdrop-blur-md" />
        <Dialog.Content
          aria-describedby={undefined}
          onEscapeKeyDown={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          onPointerDownCapture={() => {
            if (isIncoming) kickCallRingtoneOnGesture();
          }}
          className={cn(
            "fixed inset-0 z-[97] flex flex-col outline-none",
            "bg-[radial-gradient(circle_at_15%_0%,rgba(139,30,63,0.22),transparent_34%),linear-gradient(180deg,#09070a,#000)]",
            "text-white",
            showJitsi && "bg-black",
          )}
        >
          <Dialog.Title className="sr-only">
            {t("webrtcBeta")} — {peerDisplayName || t("someoneTypingAnonymous")}
          </Dialog.Title>

          <div
            className={cn(
              "flex shrink-0 items-center justify-between gap-3 px-4 pt-4",
              showJitsi ? "absolute inset-x-0 top-0 z-[3] bg-gradient-to-b from-black/80 to-transparent pb-8 pt-[max(0.75rem,env(safe-area-inset-top))]" : "flex-col text-center",
            )}
          >
            <div
              className={cn("min-w-0", showJitsi ? "text-left" : "text-center")}
            >
              <h2 className="truncate text-lg font-semibold md:text-xl">
                {peerDisplayName || t("someoneTypingAnonymous")}
              </h2>
              <p className="text-sm text-white/70">{statusLabel}</p>
              {isGroupCall ? (
                <p className="text-xs text-brand-200/80">{t("navGroups")}</p>
              ) : null}
              {isActive ? (
                <p className="text-xs font-medium text-brand-200/90">
                  {formatCallDuration(callElapsedSec)}
                </p>
              ) : null}
              {callNotice && !showJitsi ? (
                <p className="mt-1 text-xs text-brand-200/90" role="status">
                  {callNoticeMessage(callNotice, t)}
                </p>
              ) : null}
            </div>

            {showJitsi ? (
              <button
                type="button"
                onClick={onHangup}
                className="inline-flex shrink-0 items-center gap-2 rounded-full border border-red-500/40 bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-red-900/30 transition hover:bg-red-500"
              >
                <PhoneOff className="h-4 w-4" aria-hidden />
                {t("callHangup")}
              </button>
            ) : null}
          </div>

          <div className={cn("relative mt-0 min-h-0 flex-1", showJitsi ? "px-0 pb-0" : "mt-3 px-2 pb-4 md:px-4")}>
            {showJitsi ? (
              <div className="relative h-full w-full">
                {jitsiLoading ? (
                  <div className="absolute inset-0 z-[2] flex flex-col items-center justify-center gap-3 rounded-2xl bg-black/50">
                    <Loader2
                      className="h-8 w-8 animate-spin text-brand-200"
                      aria-hidden
                    />
                    <p className="text-sm text-white/80">
                      {t("callStatusActive")}…
                    </p>
                  </div>
                ) : null}
                {jitsiError ? (
                  <div className="absolute inset-0 z-[2] flex flex-col items-center justify-center gap-4 rounded-2xl border border-red-500/30 bg-black/70 px-6 text-center">
                    <p className="text-sm text-red-100">{jitsiError}</p>
                    <button
                      type="button"
                      onClick={onHangup}
                      className="rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white"
                    >
                      {t("callHangup")}
                    </button>
                  </div>
                ) : null}
                <div
                  ref={containerRef}
                  className="h-full w-full overflow-hidden bg-black"
                />
              </div>
            ) : null}

            {showRingUi && isIncoming ? (
              <div className="flex h-full items-center justify-center">
                <IncomingCallActions
                  hint={t("incomingCallHint")}
                  isVideoCall={isVideoCall}
                  onAccept={onAcceptIncoming}
                  onReject={onRejectIncoming}
                  acceptDisabled={acceptingIncoming}
                />
              </div>
            ) : null}

            {showRingUi && isOutgoing ? (
              <div className="flex h-full flex-col items-center justify-center gap-6">
                <p className="max-w-sm text-center text-sm text-white/70">
                  {isVideoCall ? t("callStartVideo") : t("callStartVoice")}…
                </p>
                <button
                  type="button"
                  onClick={onHangup}
                  className="rounded-full border border-red-500/40 bg-red-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-red-900/30 transition hover:bg-red-500"
                >
                  {t("callHangup")}
                </button>
              </div>
            ) : null}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
