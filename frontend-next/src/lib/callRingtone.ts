/** Looping incoming-call ringtone — distinct from the message chime. */

const SOUND_URL = "/sounds/vega-incoming-call.wav";
const VOLUME = 0.88;
const RETRY_MS = 900;

let audioEl: HTMLAudioElement | null = null;
let synthStop: (() => void) | null = null;
let playing = false;
let ringingRequested = false;
let audioUnlocked = false;
let sharedCtx: AudioContext | null = null;
let retryTimer: ReturnType<typeof setInterval> | null = null;
/** Bumped on stop so in-flight async playback cannot restart after accept/reject. */
let playbackGeneration = 0;

function canPlayAudio() {
  return typeof window !== "undefined" && typeof Audio !== "undefined";
}

function getAudioElement() {
  if (!canPlayAudio()) return null;
  if (!audioEl) {
    audioEl = new Audio(SOUND_URL);
    audioEl.preload = "auto";
    audioEl.loop = true;
  }
  return audioEl;
}

async function getSharedAudioContext() {
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctx) return null;
  if (!sharedCtx || sharedCtx.state === "closed") {
    sharedCtx = new Ctx();
  }
  if (sharedCtx.state === "suspended") {
    try {
      await sharedCtx.resume();
    } catch {
      /* ignore */
    }
  }
  return sharedCtx;
}

function clearRetryTimer() {
  if (retryTimer) clearInterval(retryTimer);
  retryTimer = null;
}

function scheduleRetryWhileRinging() {
  clearRetryTimer();
  if (!ringingRequested) return;
  retryTimer = setInterval(() => {
    if (!ringingRequested) {
      clearRetryTimer();
      return;
    }
    if (isAudible()) return;
    void kickCallRingtonePlayback();
  }, RETRY_MS);
}

function isAudible() {
  const el = audioEl;
  if (el && !el.paused && el.currentTime > 0) return true;
  return Boolean(synthStop);
}

function afterUnlock() {
  audioUnlocked = true;
  if (ringingRequested) {
    void kickCallRingtonePlayback();
  }
}

/** Unlock audio output after a user gesture (browser autoplay policy). */
export function primeCallRingtone() {
  if (!canPlayAudio()) return;
  const el = getAudioElement();
  if (!el) return;
  try {
    el.load();
  } catch {
    /* ignore */
  }
  void getSharedAudioContext();
  if (audioUnlocked) return;
  const prevVolume = el.volume;
  el.volume = 0.001;
  el.currentTime = 0;
  const p = el.play();
  if (p && typeof p.then === "function") {
    p.then(() => {
      el.pause();
      el.currentTime = 0;
      el.volume = prevVolume || VOLUME;
      el.loop = true;
      afterUnlock();
    }).catch(() => {
      el.volume = prevVolume || VOLUME;
    });
  }
}

function pauseWavElement() {
  const el = audioEl;
  if (!el) return;
  try {
    el.loop = false;
    el.pause();
    el.currentTime = 0;
  } catch {
    /* ignore */
  }
}

function stopSynthLoop() {
  synthStop?.();
  synthStop = null;
}

function abortStalePlayback(gen: number) {
  if (gen === playbackGeneration && ringingRequested) return false;
  pauseWavElement();
  stopSynthLoop();
  playing = false;
  return true;
}

function startSynthLoop() {
  stopSynthLoop();
  void (async () => {
    const startGen = playbackGeneration;
    try {
      const ctx = await getSharedAudioContext();
      if (!ctx || !ringingRequested || startGen !== playbackGeneration) return;

      let timer: ReturnType<typeof setInterval> | null = null;
      let closed = false;

      const playChimePair = (baseFreq: number, t0: number) => {
        const partials: [number, number][] = [
          [baseFreq, 0.42],
          [baseFreq * 1.2599, 0.24],
        ];
        const master = ctx.createGain();
        master.gain.setValueAtTime(0.0001, t0);
        master.gain.exponentialRampToValueAtTime(VOLUME * 0.75, t0 + 0.012);
        master.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.85);
        master.connect(ctx.destination);

        for (const [freq, gain] of partials) {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = "triangle";
          o.frequency.setValueAtTime(freq, t0);
          g.gain.value = gain;
          o.connect(g);
          g.connect(master);
          o.start(t0);
          o.stop(t0 + 0.88);
        }
      };

      const playPattern = () => {
        if (closed || !ringingRequested || startGen !== playbackGeneration) return;
        const t0 = ctx.currentTime;
        playChimePair(523.25, t0);
        playChimePair(783.99, t0 + 0.85);
        playChimePair(587.33, t0 + 1.7);
        playChimePair(659.25, t0 + 2.55);
      };

      playPattern();
      timer = setInterval(playPattern, 3400);

      synthStop = () => {
        closed = true;
        if (timer) clearInterval(timer);
        timer = null;
      };
    } catch {
      /* ignore */
    }
  })();
}

async function tryPlayWav(): Promise<boolean> {
  const el = getAudioElement();
  if (!el) return false;
  try {
    el.volume = VOLUME;
    el.currentTime = 0;
    el.loop = true;
    await el.play();
    return true;
  } catch {
    return false;
  }
}

async function kickCallRingtonePlayback() {
  if (!ringingRequested) return;
  const gen = ++playbackGeneration;
  playing = true;
  stopSynthLoop();
  const wavOk = await tryPlayWav();
  if (abortStalePlayback(gen)) return;
  if (wavOk) return;
  if (ringingRequested) startSynthLoop();
}

/** User gesture while ringing — unlock and (re)start playback. */
export function kickCallRingtoneOnGesture() {
  primeCallRingtone();
  if (!ringingRequested) return;
  void kickCallRingtonePlayback();
}

/** Start looping ringtone (restarts if already playing). */
export function startIncomingCallRingtone() {
  ringingRequested = true;
  playing = true;
  scheduleRetryWhileRinging();
  void kickCallRingtonePlayback();
}

/** Stop ringtone immediately (accept, reject, hangup, or call ended). */
export function stopIncomingCallRingtone() {
  playbackGeneration += 1;
  ringingRequested = false;
  playing = false;
  clearRetryTimer();
  stopSynthLoop();
  pauseWavElement();
}

export function isIncomingCallRingtonePlaying() {
  return ringingRequested;
}

export function isCallRingtoneUnlocked() {
  return audioUnlocked;
}
