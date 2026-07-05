"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import * as Dialog from "@radix-ui/react-dialog";
import { Loader2, Phone, PhoneOff, Video } from "lucide-react";
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

function peerInitial(name) {
  return String(name || "?")
    .trim()
    .slice(0, 1)
    .toUpperCase();
}

function CallRingBackdrop({ peerDisplayName, statusLabel, isVideoCall, t }) {
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))]">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(168,42,96,0.35),transparent_42%),linear-gradient(180deg,#1a0a12_0%,#09070a_55%,#050405_100%)]"
        aria-hidden
      />
      <div className="relative flex flex-col items-center text-center">
        <div className="relative mb-6 flex h-32 w-32 items-center justify-center">
          <span
            className="absolute inset-0 animate-ping rounded-full bg-brand-500/20"
            aria-hidden
          />
          <span
            className="absolute inset-2 animate-pulse rounded-full bg-brand-500/10"
            aria-hidden
          />
          <span className="relative flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 via-brand-700 to-red-900 text-4xl font-bold text-white shadow-2xl shadow-brand-900/40 ring-4 ring-white/10">
            {peerInitial(peerDisplayName)}
          </span>
        </div>
        <h2 className="max-w-[16rem] truncate text-2xl font-semibold text-white">
          {peerDisplayName || t("someoneTypingAnonymous")}
        </h2>
        <p className="mt-2 text-sm text-white/70">{statusLabel}</p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-brand-100">
          {isVideoCall ? (
            <Video className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <Phone className="h-3.5 w-3.5" aria-hidden />
          )}
          {isVideoCall ? t("callStartVideo") : t("callStartVoice")}
        </div>
      </div>
    </div>
  );
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
  const joinTimeoutRef = useRef(null);
  const joinedRef = useRef(false);
  const embedKeyRef = useRef("");
  const onReadyToCloseRef = useRef(onJitsiReadyToClose);
  const [jitsiLoading, setJitsiLoading] = useState(false);
  const [jitsiError, setJitsiError] = useState("");

  const isIncoming = callState === "ringing_in";
  const isOutgoing = callState === "ringing_out";
  const isActive = callState === "active";
  const showJitsi = jitsiActive && isActive && Boolean(roomName);
  const showRingUi = isIncoming || isOutgoing;
  const embedKey = showJitsi ? String(roomName) : "";

  onReadyToCloseRef.current = onJitsiReadyToClose;

  useEffect(() => {
    if (!open) return;
    prefetchJitsiExternalApi();
  }, [open]);

  useEffect(() => {
    if (!embedKey || embedKeyRef.current === embedKey) return;
    embedKeyRef.current = embedKey;
    closedRef.current = false;
    joinedRef.current = false;
    setJitsiError("");
  }, [embedKey]);

  useEffect(() => {
    if (!showJitsi || !containerRef.current || !roomName) {
      setJitsiLoading(false);
      return undefined;
    }

    let disposed = false;
    const container = containerRef.current;
    joinedRef.current = false;
    setJitsiLoading(true);
    setJitsiError("");

    const notifyClose = () => {
      if (closedRef.current) return;
      closedRef.current = true;
      onReadyToCloseRef.current?.();
    };

    joinTimeoutRef.current = setTimeout(() => {
      if (disposed || joinedRef.current) return;
      setJitsiLoading(false);
      setJitsiError(t("callMediaFailed"));
    }, 45000);

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

        const markJoined = () => {
          if (disposed) return;
          joinedRef.current = true;
          if (joinTimeoutRef.current) {
            clearTimeout(joinTimeoutRef.current);
            joinTimeoutRef.current = null;
          }
          setJitsiLoading(false);
          setJitsiError("");
        };

        api.addListener("readyToClose", notifyClose);
        api.addListener("videoConferenceLeft", notifyClose);
        api.addListener("videoConferenceJoined", () => {
          wireJitsiCallApi(api, {
            displayName: userDisplayName,
            audioOnly: !isVideoCall,
          });
          markJoined();
        });
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
      if (joinTimeoutRef.current) {
        clearTimeout(joinTimeoutRef.current);
        joinTimeoutRef.current = null;
      }
      try {
        apiRef.current?.dispose?.();
      } catch {}
      apiRef.current = null;
      if (container) container.innerHTML = "";
    };
  }, [showJitsi, roomName, isVideoCall, userDisplayName, userEmail, t]);

  const statusLabel = isIncoming
    ? t("callStatusRingingIn")
    : isOutgoing
      ? t("callStatusRingingOut")
      : isActive
        ? formatCallDuration(callElapsedSec)
        : t("callStatusActive");

  return (
    <Dialog.Root open={open}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[96] bg-black" />
        <Dialog.Content
          aria-describedby={undefined}
          onEscapeKeyDown={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          onPointerDownCapture={() => {
            if (isIncoming) kickCallRingtoneOnGesture();
          }}
          className="fixed inset-0 z-[97] flex flex-col overflow-hidden bg-black outline-none"
        >
          <Dialog.Title className="sr-only">
            {t("webrtcBeta")} — {peerDisplayName || t("someoneTypingAnonymous")}
          </Dialog.Title>

          {showJitsi ? (
            <div className="relative min-h-0 flex-1">
              {jitsiLoading ? (
                <div className="absolute inset-0 z-[2] flex flex-col items-center justify-center gap-3 bg-[#12080c]">
                  <Loader2
                    className="h-9 w-9 animate-spin text-brand-300"
                    aria-hidden
                  />
                  <p className="text-sm text-white/80">
                    {t("callStatusActive")}…
                  </p>
                </div>
              ) : null}
              {jitsiError ? (
                <div className="absolute inset-0 z-[3] flex flex-col items-center justify-center gap-4 bg-[#12080c] px-6 text-center">
                  <p className="text-sm text-red-100">{jitsiError}</p>
                  <button
                    type="button"
                    onClick={onHangup}
                    className="rounded-full bg-red-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg"
                  >
                    {t("callHangup")}
                  </button>
                </div>
              ) : null}
              <div
                ref={containerRef}
                className="vegasphere-jitsi-root h-full w-full min-h-[100dvh] bg-[#12080c]"
              />
            </div>
          ) : null}

          {showRingUi ? (
            <div className="relative min-h-0 flex-1">
              <CallRingBackdrop
                peerDisplayName={peerDisplayName}
                statusLabel={statusLabel}
                isVideoCall={isVideoCall}
                t={t}
              />
              {isGroupCall ? (
                <p className="absolute inset-x-0 top-[max(1rem,env(safe-area-inset-top))] text-center text-xs text-brand-200/80">
                  {t("navGroups")}
                </p>
              ) : null}
              {callNotice ? (
                <p
                  className="absolute inset-x-0 bottom-36 text-center text-xs text-brand-200/90"
                  role="status"
                >
                  {callNoticeMessage(callNotice, t)}
                </p>
              ) : null}
              <div className="absolute inset-x-0 bottom-[max(1.5rem,env(safe-area-inset-bottom))] flex justify-center px-6">
                {isIncoming ? (
                  <IncomingCallActions
                    hint={t("incomingCallHint")}
                    isVideoCall={isVideoCall}
                    onAccept={onAcceptIncoming}
                    onReject={onRejectIncoming}
                    acceptDisabled={acceptingIncoming}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={onHangup}
                    className="inline-flex items-center gap-2 rounded-full border border-red-500/40 bg-red-600 px-8 py-3 text-sm font-semibold text-white shadow-xl shadow-red-950/40 transition hover:bg-red-500"
                  >
                    <PhoneOff className="h-5 w-5" aria-hidden />
                    {t("callHangup")}
                  </button>
                )}
              </div>
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
