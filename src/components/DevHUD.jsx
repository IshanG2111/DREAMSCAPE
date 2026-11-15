import React from 'react';

export function DevHUD({
  isOpen,
  onClose,
  fps = 60,
  connectionStatus = 'offline',
  mediaSource = 'Demo',
  track,
  playback,
  activeWord = '',
  timingPrecision = 'word',
  audioData = {},
  personality,
  isReducedMotion,
  onToggleReducedMotion,
  demoTracks = [],
  activeTrackIndex = 0,
  onSelectTrack,
}) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '580px',
        maxHeight: '85vh',
        overflowY: 'auto',
        backgroundColor: 'rgba(12, 13, 18, 0.94)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '8px',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)',
        zIndex: 100,
        padding: '20px 24px',
        fontFamily: "'Space Grotesk', monospace",
        fontSize: '11px',
        color: '#e4e4e7',
        userSelect: 'none',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          paddingBottom: '12px',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#22c55e',
              boxShadow: '0 0 8px #22c55e',
            }}
          />
          <span style={{ fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
            DREAMSCAPE DEVELOPER HUD
          </span>
        </div>
        <span style={{ color: '#71717a', fontSize: '10px' }}>Press 'H' to hide</span>
      </div>

      {/* Grid of Diagnostics */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '12px 20px',
          marginBottom: '18px',
        }}
      >
        <div>
          <span style={{ color: '#71717a' }}>ENGINE / FPS:</span>
          <span style={{ marginLeft: '8px', color: '#22c55e', fontWeight: 600 }}>{fps} FPS (WebGL 2.0)</span>
        </div>

        <div>
          <span style={{ color: '#71717a' }}>MEDIA SOURCE:</span>
          <span style={{ marginLeft: '8px', color: '#38bdf8' }}>{mediaSource}</span>
        </div>

        <div>
          <span style={{ color: '#71717a' }}>BRIDGE STATUS:</span>
          <span style={{ marginLeft: '8px', color: connectionStatus === 'connected' ? '#22c55e' : '#f59e0b' }}>
            {connectionStatus.toUpperCase()}
          </span>
        </div>

        <div>
          <span style={{ color: '#71717a' }}>TIMING PRECISION:</span>
          <span style={{ marginLeft: '8px', color: '#a78bfa' }}>{timingPrecision.toUpperCase()}</span>
        </div>

        <div>
          <span style={{ color: '#71717a' }}>PLAYBACK STATE:</span>
          <span style={{ marginLeft: '8px', color: '#f43f5e' }}>{playback?.status?.toUpperCase() || 'PAUSED'}</span>
        </div>

        <div>
          <span style={{ color: '#71717a' }}>ACTIVE WORD:</span>
          <span style={{ marginLeft: '8px', color: '#ffffff', fontWeight: 700 }}>"{activeWord || '-'}"</span>
        </div>

        <div>
          <span style={{ color: '#71717a' }}>VISUAL PERSONALITY:</span>
          <span style={{ marginLeft: '8px', color: '#fbbf24' }}>{personality?.name || 'Currents'}</span>
        </div>

        <div>
          <span style={{ color: '#71717a' }}>ASCII GRID:</span>
          <span style={{ marginLeft: '8px' }}>96 × 68 Cells (Luminance Mapped)</span>
        </div>
      </div>

      {/* Audio Reactive Feature Bars */}
      <div style={{ marginBottom: '18px', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '14px' }}>
        <div style={{ color: '#71717a', marginBottom: '8px', fontSize: '10px', letterSpacing: '0.12em' }}>
          AUDIO SPECTRUM METRICS
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
          {[
            { label: 'BASS', val: audioData?.bass || 0 },
            { label: 'MID', val: audioData?.mid || 0 },
            { label: 'TREBLE', val: audioData?.treble || 0 },
            { label: 'BEAT PULSE', val: audioData?.beatPulse || 0 },
          ].map((item) => (
            <div key={item.label} style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '6px 8px', borderRadius: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#a1a1aa' }}>
                <span>{item.label}</span>
                <span>{(item.val).toFixed(2)}</span>
              </div>
              <div style={{ height: '4px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '2px', marginTop: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(100, item.val * 100)}%`, height: '100%', background: '#c51e43' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Demo Track Quick Switcher */}
      <div style={{ marginBottom: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '14px' }}>
        <div style={{ color: '#71717a', marginBottom: '8px', fontSize: '10px', letterSpacing: '0.12em' }}>
          SELECT DEMO TRACK
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {demoTracks.map((dt, idx) => (
            <button
              key={dt.id}
              onClick={() => onSelectTrack(idx)}
              style={{
                backgroundColor: idx === activeTrackIndex ? '#c51e43' : 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                padding: '5px 10px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: '10px',
                letterSpacing: '0.08em',
              }}
            >
              {dt.index} - {dt.title}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Toggles */}
      <div style={{ display: 'flex', gap: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '14px' }}>
        <button
          onClick={onToggleReducedMotion}
          style={{
            backgroundColor: isReducedMotion ? '#f59e0b' : 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            color: '#ffffff',
            padding: '6px 12px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: '10px',
          }}
        >
          {isReducedMotion ? 'Motion: REDUCED' : 'Motion: FULL'}
        </button>
      </div>
    </div>
  );
}
