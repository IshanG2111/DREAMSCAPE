import React, { useState, useEffect } from 'react';

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export function TopBarHUD({
  track,
  playback,
  connectionStatus = 'offline',
}) {
  const [timeStr, setTimeStr] = useState({ date: 'THU 12 NOV', hm: '04:20', sec: '00' });

  // Update Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr({
        date: `${DAYS[now.getDay()]} ${String(now.getDate()).padStart(2, '0')} ${MONTHS[now.getMonth()]}`,
        hm: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
        sec: String(now.getSeconds()).padStart(2, '0'),
      });
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const hasLiveTrack = track && track.title && track.title !== 'WAITING FOR MEDIA';

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        padding: '36px 48px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        zIndex: 10,
        pointerEvents: 'none',
      }}
    >
      {/* 1. Top-Left: Pure Editorial Typographic Clock (Zero Containers / Zero Pills) */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            fontSize: '9.5px',
            letterSpacing: '0.32em',
            textTransform: 'uppercase',
            color: '#71717a',
            fontWeight: 500,
            marginBottom: '4px',
            fontFamily: "'Space Grotesk', sans-serif",
          }}
        >
          {timeStr.date}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', lineHeight: 1 }}>
          <span
            style={{
              fontSize: '44px',
              fontWeight: 300,
              letterSpacing: '-0.02em',
              color: '#f4f4f5',
              lineHeight: 0.9,
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontStyle: 'italic',
            }}
          >
            {timeStr.hm}
          </span>
          <span
            style={{
              fontSize: '14px',
              fontWeight: 300,
              color: '#52525b',
              marginLeft: '8px',
              letterSpacing: '0.08em',
              fontVariantNumeric: 'tabular-nums',
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            {timeStr.sec}
          </span>
        </div>
      </div>

      {/* 2. Top-Right: Pure Understated Track Attribution (Zero Pills / Zero Borders) */}
      {hasLiveTrack && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            textAlign: 'right',
          }}
        >
          {/* Subtle Live Media Pulse Dot */}
          <span
            style={{
              width: '4px',
              height: '4px',
              borderRadius: '50%',
              backgroundColor: connectionStatus === 'connected' ? '#22c55e' : '#71717a',
              boxShadow: connectionStatus === 'connected' ? '0 0 8px rgba(34, 197, 94, 0.8)' : 'none',
              display: 'inline-block',
              flexShrink: 0,
            }}
          />

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span
              style={{
                fontSize: '10px',
                letterSpacing: '0.24em',
                fontWeight: 600,
                color: '#e4e4e7',
                textTransform: 'uppercase',
                fontFamily: "'Space Grotesk', sans-serif",
                maxWidth: '320px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {track.title}
            </span>
            <span
              style={{
                fontSize: '9px',
                letterSpacing: '0.18em',
                color: '#71717a',
                textTransform: 'uppercase',
                fontFamily: "'Space Grotesk', sans-serif",
                marginTop: '2px',
                maxWidth: '260px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {track.artist}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
