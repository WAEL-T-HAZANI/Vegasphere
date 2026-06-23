import { normalizeAudioMime } from "@/lib/messageFormat";

type MicMeter = {
  rafId: number | null;
  source: MediaStreamAudioSourceNode | null;
  analyser: AnalyserNode | null;
  gain: GainNode | null;
};

type RecordingResult = {
  blob: Blob;
  mimeType: string;
  seconds: number;
  elapsedMs: number;
};

let sharedAudioCtx: AudioContext | null = null;

function getSharedAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!sharedAudioCtx || sharedAudioCtx.state === "closed") {
    sharedAudioCtx = new Ctx();
  }
  return sharedAudioCtx;
}

export function stopMicLevelMeter(state: MicMeter | null) {
  if (state?.rafId) {
    cancelAnimationFrame(state.rafId);
  }
  try {
    state?.source?.disconnect?.();
  } catch {
    /* ignore */
  }
  try {
    state?.analyser?.disconnect?.();
  } catch {
    /* ignore */
  }
  try {
    state?.gain?.disconnect?.();
  } catch {
    /* ignore */
  }
}

export function startMicLevelMeter(
  stream: MediaStream,
  onLevel: (_level: number) => void,
): MicMeter | null {
  const ctx = getSharedAudioContext();
  if (!ctx || !stream) return null;

  const meter: MicMeter = {
    rafId: null,
    source: null,
    analyser: null,
    gain: null,
  };

  const boot = async () => {
    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.4;

    const gain = ctx.createGain();
    gain.gain.value = 0;

    // Chrome runs the graph only when it reaches destination (silent output).
    source.connect(analyser);
    analyser.connect(gain);
    gain.connect(ctx.destination);

    meter.source = source;
    meter.analyser = analyser;
    meter.gain = gain;

    const bufferLength = analyser.fftSize;
    const data = new Uint8Array(bufferLength);

    const tick = () => {
      if (!meter.analyser) return;
      if (ctx.state === "suspended") {
        void ctx.resume();
      }

      meter.analyser.getByteTimeDomainData(data);

      let sum = 0;
      for (let i = 0; i < bufferLength; i += 1) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }

      const rms = Math.sqrt(sum / bufferLength);
      onLevel(Math.min(100, Math.round(rms * 500)));
      meter.rafId = requestAnimationFrame(tick);
    };

    meter.rafId = requestAnimationFrame(tick);
  };

  void boot();
  return meter;
}

export async function openMicStream(): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({ audio: true, video: false });
}

export function stopStream(stream: MediaStream | null) {
  try {
    stream?.getTracks?.().forEach((track) => track.stop());
  } catch {
    /* ignore */
  }
}

export function createMediaRecorder(stream: MediaStream) {
  if (typeof MediaRecorder === "undefined") {
    throw new Error("MediaRecorder unsupported");
  }

  const recorder = new MediaRecorder(stream);
  return {
    recorder,
    mimeType: normalizeAudioMime(recorder.mimeType || "audio/webm"),
  };
}

function buildRecordingBlob(
  chunks: Blob[],
  mimeType: string,
): Blob | null {
  const parts = chunks.filter((part) => part && part.size > 0);
  if (!parts.length) return null;
  const type = normalizeAudioMime(
    mimeType || (parts[0]?.type ?? "") || "audio/webm",
  );
  return new Blob(parts, { type });
}

export function waitForRecording(
  recorder: MediaRecorder | null,
  getChunks: () => Blob[],
  startedAtMs: number,
): Promise<RecordingResult> {
  return new Promise((resolve, reject) => {
    if (!recorder) {
      reject(new Error("No recorder"));
      return;
    }

    const finalize = () => {
      const chunks = getChunks();
      const elapsedMs = Math.max(0, performance.now() - startedAtMs);
      const mimeType = normalizeAudioMime(
        recorder.mimeType ||
          (chunks[0] instanceof Blob ? chunks[0].type : "") ||
          "audio/webm",
      );
      const blob = buildRecordingBlob(chunks, mimeType);
      const seconds = Math.max(1, Math.round(elapsedMs / 1000));

      resolve({
        blob: blob || new Blob([], { type: mimeType }),
        mimeType,
        seconds,
        elapsedMs,
      });
    };

    if (recorder.state === "inactive") {
      finalize();
      return;
    }

    recorder.onstop = () => {
      window.setTimeout(finalize, 150);
    };

    try {
      if (typeof recorder.requestData === "function") {
        recorder.requestData();
      }
      recorder.stop();
    } catch (error) {
      reject(error);
    }
  });
}
