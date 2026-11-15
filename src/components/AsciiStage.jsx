import React, { useRef, useEffect } from 'react';

// Ordered ASCII Character Luminance Ramp from low density to high density
const ASCII_RAMP = ' .,:;irsXA253hMHGS#9B&@';
const RAMP_LEN = ASCII_RAMP.length;

export function AsciiStage({
  track,
  audioData = {},
  personality,
  isReducedMotion = false,
}) {
  const canvasRef = useRef(null);
  const silhouetteImgRef = useRef(null);

  // Pre-load silhouette mask
  useEffect(() => {
    const maskSrc = track?.silhouetteMask || '/assets/demo/mask_profile.png';
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      silhouetteImgRef.current = img;
    };
    img.src = maskSrc;
  }, [track?.silhouetteMask]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animId;
    let startTime = performance.now();
    let lastTime = performance.now();

    // Cache pre-rendered glyphs for fast rendering
    const glyphCanvas = document.createElement('canvas');
    glyphCanvas.width = RAMP_LEN * 16;
    glyphCanvas.height = 20;
    const gCtx = glyphCanvas.getContext('2d');
    gCtx.font = "600 11px 'Space Grotesk', 'Courier New', monospace";
    gCtx.fillStyle = '#e8e8ed';
    gCtx.textAlign = 'center';
    gCtx.textBaseline = 'middle';
    for (let i = 0; i < RAMP_LEN; i++) {
      gCtx.fillText(ASCII_RAMP[i], i * 16 + 8, 10);
    }

    // Grid configuration
    const cols = 96;
    const rows = 68;
    const charW = 10;
    const charH = 13;

    // Buffer canvas for sampling luminance
    const sampleCanvas = document.createElement('canvas');
    sampleCanvas.width = cols;
    sampleCanvas.height = rows;
    const sampleCtx = sampleCanvas.getContext('2d', { willReadFrequently: true });

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    window.addEventListener('resize', resize);
    resize();

    // Render loop
    const render = (now) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      const elapsed = (now - startTime) / 1000;

      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      ctx.clearRect(0, 0, w, h);

      // 1. Prepare Luminance Sample Map
      sampleCtx.fillStyle = '#000000';
      sampleCtx.fillRect(0, 0, cols, rows);

      const silImg = silhouetteImgRef.current;
      if (silImg && silImg.complete && silImg.naturalWidth > 0) {
        // Draw image onto low-res sampling canvas
        sampleCtx.drawImage(silImg, 0, 0, cols, rows);
      } else {
        // Procedural organic face / silhouette fallback
        const imgData = sampleCtx.createImageData(cols, rows);
        const d = imgData.data;
        for (let y = 0; y < rows; y++) {
          for (let x = 0; x < cols; x++) {
            const nx = (x / cols) * 2.0 - 1.0;
            const ny = (y / rows) * 2.0 - 1.0;
            const dist = Math.sqrt(nx * nx + ny * ny);

            // Flowing organic contour shape
            const wave = Math.sin(ny * 3.5 + nx * 2.0 + elapsed * 0.4) * 0.25;
            let val = 0;
            if (dist + wave < 0.65) {
              val = Math.max(0, Math.min(255, (1.0 - (dist + wave) / 0.65) * 255));
            }
            const idx = (y * cols + x) * 4;
            d[idx] = val;
            d[idx + 1] = val;
            d[idx + 2] = val;
            d[idx + 3] = 255;
          }
        }
        sampleCtx.putImageData(imgData, 0, 0);
      }

      // Sample pixels
      const pixels = sampleCtx.getImageData(0, 0, cols, rows).data;

      // 2. Render ASCII Matrix onto Right Stage
      // Center position of the ASCII composition on the canvas
      const originX = w * 0.46;
      const originY = h * 0.08;

      const bass = audioData.bass || 0;
      const treble = audioData.treble || 0;
      const beatPulse = audioData.beatPulse || 0;

      ctx.save();
      ctx.font = "600 10.5px 'Space Grotesk', 'Courier New', monospace";
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Iterate grid cells
      for (let r = 0; r < rows; r++) {
        // Subtle row-level audio-reactive drift
        const rowDisplace = isReducedMotion
          ? 0
          : Math.sin(r * 0.22 + elapsed * 1.8) * bass * 3.2;

        for (let c = 0; c < cols; c++) {
          const idx = (r * cols + c) * 4;
          const lum = (pixels[idx] * 0.299 + pixels[idx + 1] * 0.587 + pixels[idx + 2] * 0.114) / 255;

          // Skip completely dark empty cells
          if (lum < 0.08) continue;

          // Map luminance to character ramp with density curve
          const rampIndex = Math.min(
            RAMP_LEN - 1,
            Math.max(0, Math.floor(Math.pow(lum, 1.25) * RAMP_LEN))
          );
          const ch = ASCII_RAMP[rampIndex];
          if (ch === ' ') continue;

          // Audio-reactive cell displacement
          const cellWave = isReducedMotion
            ? 0
            : Math.sin(c * 0.15 + r * 0.1 + elapsed * 2.2) * (bass * 2.0);

          const posX = originX + (c - cols * 0.5) * charW + rowDisplace;
          const posY = originY + r * charH + cellWave;

          // Alpha modulation based on luminance & audio
          const charAlpha = Math.min(1.0, lum * 0.95 + beatPulse * 0.12);

          // Render subtle character color (monochromatic off-white with delicate tint)
          if (lum > 0.8) {
            ctx.fillStyle = `rgba(255, 255, 255, ${charAlpha})`;
          } else if (lum > 0.45) {
            ctx.fillStyle = `rgba(215, 218, 226, ${charAlpha * 0.88})`;
          } else {
            ctx.fillStyle = `rgba(145, 148, 160, ${charAlpha * 0.65})`;
          }

          ctx.fillText(ch, posX, posY);
        }
      }
      ctx.restore();

      // 3. Bottom Flowing Ribbon / Wave Strands (As seen in the approved reference)
      // Delicate undulating wave strands at the base of the silhouette
      ctx.save();
      const waveBaseY = h * 0.86;
      const waveStartX = w * 0.12;
      const waveEndX = w * 0.88;
      const waveCount = 5;

      for (let k = 0; k < waveCount; k++) {
        const strandOffset = k * 14;
        const strandPhase = elapsed * (1.2 + k * 0.3) + k * 0.8;
        const strandAlpha = 0.28 + (k === 2 ? 0.35 : 0.15) + bass * 0.2;

        ctx.beginPath();
        for (let x = waveStartX; x <= waveEndX; x += 12) {
          const progress = (x - waveStartX) / (waveEndX - waveStartX);
          const env = Math.sin(progress * Math.PI); // Envelope: 0 at ends, 1 at center

          const y1 = Math.sin(progress * 10.0 + strandPhase) * 22.0 * env;
          const y2 = Math.cos(progress * 18.0 - strandPhase * 0.8) * 12.0 * env * (1.0 + bass * 0.8);
          const finalY = waveBaseY + y1 + y2 + (k - 2) * 8.0;

          if (x === waveStartX) {
            ctx.moveTo(x, finalY);
          } else {
            ctx.lineTo(x, finalY);
          }
        }

        // Base strands: red/white accent gradient
        if (k === 0 || k === 1) {
          ctx.strokeStyle = `rgba(197, 30, 67, ${strandAlpha * 0.75})`;
          ctx.lineWidth = 1.2;
        } else {
          ctx.strokeStyle = `rgba(230, 230, 238, ${strandAlpha * 0.65})`;
          ctx.lineWidth = 0.8;
        }
        ctx.stroke();
      }

      // Small glowing particles traveling along the wave ribbons
      for (let p = 0; p < 12; p++) {
        const pt = (elapsed * 0.15 + p * 0.083) % 1.0;
        const px = waveStartX + pt * (waveEndX - waveStartX);
        const env = Math.sin(pt * Math.PI);
        const py = waveBaseY + Math.sin(pt * 10.0 + elapsed * 1.5) * 22.0 * env;

        ctx.fillStyle = p % 2 === 0 ? 'rgba(255, 255, 255, 0.7)' : 'rgba(235, 45, 85, 0.8)';
        ctx.beginPath();
        ctx.arc(px, py, 1.2 + (p % 3) * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // 4. Orbital Elliptical Graphic Curve (Encircling silhouette)
      ctx.save();
      const orbitCx = w * 0.58;
      const orbitCy = h * 0.44;
      const orbitRx = w * 0.38;
      const orbitRy = h * 0.22;
      const orbitRot = -0.28; // Diagonal tilt

      ctx.translate(orbitCx, orbitCy);
      ctx.rotate(orbitRot);

      // Fine elliptical orbit line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 0.85;
      ctx.beginPath();
      ctx.ellipse(0, 0, orbitRx, orbitRy, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Glowing focal bead orbiting along the curve
      const orbitAngle = elapsed * 0.35;
      const beadX = Math.cos(orbitAngle) * orbitRx;
      const beadY = Math.sin(orbitAngle) * orbitRy;

      // Glow halo
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const beadGrad = ctx.createRadialGradient(beadX, beadY, 0, beadX, beadY, 14);
      beadGrad.addColorStop(0.0, 'rgba(255, 255, 255, 0.85)');
      beadGrad.addColorStop(0.3, 'rgba(197, 30, 67, 0.45)');
      beadGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = beadGrad;
      ctx.beginPath();
      ctx.arc(beadX, beadY, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Center bead dot
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(beadX, beadY, 1.8, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // 5. Registration Crosshairs (+) & Editorial Grid Marks
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.lineWidth = 1;

      // Mid-point division crosshair
      const ch1X = w * 0.02;
      const ch1Y = h * 0.12;
      ctx.beginPath();
      ctx.moveTo(ch1X - 7, ch1Y);
      ctx.lineTo(ch1X + 7, ch1Y);
      ctx.moveTo(ch1X, ch1Y - 7);
      ctx.lineTo(ch1X, ch1Y + 7);
      ctx.stroke();

      // Bottom Right Crosshair
      const ch2X = w * 0.78;
      const ch2Y = h * 0.74;
      ctx.beginPath();
      ctx.moveTo(ch2X - 8, ch2Y);
      ctx.lineTo(ch2X + 8, ch2Y);
      ctx.moveTo(ch2X, ch2Y - 8);
      ctx.lineTo(ch2X, ch2Y + 8);
      ctx.stroke();

      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [track?.id, audioData, isReducedMotion]);

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
        }}
      />

      {/* Floating Photographic Negative Strip Accent (as in reference image) */}
      {track?.hasNegativeStrip && (
        <div
          style={{
            position: 'absolute',
            left: '3%',
            top: '59%',
            width: '110px',
            height: '42px',
            backgroundImage: 'url(/assets/demo/neg_strip.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.55,
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 0 16px rgba(0, 0, 0, 0.8)',
            filter: 'contrast(1.4) brightness(0.85)',
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  );
}
