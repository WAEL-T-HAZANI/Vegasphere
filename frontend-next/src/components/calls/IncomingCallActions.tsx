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
  className = "",
}) {
  const { t } = useTranslation();

  return (
    <div className={cn("flex flex-col items-center gap-5", className)}>
      {hint ? (
        <p className="max-w-sm text-center text-sm leading-relaxed text-white/70">
          {hint}
        </p>
      ) : null}
      <div className="flex items-center gap-8 sm:gap-10">
        <button
          type="button"
          onClick={() => {
            stopIncomingCallRingtone();
            onReject?.();
          }}
          className="group flex flex-col items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          aria-label={t("declineCall")}
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full border border-red-500/40 bg-red-600 text-white shadow-lg shadow-red-900/40 transition hover:bg-red-500">
            <PhoneOff className="h-6 w-6 rotate-[135deg]" aria-hidden />
          </span>
          <span className="text-xs font-semibold text-white/75">{t("declineCall")}</span>
        </button>
        <button
          type="button"
          onClick={() => {
            stopIncomingCallRingtone();
            onAccept?.();
          }}
          className="group flex flex-col items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          aria-label={t("acceptCall")}
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full border border-brand-500/40 bg-brand-600 text-white shadow-lg shadow-brand-900/40 transition hover:bg-brand-500 dark:border-brand-700/50 dark:bg-brand-700 dark:hover:bg-brand-600">
            <Phone className="h-7 w-7" aria-hidden />
          </span>
          <span className="text-xs font-semibold text-white/75">
            {isVideoCall ? t("callStartVideo") : t("callStartVoice")}
          </span>
        </button>
      </div>
    </div>
  );
}
