import React, { useState, useEffect, useRef } from 'react';

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export function EditorialHUD({
  track,
  playback,
  audioData = {},
  personality,
  demoTracks = [],
  activeTrackIndex = 0,
  onSelectTrack,
  onSeek,
  onTogglePlay,
}) {
  const [clock, setClock] = useState({ date: 'SUN 15 NOV', hm: '05:09', sec: '25' });
  const [isScrubbing, setIsScrubbing] = useState(false);
  const progressRailRef = useRef(null);

  // 1. Architectural Clock Loop
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setClock({
        date: `${DAYS[now.getDay()]} ${String(now.getDate()).padStart(2, '0')} ${MONTHS[now.getMonth()]}`,
        hm: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
        sec: String(now.getSeconds()).padStart(2, '0'),
      });
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const isPlaying = playback?.status === 'playing';
  const durationMs = track?.durationMs || 300000;
  const positionMs = playback?.positionMs || 0;
  const progressRatio = Math.max(0, Math.min(1, positionMs / Math.max(1, durationMs)));

  const formatTime = (ms) => {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const handleRailClick = (e) => {
    if (!progressRailRef.current) return;
    const rect = progressRailRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    if (onSeek) onSeek(ratio * durationMs);
  };

  const accentColor = personality?.accentColor || '#C51E43';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 10,
        userSelect: 'none',
      }}
    >
      {/* ========================================================
          TOP-LEFT: Architectural Date & Serif Clock
         ======================================================== */}
      <div
        style={{
          position: 'absolute',
          top: '36px',
          left: '48px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
        }}
      >
        <span
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: '11px',
            letterSpacing: '0.34em',
            fontWeight: 500,
            color: '#8b8a92',
            textTransform: 'uppercase',
            marginBottom: '4px',
          }}
        >
          {clock.date}
        </span>

        <div style={{ display: 'flex', alignItems: 'flex-start', lineHeight: 0.9 }}>
          <span
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontStyle: 'italic',
              fontWeight: 400,
              fontSize: '52px',
              letterSpacing: '-0.02em',
              color: '#f4f3f2',
            }}
          >
            {clock.hm}
          </span>
          <span
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: '14px',
              fontWeight: 500,
              color: '#72707a',
              marginLeft: '6px',
              marginTop: '4px',
              letterSpacing: '0.06em',
            }}
          >
            {clock.sec}
          </span>
        </div>
      </div>

      {/* ========================================================
          TOP-RIGHT: Active Track Attribution & Tracklist Index
         ======================================================== */}
      <div
        style={{
          position: 'absolute',
          top: '36px',
          right: '48px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '40px',
        }}
      >
        {/* Track Title & Artist & Pulse Dot */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: accentColor,
              boxShadow: isPlaying ? `0 0 10px ${accentColor}` : 'none',
              display: 'inline-block',
              transition: 'background-color 0.3s ease',
            }}
          />

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: '15px',
                fontWeight: 700,
                letterSpacing: '0.18em',
                color: '#f4f3f2',
                textTransform: 'uppercase',
              }}
            >
              {track?.title || 'LET IT HAPPEN'}
            </span>
            <span
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: '10px',
                fontWeight: 500,
                letterSpacing: '0.22em',
                color: '#8b8a92',
                textTransform: 'uppercase',
                marginTop: '4px',
              }}
            >
              {track?.artist || 'TAME IMPALA'}
            </span>
          </div>
        </div>

        {/* Tracklist Indices: [ 01 ], [ 02 ], [ 03 ], [ 04 ▶ ], etc. */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '3px',
            pointerEvents: 'auto',
          }}
        >
          {demoTracks.map((dt, idx) => {
            const isActive = idx === activeTrackIndex;
            return (
              <button
                key={dt.id || idx}
                onClick={() => onSelectTrack && onSelectTrack(idx)}
                style={{
                  background: 'none',
                  border: 'none',
                  outline: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: '10px',
                  fontWeight: isActive ? 600 : 400,
                  letterSpacing: '0.16em',
                  color: isActive ? '#f4f3f2' : '#52505a',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'color 0.2s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
                onMouseLeave={(e) => (e.currentTarget.style.color = isActive ? '#f4f3f2' : '#52505a')}
              >
                <span>[ {dt.index || `0${idx + 1}`} {isActive ? '▶' : ''} ]</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================
          BOTTOM-LEFT: Mini Album Thumbnail, Title, Mini Equalizer,
          and Hairline Scrubbable Progress Line
         ======================================================== */}
      <div
        style={{
          position: 'absolute',
          bottom: '36px',
          left: '48px',
          width: '320px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        {/* Thumbnail, Metadata, Mini Equalizer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* Mini Album Art Square */}
          <div
            onClick={onTogglePlay}
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '2px',
              overflow: 'hidden',
              flexShrink: 0,
              backgroundColor: '#111116',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              boxShadow: `0 0 16px ${accentColor}33`,
              position: 'relative',
              cursor: 'pointer',
              pointerEvents: 'auto',
            }}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            <img
              src={track?.thumbnail || track?.coverArt || '/assets/demo/thumb_let_it_happen.png'}
              alt={track?.title}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
            />
          </div>

          {/* Title & Artist */}
          <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, overflow: 'hidden' }}>
            <span
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: '11.5px',
                fontWeight: 600,
                letterSpacing: '0.18em',
                color: '#f4f3f2',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {track?.title || 'LET IT HAPPEN'}
            </span>
            <span
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: '9.5px',
                fontWeight: 500,
                letterSpacing: '0.16em',
                color: '#8b8a92',
                textTransform: 'uppercase',
                marginTop: '2px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {track?.artist || 'TAME IMPALA'}
            </span>
          </div>

          {/* Mini Real-Time Audio Visualizer Bars */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: '2px',
              height: '14px',
              flexShrink: 0,
            }}
          >
            {[0.2, 0.5, 0.8, 0.4, 0.9, 0.6, 0.3, 0.7, 0.4].map((mult, i) => {
              const bass = audioData.bass || 0.3;
              const barHeight = isPlaying
                ? Math.max(2, Math.min(14, Math.round(14 * mult * (0.6 + bass * 0.8))))
                : 2;
              return (
                <div
                  key={i}
                  style={{
                    width: '1.5px',
                    height: `${barHeight}px`,
                    backgroundColor: i === 4 ? accentColor : '#a2a1a8',
                    borderRadius: '0.5px',
                    transition: 'height 0.08s ease',
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Minimal Progress Rail & Timestamps */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {/* Scrubbable Rail */}
          <div
            ref={progressRailRef}
            onClick={handleRailClick}
            style={{
              width: '100%',
              height: '14px',
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              pointerEvents: 'auto',
            }}
          >
            {/* Background Line */}
            <div
              style={{
                width: '100%',
                height: '1px',
                backgroundColor: 'rgba(255, 255, 255, 0.18)',
                position: 'relative',
              }}
            >
              {/* Fill Line */}
              <div
                style={{
                  height: '100%',
                  width: `${progressRatio * 100}%`,
                  backgroundColor: '#f4f3f2',
                }}
              />

              {/* Glowing Handle Bead */}
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: `${progressRatio * 100}%`,
                  transform: 'translate(-50%, -50%)',
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: '#ffffff',
                  boxShadow: '0 0 8px rgba(255, 255, 255, 0.9)',
                }}
              />
            </div>
          </div>

          {/* Timestamps */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: '10px',
              fontWeight: 500,
              letterSpacing: '0.12em',
              color: '#72707a',
            }}
          >
            <span>{formatTime(positionMs)}</span>
            <span>{formatTime(durationMs)}</span>
          </div>
        </div>
      </div>

      {/* ========================================================
          BOTTOM-RIGHT: Stacked Editorial Metadata & Crosshairs
         ======================================================== */}
      <div
        style={{
          position: 'absolute',
          bottom: '36px',
          right: '48px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: '3px',
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: '9.5px',
          letterSpacing: '0.24em',
          fontWeight: 500,
          color: '#72707a',
          textTransform: 'uppercase',
        }}
      >
        <span>ALBUM / {track?.album || 'CURRENTS'}</span>
        <span>YEAR / {track?.year || '2015'}</span>
        <span>GENRE / {track?.genre || 'PSYCHEDELIC ROCK'}</span>
      </div>
    </div>
  );
}
