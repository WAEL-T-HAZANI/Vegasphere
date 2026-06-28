"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import * as Dialog from "@radix-ui/react-dialog";
import { User } from "lucide-react";
import { cn } from "@/lib/classNames";
import { kickCallRingtoneOnGesture } from "@/lib/callRingtone";
import CallDevicePanel from "@/components/calls/CallDevicePanel";
import CallControlsBar from "@/components/calls/CallControlsBar";
import IncomingCallActions from "@/components/calls/IncomingCallActions";

function formatCallDuration(totalSec) {
  const s = Math.max(0, Math.floor(totalSec || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

function supportsAudioSinkSelection() {
  return (
    typeof HTMLMediaElement !== "undefined" &&
    typeof HTMLMediaElement.prototype.setSinkId === "function"
  );
}

export default function CallScreenOverlay({
  open,
  callState,
  peerConnectionState = null,
  peerDisplayName,
  isVideoCall,
  localStream,
  remoteStream,
  micMuted,
  camOff,
  callElapsedSec = 0,
  onToggleMic,
  onToggleCamera,
  onHangup,
  onToggleScreenShare,
  isScreenSharing = false,
  iceRestartPending = false,
  audioInputs = [],
  videoInputs = [],
  audioOutputs = [],
  selectedAudioInputId = "",
  selectedVideoInputId = "",
  selectedAudioOutputId = "",
  onChangeAudioInput,
  onChangeVideoInput,
  onChangeAudioOutput,
  callNotice = "",
  onAcceptIncoming,
  onRejectIncoming,
}) {
  const { t } = useTranslation();
  const localRef = useRef(null);
  const remoteRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const [devicesOpen, setDevicesOpen] = useState(false);

  const showSpeakerOutput = supportsAudioSinkSelection();

  useEffect(() => {
    const el = localRef.current;
    if (!el) return;
    el.srcObject = localStream || null;
  }, [localStream]);

  useEffect(() => {
    const el = remoteRef.current;
    if (!el) return;
    el.srcObject = remoteStream || null;
    el.muted = true;
    if (remoteStream) {
      void el.play?.().catch(() => {});
    }
  }, [remoteStream]);

  useEffect(() => {
    const el = remoteAudioRef.current;
    if (!el) return;
    el.srcObject = remoteStream || null;
    if (remoteStream) {
      void el.play?.().catch(() => {});
    }
  }, [remoteStream]);

  useEffect(() => {
    const el = remoteAudioRef.current;
    if (!el || !selectedAudioOutputId || !showSpeakerOutput) return;
    el.setSinkId(selectedAudioOutputId).catch(() => {});
  }, [remoteStream, selectedAudioOutputId, showSpeakerOutput]);

  const requestVideoPip = useCallback(async () => {
    const el = remoteRef.current;
    if (!el || !remoteStream?.getVideoTracks?.()?.length) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        return;
      }
      if (el.requestPictureInPicture) await el.requestPictureInPicture();
    } catch {}
  }, [remoteStream]);

  const isIncoming = callState === "ringing_in";

  const statusLabel = isIncoming
    ? t("callStatusRingingIn")
    : callState === "ringing_out"
      ? t("callStatusRingingOut")
      : t("callStatusActive");

  const showRemoteVideo =
    Boolean(remoteStream?.getVideoTracks?.()?.some((x) => x.readyState !== "ended"));

  const showConnWarn =
    callState === "active" &&
    (peerConnectionState === "disconnected" ||
      peerConnectionState === "failed");

  const showPip =
    showRemoteVideo &&
    typeof document !== "undefined" &&
    document.pictureInPictureEnabled;

  return (
    <Dialog.Root open={open}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[96] bg-black/82 backdrop-blur-md" />
        <Dialog.Content
          aria-describedby={undefined}
          onEscapeKeyDown={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          onPointerDownCapture={() => {
            if (isIncoming) kickCallRingtoneOnGesture();
          }}
          className="fixed inset-0 z-[97] flex flex-col bg-[radial-gradient(circle_at_15%_0%,rgba(139,30,63,0.2),transparent_34%),linear-gradient(180deg,#09070a,#000)] p-4 text-white outline-none md:p-6"
        >
          <Dialog.Title className="sr-only">
            {t("webrtcBeta")} — {peerDisplayName || t("someoneTypingAnonymous")}
          </Dialog.Title>
          <audio ref={remoteAudioRef} autoPlay playsInline className="sr-only" aria-hidden />

          <div className="flex shrink-0 flex-col items-center gap-1 pt-2 text-center">
            <h2 className="text-lg font-semibold text-white md:text-xl">
              {peerDisplayName || t("someoneTypingAnonymous")}
            </h2>
            <p className="text-sm text-white/70">{statusLabel}</p>
            {showConnWarn ? (
              <p
                className="mt-2 max-w-md rounded-lg bg-brand-900/35 px-3 py-2 text-xs text-brand-100 dark:bg-brand-800/40 dark:text-brand-50"
                role="status"
              >
                {peerConnectionState === "failed"
                  ? t("webrtcFailedHint")
                  : t("webrtcDisconnectedHint")}
              </p>
            ) : null}
            {iceRestartPending ? (
              <p className="mt-1 text-xs text-brand-200/90" role="status">
                {t("webrtcReconnectingHint")}
              </p>
            ) : null}
            {callNotice ? (
              <p className="mt-1 text-xs text-brand-200/90" role="status">
                {callNotice === "busy"
                  ? t("callBusyRemote")
                  : callNotice === "declined"
                    ? t("callDeclinedRemote")
                    : callNotice === "missed"
                      ? t("callMissedRemote")
                    : ""}
              </p>
            ) : null}
          </div>

          <div className="relative mt-4 flex min-h-0 flex-1 flex-col items-center justify-center">
            {isIncoming ? (
              <IncomingCallActions
                hint={t("incomingCallHint")}
                isVideoCall={isVideoCall}
                onAccept={onAcceptIncoming}
                onReject={onRejectIncoming}
              />
            ) : (
              <>
            <div className="relative aspect-video w-full max-w-4xl overflow-hidden rounded-[2rem] border border-white/10 bg-black/60 shadow-2xl shadow-black/40 ring-1 ring-white/10">
              {callState === "active" && (
                <div
                  className="absolute left-3 top-3 z-10 rounded-lg bg-black/55 px-2 py-1 font-mono text-sm tabular-nums text-white ring-1 ring-white/20"
                  aria-live="polite"
                  title={t("callTimer")}
                >
                  {formatCallDuration(callElapsedSec)}
                </div>
              )}

              {remoteStream ? (
                <video
                  ref={remoteRef}
                  autoPlay
                  playsInline
                  className={cn(
                    showRemoteVideo
                      ? "h-full w-full object-cover"
                      : "pointer-events-none absolute h-0 w-0 opacity-0",
                  )}
                />
              ) : null}

              {!showRemoteVideo ? (
                <div className="flex h-full min-h-[200px] w-full flex-col items-center justify-center gap-3 text-white/80">
                  <User className="h-20 w-20 opacity-60" aria-hidden />
                  <span className="text-sm">
                    {callState === "ringing_out"
                      ? t("callWaitingRemote")
                      : t("callAudioOnlyRemote")}
                  </span>
                </div>
              ) : null}

              {localStream && (
                <div className="absolute bottom-3 right-3 w-[28%] min-w-[120px] max-w-[200px] overflow-hidden rounded-2xl border border-white/20 bg-black shadow-lg">
                  <video
                    ref={localRef}
                    autoPlay
                    playsInline
                    muted
                    className={cn(
                      "aspect-video w-full object-cover",
                      camOff && "opacity-40",
                    )}
                  />
                  {camOff && isVideoCall && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-[10px] text-white/80">
                      {t("callCamOff")}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-4 w-full max-w-4xl">
              <CallDevicePanel
                open={devicesOpen}
                audioInputs={audioInputs}
                videoInputs={videoInputs}
                audioOutputs={audioOutputs}
                selectedAudioInputId={selectedAudioInputId}
                selectedVideoInputId={selectedVideoInputId}
                selectedAudioOutputId={selectedAudioOutputId}
                isVideoCall={isVideoCall}
                showSpeakerOutput={showSpeakerOutput}
                onChangeAudioInput={onChangeAudioInput}
                onChangeVideoInput={onChangeVideoInput}
                onChangeAudioOutput={onChangeAudioOutput}
              />
            </div>
              </>
            )}
          </div>

          {!isIncoming ? (
          <div className="mt-4 shrink-0 pb-2">
            <CallControlsBar
              micMuted={micMuted}
              camOff={camOff}
              isVideoCall={isVideoCall}
              isScreenSharing={isScreenSharing}
              callState={callState}
              devicesOpen={devicesOpen}
              showPictureInPicture={showPip}
              showScreenShare={isVideoCall && typeof onToggleScreenShare === "function"}
              onToggleMic={onToggleMic}
              onToggleCamera={onToggleCamera}
              onToggleScreenShare={onToggleScreenShare}
              onToggleDevices={() => setDevicesOpen((open) => !open)}
              onRequestPip={requestVideoPip}
              onHangup={onHangup}
            />
          </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
