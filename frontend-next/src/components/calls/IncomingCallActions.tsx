"use client";

import { useTranslation } from "react-i18next";
import { Phone, PhoneOff } from "lucide-react";
import { cn } from "@/lib/classNames";
import { stopIncomingCallRingtone } from "@/lib/callRingtone";

export default function IncomingCallActions({
  hint = "",
  isVideoCall = false,
  onAccept,
  onReject,
  acceptDisabled = false,
  className = "",
}) {
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-5 rounded-[2rem] border border-white/10 bg-black/25 px-5 py-5 shadow-2xl shadow-black/30 backdrop-blur-xl",
        className,
      )}
    >
      {hint ? (
        <p className="max-w-sm text-center text-sm leading-relaxed text-white/75">
          {hint}
        </p>
      ) : null}
      <div className="flex items-center gap-7 sm:gap-10">
        <button
          type="button"
          onClick={() => {
            stopIncomingCallRingtone();
            onReject?.();
          }}
          className="group flex flex-col items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          aria-label={t("declineCall")}
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full border border-brand-500/30 bg-brand-900 text-white shadow-xl shadow-brand-900/45 transition duration-200 group-hover:scale-105 group-hover:bg-brand-800 group-active:scale-95">
            <PhoneOff className="h-6 w-6 rotate-[135deg]" aria-hidden />
          </span>
          <span className="text-xs font-semibold text-white/75">
            {t("declineCall")}
          </span>
        </button>
        <button
          type="button"
          disabled={acceptDisabled}
          onClick={() => {
            if (acceptDisabled) return;
            stopIncomingCallRingtone();
            onAccept?.();
          }}
          className={cn(
            "group flex flex-col items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
            acceptDisabled && "pointer-events-none opacity-60",
          )}
          aria-label={t("acceptCall")}
        >
          <span className="relative flex h-20 w-20 items-center justify-center rounded-full border border-brand-300/35 bg-gradient-to-br from-brand-500 via-brand-600 to-brand-800 text-white shadow-2xl shadow-brand-900/45 transition duration-200 group-hover:scale-105 group-hover:from-brand-400 group-hover:via-brand-500 group-hover:to-brand-700 group-active:scale-95">
            <span
              className="absolute inset-0 animate-ping rounded-full bg-brand-400/20"
              aria-hidden
            />
            <Phone className="relative h-8 w-8" aria-hidden />
          </span>
          <span className="text-xs font-semibold text-white/75">
            {isVideoCall ? t("callStartVideo") : t("callStartVoice")}
          </span>
        </button>
      </div>
    </div>
  );
}
