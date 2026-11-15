import React, { useMemo } from 'react';

export function KineticLyricStage({
  lineWords = [],
  activeWordIndex = 0,
  vocalProgress = 0,
  audioData = {},
  personality,
}) {
  const words = lineWords.length > 0 ? lineWords : [{ text: 'and' }, { text: "it's" }, { text: 'coming' }, { text: 'on' }];
  const safeActiveIndex = Math.min(words.length - 1, Math.max(0, activeWordIndex));

  // Partition words into Previous, Active, Next
  const prevWords = words.slice(0, safeActiveIndex);
  const activeWord = words[safeActiveIndex] || { text: '' };
  const nextWords = words.slice(safeActiveIndex + 1);

  const prevText = prevWords.map((w) => w.text).join(' ');
  const nextText = nextWords.map((w) => w.text).join(' ');

  const fontFamily = personality?.typographyFont || "'Cormorant Garamond', Georgia, serif";
  const accentColor = personality?.accentColor || '#C51E43';
  const beatPulse = audioData?.beatPulse || 0;
  const kickScale = 1.0 + beatPulse * 0.05;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingLeft: '42%', // Positioned elegantly across the right stage
        zIndex: 5,
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          flexWrap: 'nowrap',
          maxWidth: '56vw',
          transform: `scale(${kickScale})`,
          transition: 'transform 0.1s ease-out',
        }}
      >
        {/* 1. Previous Words (Context fragment on the left) */}
        {prevText && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginRight: '22px',
              opacity: 0.65,
              transition: 'all 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)',
            }}
          >
            <span
              style={{
                fontFamily,
                fontStyle: 'italic',
                fontWeight: 400,
                fontSize: 'clamp(28px, 2.6vw, 42px)',
                letterSpacing: '0.02em',
                color: '#d0d0d8',
                whiteSpace: 'nowrap',
                textShadow: '0 2px 10px rgba(0, 0, 0, 0.8)',
              }}
            >
              {prevText}
            </span>

            {/* Subtle editorial horizontal rule */}
            <div
              style={{
                width: '32px',
                height: '1px',
                backgroundColor: 'rgba(255, 255, 255, 0.25)',
                marginLeft: '14px',
              }}
            />
          </div>
        )}

        {/* 2. Active Hero Word (Massive, Luminous, Dominant) */}
        <div
          style={{
            position: 'relative',
            display: 'inline-block',
            transition: 'all 0.35s cubic-bezier(0.2, 0.8, 0.2, 1)',
          }}
        >
          {/* Halation Aura Glow */}
          <div
            style={{
              position: 'absolute',
              inset: '-20%',
              background: `radial-gradient(ellipse at center, rgba(255, 255, 255, 0.18) 0%, rgba(${personality?.ambientGlow ? personality.ambientGlow.map((v) => Math.round(v * 255)).join(',') : '197, 30, 67'}, 0.12) 40%, rgba(0, 0, 0, 0) 70%)`,
              filter: 'blur(20px)',
              pointerEvents: 'none',
              zIndex: -1,
            }}
          />

          <span
            style={{
              fontFamily,
              fontStyle: 'italic',
              fontWeight: 500,
              fontSize: 'clamp(56px, 5.8vw, 96px)',
              letterSpacing: '-0.01em',
              color: '#ffffff',
              lineHeight: 1.0,
              display: 'inline-block',
              whiteSpace: 'nowrap',
              textShadow: `
                0 0 24px rgba(255, 255, 255, 0.85),
                0 0 50px rgba(255, 255, 255, 0.4),
                0 0 80px ${accentColor}44,
                0 4px 18px rgba(0, 0, 0, 0.9)
              `,
              position: 'relative',
            }}
          >
            {activeWord.text}

            {/* Vocal Progress Sheen (Linear gradient light sweep) */}
            {vocalProgress > 0 && vocalProgress < 1.0 && (
              <span
                style={{
                  position: 'absolute',
                  inset: 0,
                  color: 'transparent',
                  background: `linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.95) ${vocalProgress * 100}%, transparent ${(vocalProgress + 0.18) * 100}%)`,
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  pointerEvents: 'none',
                  filter: 'drop-shadow(0 0 10px #ffffff)',
                }}
              >
                {activeWord.text}
              </span>
            )}
          </span>
        </div>

        {/* 3. Upcoming Words (Context on the right with underline) */}
        {nextText && (
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              marginLeft: '24px',
              opacity: 0.6,
              transition: 'all 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)',
            }}
          >
            <div style={{ position: 'relative' }}>
              <span
                style={{
                  fontFamily,
                  fontStyle: 'italic',
                  fontWeight: 400,
                  fontSize: 'clamp(28px, 2.6vw, 42px)',
                  letterSpacing: '0.02em',
                  color: '#d0d0d8',
                  whiteSpace: 'nowrap',
                  textShadow: '0 2px 10px rgba(0, 0, 0, 0.8)',
                }}
              >
                {nextText}
              </span>

              {/* Trailing underline rule (as seen in "on ───" in reference) */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '2px',
                  left: 0,
                  width: 'calc(100% + 48px)',
                  height: '1px',
                  backgroundColor: 'rgba(255, 255, 255, 0.3)',
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
