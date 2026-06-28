import { useRef, useCallback } from 'react';

type SoundType = 'place' | 'pass' | 'win' | 'error';

function createBeep(
  ctx: AudioContext,
  freq: number,
  duration: number,
  type: OscillatorType = 'sine',
  vol = 0.3,
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  gain.gain.setValueAtTime(vol, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

export function useSound(enabled: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);

  const getCtx = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
    }
    return ctxRef.current;
  }, []);

  const play = useCallback((sound: SoundType) => {
    if (!enabled) return;
    try {
      const ctx = getCtx();
      switch (sound) {
        case 'place':
          createBeep(ctx, 440, 0.12, 'triangle', 0.25);
          setTimeout(() => createBeep(ctx, 660, 0.08, 'triangle', 0.15), 60);
          break;
        case 'pass':
          createBeep(ctx, 300, 0.2, 'sine', 0.2);
          break;
        case 'win':
          [0, 100, 200, 350].forEach((t, i) => {
            const freqs = [523, 659, 784, 1047];
            setTimeout(() => createBeep(ctx, freqs[i], 0.3, 'triangle', 0.3), t);
          });
          break;
        case 'error':
          createBeep(ctx, 200, 0.15, 'sawtooth', 0.15);
          break;
      }
    } catch (_) {
      // AudioContext may be unavailable in some environments
    }
  }, [enabled, getCtx]);

  return play;
}
