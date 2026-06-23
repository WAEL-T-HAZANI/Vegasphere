/** Vegasphere in-app + foreground notification chime. */

const SOUND_URL = "/sounds/vega-chime.wav";
const VOLUME = 0.95;

let audioEl: HTMLAudioElement | null = null;
let lastPlayAt = 0;
let audioUnlocked = false;
let sharedCtx: AudioContext | null = null;
let replayOnNextGesture = false;
const MIN_GAP_MS = 420;

function canPlayAudio() {
  return typeof window !== "undefined" && typeof Audio !== "undefined";
}

function getAudioElement() {
  if (!canPlayAudio()) return null;
  if (!audioEl) {
    audioEl = new Audio(SOUND_URL);
    audioEl.preload = "auto";
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

function queueReplayOnNextGesture() {
  if (typeof window === "undefined" || replayOnNextGesture) return;
  replayOnNextGesture = true;
  const replay = () => {
    replayOnNextGesture = false;
    window.removeEventListener("pointerdown", replay);
    window.removeEventListener("keydown", replay);
    lastPlayAt = 0;
    void playVegasphereNotifySound();
  };
  window.addEventListener("pointerdown", replay, { once: true });
  window.addEventListener("keydown", replay, { once: true });
}

export function isNotificationSoundUnlocked() {
  return audioUnlocked;
}

/** Preload and unlock the chime after a user gesture (browser autoplay policy). */
export function primeNotificationSound() {
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
      audioUnlocked = true;
    }).catch(() => {
      el.volume = prevVolume || VOLUME;
    });
  }
}

/**
 * Distinctive brand chime. Web Audio is the primary audible layer because it is
 * louder and easier to hear than the short WAV asset on some systems.
 */
export async function playVegasphereNotifySound() {
  if (typeof window === "undefined") return false;
  const now = Date.now();
  if (now - lastPlayAt < MIN_GAP_MS) return false;
  lastPlayAt = now;

  const syntheticStarted = await playVegasphereNotifySoundFallback();
  let fileStarted = false;
  const el = getAudioElement();
  if (el) {
    try {
      el.volume = VOLUME;
      el.currentTime = 0;
      const p = el.play();
      if (p && typeof p.then === "function") {
        await p
          .then(() => {
            fileStarted = true;
            audioUnlocked = true;
          })
          .catch(() => undefined);
      } else {
        fileStarted = true;
      }
    } catch {}
  }

  if (!syntheticStarted && !fileStarted) {
    queueReplayOnNextGesture();
  }
  return syntheticStarted || fileStarted;
}

/** Web Audio fallback when file playback is blocked. */
async function playVegasphereNotifySoundFallback() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return false;
    const ctx = sharedCtx && sharedCtx.state !== "closed" ? sharedCtx : new Ctx();
    if (ctx.state === "suspended") {
      await ctx.resume().catch(() => undefined);
    }
    if (ctx.state !== "running") {
      return false;
    }
    audioUnlocked = true;
    const t0 = ctx.currentTime;
    const partials: [number, number][] = [
      [523.25, 0.38],
      [659.25, 0.28],
      [987.77, 0.2],
    ];
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, t0);
    master.gain.exponentialRampToValueAtTime(0.82, t0 + 0.02);
    master.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.72);
    master.connect(ctx.destination);

    for (const [freq, gain] of partials) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(freq, t0);
      o.frequency.exponentialRampToValueAtTime(freq * 1.08, t0 + 0.16);
      g.gain.value = gain;
      o.connect(g);
      g.connect(master);
      o.start(t0);
      o.stop(t0 + 0.74);
    }

    if (ctx !== sharedCtx) {
      setTimeout(() => {
        ctx.close?.();
      }, 900);
    }
    return true;
  } catch {
    return false;
  }
}
