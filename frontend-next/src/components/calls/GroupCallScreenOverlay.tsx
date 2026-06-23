"use client";

import { useEffect, useRef, useState } from "react";
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

function RemoteTile({ stream, label, selectedAudioOutputId = "" }) {
  const ref = useRef(null);
  const showSpeakerOutput = supportsAudioSinkSelection();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.srcObject = stream || null;
  }, [stream]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !selectedAudioOutputId || !showSpeakerOutput) return;
    el.setSinkId(selectedAudioOutputId).catch(() => {});
  }, [stream, selectedAudioOutputId, showSpeakerOutput]);

  const showVideo = Boolean(
    stream?.getVideoTracks?.()?.some((t) => t.readyState !== "ended"),
  );

  return (
    <div className="relative aspect-video min-h-[120px] overflow-hidden rounded-2xl border border-white/10 bg-black/60 shadow-lg shadow-black/30 ring-1 ring-white/10">
      {stream ? (
        <video
          ref={ref}
          autoPlay
          playsInline
          className={cn(
            showVideo
              ? "h-full w-full object-cover"
              : "pointer-events-none absolute h-0 w-0 opacity-0",
          )}
        />
      ) : null}

      {!showVideo ? (
        <div className="flex h-full min-h-[120px] flex-col items-center justify-center gap-2 text-white/75">
          <User className="h-10 w-10 opacity-50" aria-hidden />
          <span className="max-w-full truncate px-2 text-center text-xs">
            {label}
          </span>
        </div>
      ) : null}

      {showVideo && label ? (
        <div className="absolute bottom-1 left-1 max-w-[90%] truncate rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-white/90">
          {label}
        </div>
      ) : null}
    </div>
  );
}

export default function GroupCallScreenOverlay({
  open,
  callState,
  participantLabels = {},
  callerDisplayName = "",
  isVideoCall,
  localStream,
  remoteStreams,
  micMuted,
  camOff,
  callElapsedSec = 0,
  onToggleMic,
  onToggleCamera,
  onHangup,
  onToggleScreenShare,
  isScreenSharing = false,
  audioInputs = [],
  videoInputs = [],
  audioOutputs = [],
  selectedAudioInputId = "",
  selectedVideoInputId = "",
  selectedAudioOutputId = "",
  onChangeAudioInput,
  onChangeVideoInput,
  onChangeAudioOutput,
  onAcceptIncoming,
  onRejectIncoming,
}) {
  const { t } = useTranslation();
  const localRef = useRef(null);
  const [devicesOpen, setDevicesOpen] = useState(false);

  const showSpeakerOutput = supportsAudioSinkSelection();

  useEffect(() => {
    const el = localRef.current;
    if (!el) return;
    el.srcObject = localStream || null;
  }, [localStream]);

  const remoteEntries = Object.entries(remoteStreams || {});
  const isIncoming = callState === "ringing_in";

  const waitingForOthers =
    !isIncoming &&
    remoteEntries.length === 0 &&
    (callState === "ringing_out" || callState === "active");

  const statusLabel = isIncoming
    ? t("incomingGroupCall")
    : callState === "ringing_out"
      ? t("callStatusRingingOut")
      : t("groupCallActive");

  const gridClass =
    remoteEntries.length <= 1
      ? "grid-cols-1"
      : remoteEntries.length === 2
        ? "grid-cols-2"
        : "grid-cols-2 sm:grid-cols-3";

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
            {t("groupCallTitle")}
          </Dialog.Title>

          <div className="flex shrink-0 flex-col items-center gap-1 pt-2 text-center">
            <h2 className="text-lg font-semibold text-white md:text-xl">
              {isIncoming
                ? callerDisplayName || t("someoneTypingAnonymous")
                : t("groupCallTitle")}
            </h2>
            {!isIncoming ? (
              <p className="text-xs text-white/60">{t("groupCallMeshHint")}</p>
            ) : null}
            <p className="text-sm text-white/70">{statusLabel}</p>
            {isIncoming ? (
              <p className="max-w-sm text-xs leading-relaxed text-white/55">
                {t("incomingGroupCallHint", {
                  name: callerDisplayName || t("someoneTypingAnonymous"),
                  mode: isVideoCall ? t("callStartVideo") : t("callStartVoice"),
                })}
              </p>
            ) : null}
          </div>

          <div className="relative mt-4 flex min-h-0 flex-1 flex-col">
            {isIncoming ? (
              <div className="flex flex-1 items-center justify-center">
                <IncomingCallActions
                  isVideoCall={isVideoCall}
                  onAccept={onAcceptIncoming}
                  onReject={onRejectIncoming}
                />
              </div>
            ) : (
              <>
            {callState === "active" && (
              <div
                className="absolute left-3 top-0 z-10 rounded-lg bg-black/55 px-2 py-1 font-mono text-sm tabular-nums text-white ring-1 ring-white/20"
                aria-live="polite"
                title={t("callTimer")}
              >
                {formatCallDuration(callElapsedSec)}
              </div>
            )}

            <div
              className={cn(
                "grid flex-1 gap-2 overflow-auto pb-2",
                gridClass,
              )}
            >
              {remoteEntries.map(([id, stream]) => (
                <RemoteTile
                  key={id}
                  stream={stream}
                  label={participantLabels[id] || id}
                  selectedAudioOutputId={selectedAudioOutputId}
                />
              ))}
            </div>

            {waitingForOthers ? (
              <div className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-center px-4">
                <div className="rounded-2xl border border-white/10 bg-black/55 px-4 py-3 text-center text-sm text-white/75 ring-1 ring-white/10 backdrop-blur-sm">
                  {t("groupCallWaitingForOthers")}
                </div>
              </div>
            ) : null}

            {localStream && (
              <div className="pointer-events-none absolute bottom-24 right-4 w-[min(32%,200px)] overflow-hidden rounded-2xl border border-white/20 bg-black shadow-lg">
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

            <div className="mt-4">
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
              showScreenShare={isVideoCall && typeof onToggleScreenShare === "function"}
              onToggleMic={onToggleMic}
              onToggleCamera={onToggleCamera}
              onToggleScreenShare={onToggleScreenShare}
              onToggleDevices={() => setDevicesOpen((open) => !open)}
              onHangup={onHangup}
            />
          </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
