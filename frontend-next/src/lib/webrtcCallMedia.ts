// @ts-nocheck
/**
 * Shared WebRTC media helpers for 1:1 calls (proven transceiver + ICE queue pattern).
 */

export function buildCallAudioConstraints(deviceId?: string) {
  const base = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    googEchoCancellation: true,
    googAutoGainControl: true,
    googNoiseSuppression: true,
    googHighpassFilter: true,
  };
  if (deviceId) {
    return { ...base, deviceId: { ideal: deviceId } };
  }
  return base;
}

export function buildCallVideoConstraints(deviceId?: string) {
  if (deviceId) {
    return {
      deviceId: { ideal: deviceId },
      facingMode: { ideal: "user" },
      width: { ideal: 1280 },
      height: { ideal: 720 },
    };
  }
  return {
    facingMode: { ideal: "user" },
    width: { ideal: 1280 },
    height: { ideal: 720 },
  };
}

export function buildCallMediaConstraints(wantVideo: boolean, audioDeviceId = "", videoDeviceId = "") {
  return {
    audio: buildCallAudioConstraints(audioDeviceId || undefined),
    video: wantVideo ? buildCallVideoConstraints(videoDeviceId || undefined) : false,
  };
}

export async function acquireCallMedia(
  wantVideo: boolean,
  audioDeviceId = "",
  videoDeviceId = "",
) {
  try {
    return await navigator.mediaDevices.getUserMedia(
      buildCallMediaConstraints(wantVideo, audioDeviceId, videoDeviceId),
    );
  } catch (err) {
    if (!wantVideo) throw err;
    console.warn("Call video unavailable, falling back to audio-only", err);
    return navigator.mediaDevices.getUserMedia(
      buildCallMediaConstraints(false, audioDeviceId, videoDeviceId),
    );
  }
}

/** Add sendrecv transceivers and attach local tracks (reliable SDP m-lines). */
export function attachLocalStreamToPeer(
  pc: RTCPeerConnection,
  stream: MediaStream,
  wantVideo: boolean,
) {
  const audioTrack = stream.getAudioTracks()[0] || null;
  const videoTrack = wantVideo ? stream.getVideoTracks()[0] || null : null;

  const audioSender = pc.getSenders().find((s) => s.track?.kind === "audio");
  if (audioSender) {
    if (audioTrack) void audioSender.replaceTrack(audioTrack);
  } else {
    const audioTrx = pc.addTransceiver("audio", { direction: "sendrecv" });
    if (audioTrack) void audioTrx.sender.replaceTrack(audioTrack);
  }

  const videoSender = pc.getSenders().find((s) => s.track?.kind === "video");
  if (wantVideo) {
    if (videoSender) {
      if (videoTrack) void videoSender.replaceTrack(videoTrack);
    } else {
      const videoTrx = pc.addTransceiver("video", { direction: "sendrecv" });
      if (videoTrack) void videoTrx.sender.replaceTrack(videoTrack);
    }
  }
}

/** Merge remote tracks into one MediaStream for UI elements. */
export function mergeRemoteTrack(prev: MediaStream | null, event: RTCTrackEvent) {
  const track = event.track;
  if (!track) return prev;

  const streamFromEvent = event.streams?.[0] || null;
  const base = new MediaStream();

  const existing = prev ? [...prev.getTracks()] : [];
  for (const t of existing) {
    if (t.kind !== track.kind && t.readyState !== "ended") {
      base.addTrack(t);
    }
  }

  if (streamFromEvent) {
    for (const t of streamFromEvent.getTracks()) {
      if (t.readyState === "ended") continue;
      const same = base.getTracks().findIndex((x) => x.kind === t.kind);
      if (same >= 0) {
        base.removeTrack(base.getTracks()[same]);
      }
      base.addTrack(t);
    }
    return base;
  }

  base.addTrack(track);
  return base;
}

export class IceCandidateQueue {
  private pending: RTCIceCandidateInit[] = [];

  clear() {
    this.pending = [];
  }

  /** Queue until remote SDP is applied — avoids dropped ICE while ringing. */
  push(candidate: RTCIceCandidateInit, hasRemoteDescription: boolean) {
    if (!candidate) return;
    if (!hasRemoteDescription) {
      this.pending.push(candidate);
      return;
    }
    return candidate;
  }

  async flush(pc: RTCPeerConnection) {
    if (!pc?.remoteDescription) return;
    const batch = [...this.pending];
    this.pending = [];
    for (const raw of batch) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(raw));
      } catch {
        /* ignore stale candidates */
      }
    }
  }
}

export async function applyIceCandidate(
  pc: RTCPeerConnection,
  candidate: RTCIceCandidateInit,
) {
  try {
    await pc.addIceCandidate(new RTCIceCandidate(candidate));
  } catch {
    /* ignore */
  }
}

export async function playMediaElement(el: HTMLMediaElement | null) {
  if (!el) return;
  try {
    el.muted = el.tagName === "VIDEO" && el.hasAttribute("data-local-preview");
    await el.play();
  } catch {
    /* autoplay policy — user gesture on accept usually unlocks */
  }
}
