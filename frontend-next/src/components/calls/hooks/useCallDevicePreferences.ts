// @ts-nocheck
"use client";

import { useCallback, useEffect, useState } from "react";

const AUDIO_INPUT_STORAGE_KEY = "vegasphere-call-audio-input";
const VIDEO_INPUT_STORAGE_KEY = "vegasphere-call-video-input";
const AUDIO_OUTPUT_STORAGE_KEY = "vegasphere-call-audio-output";

function getStoredDeviceId(key) {
  if (typeof window === "undefined") return "";

  try {
    return localStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

function saveStoredDeviceId(key, deviceId) {
  if (typeof window === "undefined") return;

  try {
    if (deviceId) {
      localStorage.setItem(key, deviceId);
    } else {
      localStorage.removeItem(key);
    }
  } catch {
    // Ignore storage errors.
  }
}

export function useCallDevicePreferences() {
  const [audioInputs, setAudioInputs] = useState([]);
  const [videoInputs, setVideoInputs] = useState([]);
  const [audioOutputs, setAudioOutputs] = useState([]);

  const [selectedAudioInputId, setSelectedAudioInputId] = useState(() =>
    getStoredDeviceId(AUDIO_INPUT_STORAGE_KEY),
  );

  const [selectedVideoInputId, setSelectedVideoInputId] = useState(() =>
    getStoredDeviceId(VIDEO_INPUT_STORAGE_KEY),
  );

  const [selectedAudioOutputId, setSelectedAudioOutputId] = useState(() =>
    getStoredDeviceId(AUDIO_OUTPUT_STORAGE_KEY),
  );

  const refreshDevices = useCallback(async () => {
    if (!navigator?.mediaDevices?.enumerateDevices) return;

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();

      const nextAudioInputs = devices.filter(
        (device) => device.kind === "audioinput",
      );

      const nextVideoInputs = devices.filter(
        (device) => device.kind === "videoinput",
      );

      const nextAudioOutputs = devices.filter(
        (device) => device.kind === "audiooutput",
      );

      setAudioInputs(nextAudioInputs);
      setVideoInputs(nextVideoInputs);
      setAudioOutputs(nextAudioOutputs);

      if (
        selectedAudioInputId &&
        !nextAudioInputs.some(
          (device) => device.deviceId === selectedAudioInputId,
        )
      ) {
        setSelectedAudioInputId("");
      }

      if (
        selectedVideoInputId &&
        !nextVideoInputs.some(
          (device) => device.deviceId === selectedVideoInputId,
        )
      ) {
        setSelectedVideoInputId("");
      }

      if (
        selectedAudioOutputId &&
        !nextAudioOutputs.some(
          (device) => device.deviceId === selectedAudioOutputId,
        )
      ) {
        setSelectedAudioOutputId("");
      }
    } catch {
      setAudioInputs([]);
      setVideoInputs([]);
      setAudioOutputs([]);
    }
  }, [selectedAudioInputId, selectedVideoInputId, selectedAudioOutputId]);

  useEffect(() => {
    refreshDevices();
  }, [refreshDevices]);

  useEffect(() => {
    if (!navigator?.mediaDevices?.addEventListener) return;

    navigator.mediaDevices.addEventListener("devicechange", refreshDevices);

    return () => {
      navigator.mediaDevices.removeEventListener(
        "devicechange",
        refreshDevices,
      );
    };
  }, [refreshDevices]);

  useEffect(() => {
    saveStoredDeviceId(AUDIO_INPUT_STORAGE_KEY, selectedAudioInputId);
  }, [selectedAudioInputId]);

  useEffect(() => {
    saveStoredDeviceId(VIDEO_INPUT_STORAGE_KEY, selectedVideoInputId);
  }, [selectedVideoInputId]);

  useEffect(() => {
    saveStoredDeviceId(AUDIO_OUTPUT_STORAGE_KEY, selectedAudioOutputId);
  }, [selectedAudioOutputId]);

  return {
    audioInputs,
    videoInputs,
    audioOutputs,
    selectedAudioInputId,
    selectedVideoInputId,
    selectedAudioOutputId,
    setSelectedAudioInputId,
    setSelectedVideoInputId,
    setSelectedAudioOutputId,
    refreshDevices,
  };
}
