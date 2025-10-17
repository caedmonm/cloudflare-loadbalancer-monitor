// ---- Audio (Web Audio API) ----
let _audioCtx: AudioContext | null = null;
export const getAudioCtx = () => {
  if (!_audioCtx)
    _audioCtx = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
  return _audioCtx;
};

export const playBeep = async (
  freq: number,
  durationMs: number,
  type: OscillatorType = "sine"
) => {
  const ctx = getAudioCtx();
  // If the context was suspended (before user gesture), try to resume silently
  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {}
  }
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = 0.08; // nice and quiet
  osc.connect(gain).connect(ctx.destination);
  const now = ctx.currentTime;
  osc.start(now);
  osc.stop(now + durationMs / 1000);
};

export const playOnlineSound = async () => {
  // bright, quick chirp
  await playBeep(880, 120, "triangle");
  await playBeep(1320, 100, "triangle");
};

export const playOfflineSound = async () => {
  // lower, a bit longer
  await playBeep(300, 220, "sawtooth");
};
