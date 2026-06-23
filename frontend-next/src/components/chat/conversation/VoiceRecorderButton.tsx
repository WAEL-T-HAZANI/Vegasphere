"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Mic, Square } from "lucide-react";
import { cn } from "@/lib/classNames";
import {
  createMediaRecorder,
  openMicStream,
  startMicLevelMeter,
  stopMicLevelMeter,
  stopStream,
  waitForRecording,
} from "@/lib/voiceRecorderEngine";

const MIN_RECORD_MS = 400;
const HEARD_THRESHOLD = 4;

export default function VoiceRecorderButton({
  onRecorded,
  onError,
  onRecordingChange,
  disabled,
}) {
  const { t } = useTranslation();
  const [active, setActive] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [busy, setBusy] = useState(false);
  const [micLevel, setMicLevel] = useState(0);

  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const startedAtRef = useRef(0);
  const tickRef = useRef(null);
  const meterRef = useRef(null);
  const micLevelRef = useRef(0);
  const maxMicLevelRef = useRef(0);

  const stopTick = () => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  };

  const cleanup = () => {
    stopTick();
    stopMicLevelMeter(meterRef.current);
    meterRef.current = null;
    stopStream(streamRef.current);
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
    startedAtRef.current = 0;
    micLevelRef.current = 0;
    maxMicLevelRef.current = 0;
    setMicLevel(0);
    setElapsedSec(0);
    setActive(false);
    setBusy(false);
  };

  useEffect(() => () => cleanup(), []);

  const emitRecordingChange = (recording, sec) => {
    onRecordingChange?.(recording, sec, {
      level: micLevelRef.current,
      heard: maxMicLevelRef.current > HEARD_THRESHOLD,
    });
  };

  const stop = async () => {
    const recorder = recorderRef.current;
    if (!recorder || busy || !active) return;

    setBusy(true);
    const heardAudio = maxMicLevelRef.current > HEARD_THRESHOLD;

    try {
      const recording = await waitForRecording(
        recorder,
        () => chunksRef.current,
        startedAtRef.current,
      );

      cleanup();
      emitRecordingChange(false, 0);

      if (recording.elapsedMs < MIN_RECORD_MS) {
        onError?.(t("voiceRecordTooShort") || "Hold to record a little longer.");
        return;
      }

      if (!recording.blob?.size) {
        onError?.(
          heardAudio
            ? t("voiceRecordFailed") || "Recording failed."
            : t("voiceRecordEmpty") ||
                "No voice was captured. Check your mic input device in Windows sound settings.",
        );
        return;
      }

      onRecorded?.(recording.blob, recording.mimeType, recording.seconds);
    } catch {
      cleanup();
      emitRecordingChange(false, 0);
      onError?.(t("voiceRecordFailed") || "Recording failed.");
    }
  };

  const start = async () => {
    if (disabled || active || busy) return;
    if (typeof window === "undefined") return;

    if (!navigator?.mediaDevices?.getUserMedia) {
      onError?.(
        t("voiceRecordNotSupported") || "Voice recording is not supported.",
      );
      return;
    }

    if (typeof MediaRecorder === "undefined") {
      onError?.(
        t("voiceRecordNotSupported") || "Voice recording is not supported.",
      );
      return;
    }

    setBusy(true);

    try {
      cleanup();

      const stream = await openMicStream();
      const track = stream.getAudioTracks()[0];

      if (!track || track.readyState !== "live") {
        cleanup();
        onError?.(t("voiceRecordNoMic") || "No microphone was found.");
        return;
      }

      if (track.enabled === false) {
        cleanup();
        onError?.(
          t("voiceRecordEmpty") ||
            "No voice was captured. Check your mic input device in Windows sound settings.",
        );
        return;
      }

      streamRef.current = stream;

      meterRef.current = startMicLevelMeter(stream, (level) => {
        micLevelRef.current = level;
        if (level > maxMicLevelRef.current) {
          maxMicLevelRef.current = level;
        }
        setMicLevel(level);
      });

      const { recorder } = createMediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event?.data) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        cleanup();
        emitRecordingChange(false, 0);
        onError?.(t("voiceRecordFailed") || "Recording failed.");
      };

      track.onended = () => {
        cleanup();
        emitRecordingChange(false, 0);
        onError?.(t("voiceRecordFailed") || "Recording failed.");
      };

      recorder.start(1000);
      startedAtRef.current = performance.now();

      setActive(true);
      setBusy(false);
      setElapsedSec(0);
      emitRecordingChange(true, 0);

      stopTick();
      tickRef.current = setInterval(() => {
        const sec = Math.max(
          0,
          Math.round((performance.now() - startedAtRef.current) / 1000),
        );
        setElapsedSec(sec);
        emitRecordingChange(true, sec);
      }, 1000);
    } catch (error) {
      cleanup();
      emitRecordingChange(false, 0);

      if (error?.name === "NotAllowedError") {
        onError?.(
          t("microphonePermissionDenied") ||
            "Microphone permission was denied.",
        );
        return;
      }

      if (error?.name === "NotFoundError") {
        onError?.(t("voiceRecordNoMic") || "No microphone was found.");
        return;
      }

      onError?.(t("voiceRecordFailed") || "Recording failed.");
    }
  };

  const micActive = micLevel > HEARD_THRESHOLD;

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        disabled={disabled || busy}
        onClick={active ? () => void stop() : () => void start()}
        title={
          active
            ? `${t("stopRecording")} (${elapsedSec}s)`
            : t("voiceMessage")
        }
        aria-pressed={active}
        className={cn(
          "vs-composer-icon-btn vs-composer-icon-btn-sm transition-colors",
          active
            ? "border-red-400 bg-red-50 text-red-600 shadow-red-500/10 dark:border-red-500/50 dark:bg-red-950/40 dark:text-red-300"
            : "",
          (disabled || busy) && "pointer-events-none opacity-50",
        )}
      >
        {active ? (
          <Square className="h-4 w-4 fill-current" aria-hidden />
        ) : (
          <Mic className="h-5 w-5" aria-hidden />
        )}
      </button>
      {active ? (
        <>
          <span
            className="pointer-events-none absolute -top-1.5 left-1/2 z-10 min-w-[1.75rem] -translate-x-1/2 rounded-full bg-red-600 px-1.5 py-0.5 text-center text-[10px] font-bold leading-none text-white shadow-sm"
            aria-live="polite"
          >
            {elapsedSec}s
          </span>
          <span
            className="pointer-events-none absolute -bottom-1 left-1/2 z-10 h-1 w-8 -translate-x-1/2 overflow-hidden rounded-full bg-black/15 dark:bg-white/15"
            aria-hidden
          >
            <span
              className={cn(
                "block h-full rounded-full transition-[width] duration-75",
                micActive ? "bg-brand-600" : "bg-brand-400",
              )}
              style={{ width: `${Math.max(12, micLevel)}%` }}
            />
          </span>
        </>
      ) : null}
    </div>
  );
}
