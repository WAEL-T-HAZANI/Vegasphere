"use client";

import { useTranslation } from "react-i18next";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Monitor,
  PictureInPicture2,
  Settings2,
  Volume2,
} from "lucide-react";
import { cn } from "@/lib/classNames";

function ControlButton({
  label,
  onClick = () => {},
  active = false,
  danger = false,
  disabled = false,
  title = undefined,
  children,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "group flex min-w-[4.25rem] flex-col items-center gap-1.5 outline-none transition disabled:cursor-not-allowed disabled:opacity-40",
        "focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
      )}
    >
      <span
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-full border shadow-lg transition-all",
          danger &&
            "border-red-500/40 bg-red-600 text-white shadow-red-900/40 hover:bg-red-500",
          !danger &&
            active &&
            "border-brand-700/50 bg-brand-800 text-white shadow-brand-950/40 hover:bg-brand-700",
          !danger &&
            !active &&
            "border-white/15 bg-white/10 text-white shadow-black/30 hover:border-white/25 hover:bg-white/[0.14]",
          disabled && !danger && "opacity-50",
        )}
      >
        {children}
      </span>
      <span className="max-w-[5.25rem] text-center text-[9px] font-semibold leading-tight text-white/65 group-hover:text-white/85 sm:max-w-[6.5rem] sm:text-[10px]">
        {label}
      </span>
    </button>
  );
}

export default function CallControlsBar({
  micMuted,
  camOff,
  isVideoCall,
  isScreenSharing = false,
  callState,
  devicesOpen = false,
  showPictureInPicture = false,
  showScreenShare = false,
  onToggleMic,
  onToggleCamera,
  onToggleScreenShare,
  onToggleDevices,
  onRequestPip = undefined,
  onHangup,
}) {
  const { t } = useTranslation();
  const activeCall = callState === "active";

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div
        className={cn(
          "rounded-[1.75rem] border border-white/10 bg-black/55 p-3 shadow-2xl shadow-black/50 backdrop-blur-xl",
          "ring-1 ring-white/5",
        )}
      >
        <div className="flex flex-wrap items-end justify-center gap-x-1 gap-y-3 sm:gap-x-2">
          <ControlButton
            label={micMuted ? t("callUnmute") : t("callMute")}
            onClick={onToggleMic}
            active={!micMuted}
          >
            {micMuted ? (
              <MicOff className="h-5 w-5" aria-hidden />
            ) : (
              <Mic className="h-5 w-5" aria-hidden />
            )}
          </ControlButton>

          {isVideoCall ? (
            <ControlButton
              label={camOff ? t("callCamOn") : t("callCamOff")}
              onClick={onToggleCamera}
              active={!camOff}
            >
              {camOff ? (
                <VideoOff className="h-5 w-5" aria-hidden />
              ) : (
                <Video className="h-5 w-5" aria-hidden />
              )}
            </ControlButton>
          ) : (
            <ControlButton label={t("callAudioOnlyRemote")} disabled>
              <Volume2 className="h-5 w-5" aria-hidden />
            </ControlButton>
          )}

          {showScreenShare ? (
            <ControlButton
              label={
                isScreenSharing ? t("callStopScreenShare") : t("callScreenShare")
              }
              onClick={onToggleScreenShare}
              active={isScreenSharing}
              disabled={!activeCall}
              title={!activeCall ? t("callScreenShareNeedActive") : undefined}
            >
              <Monitor className="h-5 w-5" aria-hidden />
            </ControlButton>
          ) : null}

          <ControlButton
            label={t("callDevices")}
            onClick={onToggleDevices}
            active={devicesOpen}
          >
            <Settings2 className="h-5 w-5" aria-hidden />
          </ControlButton>

          {showPictureInPicture ? (
            <ControlButton label={t("callPictureInPicture")} onClick={onRequestPip}>
              <PictureInPicture2 className="h-5 w-5" aria-hidden />
            </ControlButton>
          ) : null}

          <ControlButton label={t("callHangup")} onClick={onHangup} danger>
            <PhoneOff className="h-5 w-5" aria-hidden />
          </ControlButton>
        </div>
      </div>
    </div>
  );
}
