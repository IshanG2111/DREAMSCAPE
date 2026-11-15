import React, { useRef, useState } from 'react';

export function BottomDock({
  track,
  playback,
  onSeek,
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const railRef = useRef(null);

  const durationMs = track.durationMs || 240000;
  const positionMs = playback.positionMs || 0;
  const progressRatio = Math.max(0, Math.min(1, positionMs / Math.max(1, durationMs)));
  const progressPercent = (progressRatio * 100).toFixed(2);

  const formatTime = (ms) => {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const handleScrub = (e) => {
    if (!railRef.current) return;
    const rect = railRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    if (onSeek) onSeek(ratio * durationMs);
  };

  return (
    <div
      ref={railRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsScrubbing(false);
      }}
      onMouseDown={(e) => {
        setIsScrubbing(true);
        handleScrub(e);
      }}
      onMouseMove={(e) => {
        if (isScrubbing) handleScrub(e);
      }}
      onMouseUp={() => setIsScrubbing(false)}
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: isHovered || isScrubbing ? '8px' : '2px',
        cursor: 'pointer',
        zIndex: 10,
        background: 'rgba(255, 255, 255, 0.04)',
        transition: 'height 0.2s ease',
      }}
      title="Seek track position"
    >
      {/* Hairline Progress Fill */}
      <div
        style={{
          height: '100%',
          width: `${progressPercent}%`,
          background: 'linear-gradient(90deg, rgba(56, 189, 248, 0.4), var(--glow-primary, #38bdf8))',
          boxShadow: '0 0 10px var(--glow-primary, #38bdf8)',
          transition: isScrubbing ? 'none' : 'width 0.1s linear',
        }}
      />

      {/* Discrete Floating Hover Time (Only visible when mouse touches the bottom edge) */}
      {(isHovered || isScrubbing) && (
        <div
          style={{
            position: 'absolute',
            bottom: '16px',
            right: '48px',
            fontSize: '9.5px',
            letterSpacing: '0.18em',
            fontVariantNumeric: 'tabular-nums',
            color: '#71717a',
            fontFamily: "'Space Grotesk', sans-serif",
            pointerEvents: 'none',
          }}
        >
          {formatTime(positionMs)} / {formatTime(durationMs)}
        </div>
      )}
    </div>
  );
}
