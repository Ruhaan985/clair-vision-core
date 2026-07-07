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
    filter.frequency.value = 1600;
    filter.Q.value = 0.4;

    // Gentle reverb-ish tail via convolver with generated impulse response
    const convolver = ctx.createConvolver();
    const irLen = Math.floor(ctx.sampleRate * 3.2);
    const ir = ctx.createBuffer(2, irLen, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = ir.getChannelData(ch);
      for (let i = 0; i < irLen; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / irLen, 2.4);
      }
    }
    convolver.buffer = ir;

    const wet = ctx.createGain();
    wet.gain.value = 0.55;
    const dry = ctx.createGain();
    dry.gain.value = 0.7;

    filter.connect(dry).connect(master);
    filter.connect(convolver).connect(wet).connect(master);

    // Wider ambient voicing: A minor 9 spread across octaves for a lush pad
    const freqs = [55, 110, 164.81, 261.63, 329.63, 392.0, 493.88];
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      osc.type = i < 2 ? "sine" : i < 5 ? "triangle" : "sine";
      osc.frequency.value = f;
      // Subtle detune per voice for chorus-like shimmer
      osc.detune.value = (i - 3) * 6;

      const gain = ctx.createGain();
      gain.gain.value = 0.11;

      // Slow LFO for movement
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.04 + i * 0.022;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.05;
      lfo.connect(lfoGain).connect(gain.gain);

      osc.connect(gain).connect(filter);
      osc.start();
      lfo.start();
      nodesRef.current.push({ osc, gain, lfo, lfoGain });
    });

    // Slow filter sweep for evolving ambient character
    filter.frequency.setValueAtTime(900, ctx.currentTime);
    filter.frequency.linearRampToValueAtTime(1800, ctx.currentTime + 14);

    // Fade in — louder overall
    master.gain.linearRampToValueAtTime(0.55, ctx.currentTime + 2.5);
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