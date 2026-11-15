import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useMediaBridge } from './hooks/useMediaBridge';
import { useAudioEngine } from './hooks/useAudioEngine';
import { DEMO_TRACKS } from './engine/demoTracks';
import { AtmosphereCanvas } from './components/AtmosphereCanvas';
import { OpticalDiscPlayer } from './components/OpticalDiscPlayer';
import { AsciiStage } from './components/AsciiStage';
import { KineticLyricStage } from './components/KineticLyricStage';
import { EditorialHUD } from './components/EditorialHUD';
import { DevHUD } from './components/DevHUD';

export function App() {
  // 1. Live Windows SMTC & Lively Media Bridge
  const {
    connectionStatus,
    track: liveTrack,
    playback: livePlayback,
    lyrics: liveLyrics,
    setPlayback: setLivePlayback,
  } = useMediaBridge();

  const hasLiveTrack = liveTrack && liveTrack.title && liveTrack.title !== 'WAITING FOR MEDIA';
  const hasLiveLyrics = liveLyrics && Array.isArray(liveLyrics.lines) && liveLyrics.lines.length > 0;

  // 2. Demo Mode State
  const [activeDemoIndex, setActiveDemoIndex] = useState(0); // 0 = Tame Impala - Let It Happen
  const [useDemoMode, setUseDemoMode] = useState(true);

  // Switch to live track automatically if Windows SMTC starts playing a real song
  useEffect(() => {
    if (connectionStatus === 'connected' && hasLiveTrack) {
      setUseDemoMode(false);
    }
  }, [connectionStatus, hasLiveTrack]);

  // Demo playback timing state
  // Start at 14500ms to immediately showcase the reference hero lyric: "and it's coming on"
  const [demoPlayback, setDemoPlayback] = useState({
    status: 'playing',
    positionMs: 14500,
    playbackRate: 1.0,
  });

  const [currentTimeMs, setCurrentTimeMs] = useState(14500);
  const animTimeRef = useRef(14500);
  const lastTickRef = useRef(performance.now());

  // 3. Performance & Diagnostic State
  const [fps, setFps] = useState(60);
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const [isDevHudOpen, setIsDevHudOpen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Active track selection
  const currentTrack = useMemo(() => {
    if (!useDemoMode && hasLiveTrack) {
      return {
        ...liveTrack,
        durationMs: liveTrack.durationMs || 240000,
        bpm: 120,
        personality: {
          id: 'LIVE_ADAPTIVE',
          name: 'Live SMTC Track',
          accentColor: '#C51E43',
          ambientGlow: [0.77, 0.12, 0.26],
          typographyFont: "'Cormorant Garamond', Georgia, serif",
        },
      };
    }
    return DEMO_TRACKS[activeDemoIndex] || DEMO_TRACKS[0];
  }, [useDemoMode, hasLiveTrack, liveTrack, activeDemoIndex]);

  const currentPlayback = useMemo(() => {
    if (!useDemoMode && hasLiveTrack) {
      return livePlayback;
    }
    return demoPlayback;
  }, [useDemoMode, hasLiveTrack, livePlayback, demoPlayback]);

  const isPlaying = currentPlayback.status === 'playing';

  // 4. Audio Engine Integration
  const { audioData } = useAudioEngine(isPlaying, currentTrack.bpm || 120, !useDemoMode && isPlaying);

  // 5. Master Clock Animation Loop
  useEffect(() => {
    let animId;
    let frameCount = 0;
    let lastFpsTime = performance.now();

    const tick = (now) => {
      const delta = now - lastTickRef.current;
      lastTickRef.current = now;

      // Track FPS
      frameCount++;
      if (now - lastFpsTime >= 1000) {
        setFps(Math.round((frameCount * 1000) / (now - lastFpsTime)));
        frameCount = 0;
        lastFpsTime = now;
      }

      if (isPlaying) {
        const rate = currentPlayback.playbackRate || 1.0;
        animTimeRef.current += delta * rate;

        // Loop demo track at end of duration
        const maxDuration = currentTrack.durationMs || 300000;
        if (animTimeRef.current >= maxDuration) {
          animTimeRef.current = 0;
        }

        setCurrentTimeMs(animTimeRef.current);
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, currentPlayback.playbackRate, currentTrack.durationMs]);

  // Sync with live SMTC position updates
  useEffect(() => {
    if (!useDemoMode && typeof livePlayback.positionMs === 'number') {
      animTimeRef.current = livePlayback.positionMs;
      setCurrentTimeMs(livePlayback.positionMs);
    }
  }, [useDemoMode, livePlayback.positionMs]);

  // 6. Find Active Lyric Line and Active Word
  const rawLines = useMemo(() => {
    if (!useDemoMode && hasLiveLyrics) {
      return liveLyrics.lines || [];
    }
    return currentTrack.lines || [];
  }, [useDemoMode, hasLiveLyrics, liveLyrics, currentTrack]);

  let activeLineIndex = 0;
  let activeWordIndex = 0;
  let vocalProgress = 0;

  if (rawLines.length > 0) {
    for (let l = 0; l < rawLines.length; l++) {
      const line = rawLines[l];
      const lineEnd = line.endMs || line.startMs + 6000;
      if (currentTimeMs >= line.startMs && currentTimeMs <= lineEnd) {
        activeLineIndex = l;
        const words = line.words || [];
        for (let w = 0; w < words.length; w++) {
          const word = words[w];
          if (currentTimeMs >= word.startMs && currentTimeMs <= word.endMs) {
            activeWordIndex = w;
            const dur = word.endMs - word.startMs;
            if (dur > 0) vocalProgress = (currentTimeMs - word.startMs) / dur;
            break;
          } else if (currentTimeMs > word.endMs && w === words.length - 1) {
            activeWordIndex = w;
            vocalProgress = 1.0;
          }
        }
        break;
      } else if (currentTimeMs < line.startMs && l === 0) {
        activeLineIndex = 0;
        activeWordIndex = 0;
        break;
      }
    }
  }

  const currentLine = rawLines[activeLineIndex] || { words: [] };
  const lineWords = currentLine.words && currentLine.words.length > 0
    ? currentLine.words
    : (currentLine.text ? currentLine.text.split(/\s+/).map((t) => ({ text: t })) : []);

  const activeWordText = lineWords[activeWordIndex]?.text || '';

  // 7. Transport Handlers
  const togglePlay = useCallback(() => {
    if (!useDemoMode && hasLiveTrack) {
      setLivePlayback((prev) => ({
        ...prev,
        status: prev.status === 'playing' ? 'paused' : 'playing',
      }));
    } else {
      setDemoPlayback((prev) => ({
        ...prev,
        status: prev.status === 'playing' ? 'paused' : 'playing',
      }));
    }
  }, [useDemoMode, hasLiveTrack, setLivePlayback]);

  const seek = useCallback((targetMs) => {
    animTimeRef.current = targetMs;
    setCurrentTimeMs(targetMs);
    if (!useDemoMode && hasLiveTrack) {
      setLivePlayback((prev) => ({ ...prev, positionMs: targetMs }));
    } else {
      setDemoPlayback((prev) => ({ ...prev, positionMs: targetMs }));
    }
  }, [useDemoMode, hasLiveTrack, setLivePlayback]);

  const selectDemoTrack = useCallback((index) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setUseDemoMode(true);
      setActiveDemoIndex(index);
      const targetTime = index === 0 ? 14500 : 0;
      animTimeRef.current = targetTime;
      setCurrentTimeMs(targetTime);
      setDemoPlayback((prev) => ({
        ...prev,
        positionMs: targetTime,
        status: 'playing',
      }));
      setIsTransitioning(false);
    }, 400);
  }, []);

  // 8. Keyboard Controls (Space = Play/Pause, Arrows = Seek, 1-5 = Switch, H = HUD, M = Motion)
  useEffect(() => {
    const handleKey = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        seek(Math.max(0, animTimeRef.current - 5000));
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        seek(Math.min(currentTrack.durationMs || 300000, animTimeRef.current + 5000));
      } else if (e.key >= '1' && e.key <= '5') {
        const idx = parseInt(e.key, 10) - 1;
        if (DEMO_TRACKS[idx]) selectDemoTrack(idx);
      } else if (e.key === 'd' || e.key === 'D') {
        selectDemoTrack((activeDemoIndex + 1) % DEMO_TRACKS.length);
      } else if (e.key === 'h' || e.key === 'H') {
        setIsDevHudOpen((prev) => !prev);
      } else if (e.key === 'm' || e.key === 'M') {
        setIsReducedMotion((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [togglePlay, seek, currentTrack.durationMs, selectDemoTrack, activeDemoIndex]);

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: '#050506',
        position: 'relative',
      }}
    >
      {/* LAYER 00: Subtle Atmospheric Charcoal Grain & Ambient Red Glow */}
      <AtmosphereCanvas
        personality={currentTrack.personality}
        audioData={audioData}
      />

      {/* Main 16:9 Composition Container */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: isTransitioning ? 0.3 : 1.0,
          transition: 'opacity 0.4s ease',
        }}
      >
        {/* ========================================================
            LEFT REGION (40%): The Transparent 3D Optical Disc Player
           ======================================================== */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: '42%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2,
          }}
        >
          <OpticalDiscPlayer
            track={currentTrack}
            playback={currentPlayback}
            audioData={audioData}
            isReducedMotion={isReducedMotion}
          />
        </div>

        {/* ========================================================
            RIGHT REGION (60%): Generative ASCII Art & Kinetic Lyrics
           ======================================================== */}
        <div
          style={{
            position: 'absolute',
            left: '38%',
            top: 0,
            width: '62%',
            height: '100%',
            zIndex: 3,
          }}
        >
          {/* Generative ASCII Artwork Silhouette, Bottom Waves & Orbit */}
          <AsciiStage
            track={currentTrack}
            audioData={audioData}
            personality={currentTrack.personality}
            isReducedMotion={isReducedMotion}
          />

          {/* Kinetic Editorial Display Serif Lyrics Over ASCII Canvas */}
          <KineticLyricStage
            lineWords={lineWords}
            activeWordIndex={activeWordIndex}
            vocalProgress={vocalProgress}
            audioData={audioData}
            personality={currentTrack.personality}
          />
        </div>
      </div>

      {/* ========================================================
          LAYER 03: Minimal Editorial HUD Interface
         ======================================================== */}
      <EditorialHUD
        track={currentTrack}
        playback={{ ...currentPlayback, positionMs: currentTimeMs }}
        audioData={audioData}
        personality={currentTrack.personality}
        demoTracks={DEMO_TRACKS}
        activeTrackIndex={useDemoMode ? activeDemoIndex : -1}
        onSelectTrack={selectDemoTrack}
        onSeek={seek}
        onTogglePlay={togglePlay}
      />

      {/* ========================================================
          LAYER 04: Developer HUD Overlay (Press 'H' to toggle)
         ======================================================== */}
      <DevHUD
        isOpen={isDevHudOpen}
        onClose={() => setIsDevHudOpen(false)}
        fps={fps}
        connectionStatus={connectionStatus}
        mediaSource={useDemoMode ? 'Offline Demo Collection' : (liveTrack.sourceApp || 'Windows SMTC')}
        track={currentTrack}
        playback={{ ...currentPlayback, positionMs: currentTimeMs }}
        activeWord={activeWordText}
        timingPrecision={useDemoMode ? 'word (Enhanced Cue)' : (liveLyrics?.timingPrecision || 'word')}
        audioData={audioData}
        personality={currentTrack.personality}
        isReducedMotion={isReducedMotion}
        onToggleReducedMotion={() => setIsReducedMotion((prev) => !prev)}
        demoTracks={DEMO_TRACKS}
        activeTrackIndex={activeDemoIndex}
        onSelectTrack={selectDemoTrack}
      />
    </div>
  );
}
