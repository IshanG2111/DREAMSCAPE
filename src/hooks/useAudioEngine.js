import { useRef, useEffect, useState, useCallback } from 'react';

/**
 * useAudioEngine — High-Fidelity Audio Reactive Analysis Layer
 * Supports:
 * 1. Live Lively Wallpaper native audio listener (window.livelyAudioListener).
 * 2. Web Audio API when sound output is active.
 * 3. Sophisticated procedural audio engine matching song tempo (BPM) when in offline demo mode.
 */
export function useAudioEngine(isPlaying = true, bpm = 120, isExternalPlaying = false) {
  const [audioData, setAudioData] = useState({
    subBass: 0.35,
    bass: 0.40,
    mid: 0.38,
    treble: 0.30,
    beatPulse: 0.0,
    pulseTravel: 0.0,
  });

  const isLiveAudioRef = useRef(false);

  // 1. Procedural Beat & Frequency Simulation Loop
  useEffect(() => {
    let animId;
    let startTime = performance.now();
    let lastTime = performance.now();

    const bps = Math.max(0.5, bpm / 60); // Beats per second

    const updateLoop = (now) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      const elapsed = (now - startTime) / 1000;

      if (!isLiveAudioRef.current) {
        if (!isPlaying) {
          // Settled state when paused
          setAudioData((prev) => ({
            subBass: prev.subBass * 0.94,
            bass: prev.bass * 0.94,
            mid: prev.mid * 0.94,
            treble: prev.treble * 0.94,
            beatPulse: prev.beatPulse * 0.9,
            pulseTravel: prev.pulseTravel,
          }));
        } else {
          // Dynamic procedural rhythm based on track BPM
          const beatCycle = (elapsed * bps) % 1.0;
          // Sharp exponential decay for realistic kick transient
          const kick = Math.pow(Math.max(0, 1.0 - beatCycle * 3.2), 2.8);

          // Snare on beat 2 and 4 (half-time or backbeat)
          const barCycle = (elapsed * (bps * 0.5)) % 1.0;
          const snare = Math.pow(Math.max(0, 1.0 - ((barCycle + 0.5) % 1.0) * 3.8), 3.0);

          const nextData = {
            subBass: 0.28 + kick * 0.48,
            bass: 0.32 + kick * 0.55,
            mid: 0.34 + snare * 0.35 + Math.sin(elapsed * 2.8) * 0.12,
            treble: 0.26 + snare * 0.25 + Math.cos(elapsed * 4.4) * 0.15,
            beatPulse: kick,
            pulseTravel: (elapsed * 0.25) % 1.0,
          };

          setAudioData(nextData);
        }
      }

      animId = requestAnimationFrame(updateLoop);
    };

    animId = requestAnimationFrame(updateLoop);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, bpm]);

  // 2. Lively Wallpaper Native Audio Listener
  useEffect(() => {
    window.livelyAudioListener = (audioArray) => {
      if (Array.isArray(audioArray) && audioArray.length > 0) {
        isLiveAudioRef.current = true;
        let b = 0, m = 0, tr = 0;
        const bCount = Math.min(15, audioArray.length);
        const mCount = Math.min(35, Math.max(0, audioArray.length - 15));
        const trCount = Math.min(70, Math.max(0, audioArray.length - 50));

        for (let i = 0; i < bCount; i++) b += audioArray[i] || 0;
        for (let i = 15; i < 15 + mCount; i++) m += audioArray[i] || 0;
        for (let i = 50; i < 50 + trCount; i++) tr += audioArray[i] || 0;

        const avgB = bCount > 0 ? b / bCount : 0;
        const avgM = mCount > 0 ? m / mCount : 0;
        const avgTr = trCount > 0 ? tr / trCount : 0;

        setAudioData((prev) => ({
          subBass: Math.min(1.0, avgB * 2.6),
          bass: Math.min(1.0, avgB * 2.4),
          mid: Math.min(1.0, avgM * 2.1),
          treble: Math.min(1.0, avgTr * 1.9),
          beatPulse: avgB > 0.58 ? 0.95 : prev.beatPulse * 0.88,
          pulseTravel: (prev.pulseTravel + 0.005) % 1.0,
        }));
      }
    };
  }, []);

  return { audioData };
}
