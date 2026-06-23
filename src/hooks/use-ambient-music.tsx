import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Procedural ambient background music using the Web Audio API.
 * Generates a soft evolving pad — no asset needed, tiny CPU cost.
 */
export function useAmbientMusic(defaultOn = false) {
  const [playing, setPlaying] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const nodesRef = useRef<{ osc: OscillatorNode; gain: GainNode; lfo: OscillatorNode; lfoGain: GainNode }[]>([]);

  const stop = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return setPlaying(false);
    const m = masterRef.current;
    if (m) {
      m.gain.cancelScheduledValues(ctx.currentTime);
      m.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
    }
    setTimeout(() => {
      nodesRef.current.forEach(({ osc, lfo }) => {
        try { osc.stop(); } catch {}
        try { lfo.stop(); } catch {}
      });
      nodesRef.current = [];
      try { ctx.close(); } catch {}
      ctxRef.current = null;
      masterRef.current = null;
    }, 700);
    setPlaying(false);
  }, []);

  const start = useCallback(async () => {
    if (ctxRef.current) return;
    const Ctor = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext | undefined;
    if (!Ctor) return;
    const ctx = new Ctor();
    ctxRef.current = ctx;
    try { await ctx.resume(); } catch {}

    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    masterRef.current = master;

    // Soft lowpass to keep it mellow
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1100;
    filter.Q.value = 0.6;
    filter.connect(master);

    // Chord: A minor 9 — A2, E3, C4, G4 — quiet sine pad
    const freqs = [110, 164.81, 261.63, 392.0];
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      osc.type = i < 2 ? "sine" : "triangle";
      osc.frequency.value = f;

      const gain = ctx.createGain();
      gain.gain.value = 0.08;

      // Slow LFO for movement
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.05 + i * 0.03;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.04;
      lfo.connect(lfoGain).connect(gain.gain);

      osc.connect(gain).connect(filter);
      osc.start();
      lfo.start();
      nodesRef.current.push({ osc, gain, lfo, lfoGain });
    });

    // Fade in
    master.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 1.5);
    setPlaying(true);
  }, []);

  const toggle = useCallback(() => {
    if (ctxRef.current) stop();
    else void start();
  }, [start, stop]);

  useEffect(() => {
    if (defaultOn) void start();
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { playing, toggle, start, stop };
}