import React, { useRef, useEffect } from 'react';
import { CameraRig } from '../engine/cameraRig';
import { generatePhraseLayout } from '../engine/spatialLayout';

export function KineticTypographyStage({
  lineWords = [],
  activeWordIndex = 0,
  vocalProgress = 0,
  isVocal = false,
  audioData = {},
  blendedProfile,
  trackSeed = 12345,
}) {
  const canvasRef = useRef(null);
  const cameraRef = useRef(new CameraRig());
  const nodesRef = useRef([]);
  const activeIndexRef = useRef(activeWordIndex);

  // Stardust & ambient floating embers
  const embersRef = useRef(
    Array.from({ length: 40 }, () => ({
      x: (Math.random() - 0.5) * 800,
      y: (Math.random() - 0.5) * 600,
      z: (Math.random() - 0.5) * 400,
      size: 1.0 + Math.random() * 2.0,
      alpha: 0.2 + Math.random() * 0.4,
      vy: -0.15 - Math.random() * 0.25,
      vx: (Math.random() - 0.5) * 0.2,
      phase: Math.random() * Math.PI * 2,
    }))
  );

  const dominantId = blendedProfile?.dominantId || 'DREAM';

  // Generate layout ONLY when lyrics line, active word index, or dominant personality changes
  useEffect(() => {
    activeIndexRef.current = activeWordIndex;
    const newNodes = generatePhraseLayout(lineWords, activeWordIndex, dominantId, trackSeed);
    nodesRef.current = newNodes;
  }, [lineWords, activeWordIndex, dominantId, trackSeed]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId;
    let startTime = performance.now();
    let lastTime = performance.now();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    window.addEventListener('resize', resize);
    resize();

    const render = (now) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      const elapsed = (now - startTime) / 1000;
      const w = window.innerWidth;
      const h = window.innerHeight;

      ctx.clearRect(0, 0, w, h);

      const personality = dominantId;
      const camera = cameraRef.current;

      // 1. Camera targets Hero word smoothly
      const heroNode = nodesRef.current[activeWordIndex] || nodesRef.current[0];
      const nextNode = nodesRef.current[activeWordIndex + 1];
      camera.setTarget(heroNode, nextNode, personality, 0.25);
      camera.update(dt, elapsed, audioData, 0.4);

      // 2. Render 3D Ambient Dust Embers
      const dustGlow = blendedProfile?.primaryGlow || [0.35, 0.75, 0.95];
      const [dr, dg, db] = [
        Math.round(dustGlow[0] * 255),
        Math.round(dustGlow[1] * 255),
        Math.round(dustGlow[2] * 255),
      ];

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const ember of embersRef.current) {
        ember.y += ember.vy * (1.0 + (audioData.bass || 0) * 0.5);
        ember.x += ember.vx + Math.sin(elapsed * 0.6 + ember.phase) * 0.12;
        if (ember.y < -320) ember.y = 320;
        if (ember.x < -420) ember.x = 420;
        if (ember.x > 420) ember.x = -420;

        const proj = camera.project(ember.x, ember.y, ember.z, w, h, 10.0);
        if (proj.visible && proj.depthAlpha > 0.05) {
          const twinkle = 0.5 + 0.5 * Math.sin(elapsed * 2.0 + ember.phase);
          const rad = ember.size * proj.factor * (1.0 + (audioData.beatPulse || 0) * 0.3);
          ctx.fillStyle = `rgba(${dr}, ${dg}, ${db}, ${ember.alpha * proj.depthAlpha * twinkle * 0.5})`;
          ctx.beginPath();
          ctx.arc(proj.screenX, proj.screenY, Math.max(0.8, rad), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();

      // 3. Project and Render Lyric Words with Crisp, High-Contrast Visibility
      const renderedNodes = nodesRef.current.map((node, i) => {
        const isHero = i === activeWordIndex;
        const proj = camera.project(node.x, node.y, node.z, w, h, 10.0);
        return {
          node,
          index: i,
          isHero,
          proj,
        };
      });

      // Sort back-to-front
      renderedNodes.sort((a, b) => b.proj.dz - a.proj.dz);

      // Primary glow color for active accents
      const primaryGlow = blendedProfile?.primaryGlow || [0.22, 0.74, 0.95];
      const [gr, gg, gb] = [
        Math.round(primaryGlow[0] * 255),
        Math.round(primaryGlow[1] * 255),
        Math.round(primaryGlow[2] * 255),
      ];

      for (const item of renderedNodes) {
        const { node, isHero, proj } = item;
        if (!proj.visible) continue;

        const text = node.text || '';
        if (!text) continue;

        ctx.save();

        // Safe screen placement with generous margins
        const padX = 80;
        const padY = 80;
        const posX = Math.max(padX, Math.min(w - padX, proj.screenX));
        const posY = Math.max(padY, Math.min(h - padY, proj.screenY));
        ctx.translate(posX, posY);

        if (node.rotZ) {
          ctx.rotate(node.rotZ + camera.rot.z);
        }

        // Scale & Typography (Crisp, large, fully readable)
        const kickScale = isHero ? (1.0 + (audioData.beatPulse || 0) * 0.08) : 1.0;
        const baseFactor = Math.max(0.8, Math.min(1.6, proj.factor));
        const finalScale = node.scale * baseFactor * kickScale;

        // Fonts
        const fontFamily = blendedProfile?.fontFamily || "'Cormorant Garamond', Georgia, serif";
        const fontStyle = blendedProfile?.fontStyle || 'italic';
        const fontWeight = isHero ? '600' : '400';
        const fontSizePx = Math.max(22, Math.round(36 * finalScale));

        ctx.font = `${fontStyle} ${fontWeight} ${fontSizePx}px ${fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // High-contrast, sharp opacity (Zero blur! Crystal clear!)
        const alpha = isHero ? 1.0 : (node.isSupporting ? 0.78 : 0.42);

        // A. Hero Word Radiant Halation Glow
        if (isHero) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          const glowRad = fontSizePx * 1.5;
          const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, glowRad);
          grad.addColorStop(0.0, `rgba(${gr}, ${gg}, ${gb}, 0.28)`);
          grad.addColorStop(0.6, `rgba(${gr}, ${gg}, ${gb}, 0.08)`);
          grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(0, 0, glowRad, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // B. Render Crisp Typographic Body
        if (isHero) {
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = `rgba(${gr}, ${gg}, ${gb}, 0.7)`;
          ctx.shadowBlur = Math.min(20, 8 + (audioData.bass || 0) * 8);
        } else if (node.isSupporting) {
          ctx.fillStyle = `rgba(226, 232, 240, ${alpha})`;
          ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
          ctx.shadowBlur = 4;
        } else {
          ctx.fillStyle = `rgba(148, 163, 184, ${alpha})`;
          ctx.shadowBlur = 0;
        }

        ctx.fillText(text, 0, 0);

        // C. Vocal Progress Gleam across Hero Word
        if (isHero && isVocal && vocalProgress > 0 && vocalProgress < 1.0) {
          ctx.save();
          ctx.globalCompositeOperation = 'source-atop';
          const tw = ctx.measureText(text).width;
          const gleamX = -tw * 0.5 + vocalProgress * tw;
          const gleamSpan = tw * 0.35;
          const gleamGrad = ctx.createLinearGradient(gleamX - gleamSpan, 0, gleamX + gleamSpan, 0);
          gleamGrad.addColorStop(0.0, 'rgba(255, 255, 255, 0)');
          gleamGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.95)');
          gleamGrad.addColorStop(1.0, 'rgba(255, 255, 255, 0)');
          ctx.fillStyle = gleamGrad;
          ctx.fillText(text, 0, 0);
          ctx.restore();
        }

        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [activeWordIndex, dominantId, vocalProgress, isVocal, audioData, blendedProfile]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 2,
        pointerEvents: 'none',
      }}
    />
  );
}
