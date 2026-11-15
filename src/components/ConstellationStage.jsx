import React, { useRef, useEffect } from 'react';

export function ConstellationStage({
  lineWords = [],
  activeWordIndex = 0,
  vocalProgress = 0,
  isVocal = false,
  audioData,
  palette,
  onActiveNodeChange,
}) {
  const canvasRef = useRef(null);

  // Starlight particles ref
  const particlesRef = useRef(
    Array.from({ length: 70 }, (_, i) => {
      const layer = i % 3;
      return {
        x: Math.random(),
        y: Math.random(),
        layer,
        vx: (Math.random() - 0.5) * (layer === 2 ? 0.0006 : 0.0003),
        vy: (layer === 2 ? -0.0006 : (layer === 1 ? -0.0004 : -0.0002)) - Math.random() * 0.0005,
        size: layer === 2 ? (2.0 + Math.random() * 2.0) : (layer === 1 ? (1.2 + Math.random() * 1.2) : (0.6 + Math.random() * 0.8)),
        alpha: layer === 2 ? (0.35 + Math.random() * 0.45) : (layer === 1 ? (0.25 + Math.random() * 0.35) : (0.15 + Math.random() * 0.25)),
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: 1.8 + Math.random() * 3.5,
      };
    })
  );

  // Word spring states
  const wordSpringsRef = useRef([]);

  useEffect(() => {
    wordSpringsRef.current = lineWords.map((_, i) => ({
      activation: i === activeWordIndex ? 1.0 : 0.0,
      velActivation: 0,
      liftY: 0,
      velLiftY: 0,
      ringExpand: 0,
      velRingExpand: 0,
    }));
  }, [lineWords.length]);

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

    // 4-Point Starlight Flare
    const drawStarlightFlare = (x, y, intensity, tintRGB, spikeScale = 1.0, angle = -0.12) => {
      if (intensity <= 0.01) return;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const [r, g, b] = tintRGB;
      const pulse = 1.0 + (audioData.bass || 0) * 0.25 + (audioData.beatPulse || 0) * 0.35;
      const outerR = (16 + intensity * 46) * pulse * spikeScale;

      const grad = ctx.createRadialGradient(x, y, 0, x, y, outerR);
      grad.addColorStop(0.0, `rgba(255, 255, 255, ${Math.min(1, intensity * 0.95)})`);
      grad.addColorStop(0.25, `rgba(240, 225, 255, ${intensity * 0.70})`);
      grad.addColorStop(0.50, `rgba(${r}, ${g}, ${b}, ${intensity * 0.36})`);
      grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, outerR, 0, Math.PI * 2);
      ctx.fill();

      ctx.translate(x, y);
      ctx.rotate(angle);
      const lenMajor = (14 + intensity * 40) * pulse * spikeScale;
      const lenMinor = (9 + intensity * 26) * pulse * spikeScale;

      const drawSpike = (len, width, alpha) => {
        const sg = ctx.createLinearGradient(-len, 0, len, 0);
        sg.addColorStop(0.0, 'rgba(255, 255, 255, 0)');
        sg.addColorStop(0.35, `rgba(${r}, ${g}, ${b}, ${alpha * 0.55})`);
        sg.addColorStop(0.5, `rgba(255, 250, 255, ${alpha})`);
        sg.addColorStop(0.65, `rgba(${r}, ${g}, ${b}, ${alpha * 0.55})`);
        sg.addColorStop(1.0, 'rgba(255, 255, 255, 0)');
        ctx.strokeStyle = sg;
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(-len, 0);
        ctx.lineTo(len, 0);
        ctx.stroke();
      };

      drawSpike(lenMajor, 1.2, intensity * 0.88);
      ctx.rotate(Math.PI * 0.5);
      drawSpike(lenMinor, 1.0, intensity * 0.70);

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, 1.8 + intensity * 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    // 3D Astrolabe Gimbal Ring
    const drawAstrolabeGimbal = (cx, cy, rx, ry, tilt, heroWeight, alpha, elapsed, tintRGB, secRGB) => {
      if (alpha <= 0.01) return;
      ctx.save();
      ctx.translate(cx, cy);
      const [pr, pg, pb] = tintRGB;
      const [sr, sg, sb] = secRGB;
      ctx.globalCompositeOperation = 'lighter';

      // Celestial light pool
      if (heroWeight > 0.05) {
        ctx.save();
        ctx.rotate(tilt);
        ctx.scale(1.0, ry / rx);
        const poolGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, rx * 1.15);
        const poolAlpha = heroWeight * alpha * (0.18 + audioData.mid * 0.08 + audioData.beatPulse * 0.06);
        poolGrad.addColorStop(0.0, `rgba(255, 240, 255, ${poolAlpha * 1.2})`);
        poolGrad.addColorStop(0.45, `rgba(${pr}, ${pg}, ${pb}, ${poolAlpha * 0.65})`);
        poolGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = poolGrad;
        ctx.beginPath();
        ctx.arc(0, 0, rx * 1.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Rotating primary ring
      ctx.save();
      const orbitRot = tilt + elapsed * 0.22;
      ctx.rotate(orbitRot);
      const ringGrad = ctx.createLinearGradient(-rx, -ry, rx, ry);
      const baseAlpha = (0.35 + heroWeight * 0.50) * alpha;
      ringGrad.addColorStop(0.0, `rgba(${sr}, ${sg}, ${sb}, ${baseAlpha * 0.45})`);
      ringGrad.addColorStop(0.35, `rgba(255, 248, 255, ${baseAlpha * 0.95})`);
      ringGrad.addColorStop(0.70, `rgba(${pr}, ${pg}, ${pb}, ${baseAlpha * 1.15})`);
      ringGrad.addColorStop(1.0, `rgba(${pr}, ${pg}, ${pb}, ${baseAlpha * 0.35})`);

      ctx.strokeStyle = ringGrad;
      ctx.lineWidth = 1.0 + heroWeight * 0.50;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Traveling starlight beads
      const beadCount = heroWeight > 0.3 ? 3 : 2;
      for (let b = 0; b < beadCount; b++) {
        const beadAngle = elapsed * (0.7 + b * 0.25) + (b * Math.PI * 2 / beadCount);
        const bx = Math.cos(beadAngle) * rx;
        const by = Math.sin(beadAngle) * ry;
        const beadR = (1.5 + heroWeight * 1.2) * (1.0 + audioData.treble * 0.3);

        const bg = ctx.createRadialGradient(bx, by, 0, bx, by, beadR * 4.0);
        bg.addColorStop(0.0, `rgba(255, 255, 255, ${alpha})`);
        bg.addColorStop(0.4, `rgba(${pr}, ${pg}, ${pb}, ${alpha * 0.65})`);
        bg.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.arc(bx, by, beadR * 4.0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // Counter-rotating inner ring
      if (heroWeight > 0.12) {
        ctx.save();
        ctx.rotate(-tilt * 0.8 - elapsed * 0.16);
        ctx.strokeStyle = `rgba(${pr}, ${pg}, ${pb}, ${heroWeight * alpha * 0.35})`;
        ctx.lineWidth = 0.85;
        ctx.beginPath();
        ctx.ellipse(0, 0, rx * 0.68, ry * 0.62, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      ctx.restore();
    };

    const render = (now) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      const elapsed = (now - startTime) / 1000;
      const w = window.innerWidth;
      const h = window.innerHeight;
      const scaleFactor = Math.min(w / 1280, h / 720);

      ctx.clearRect(0, 0, w, h);

      const pr = palette ? Math.round(palette.primary[0] * 255) : 244;
      const pg = palette ? Math.round(palette.primary[1] * 255) : 37;
      const pb = palette ? Math.round(palette.primary[2] * 255) : 109;
      const tintRGB = [pr, pg, pb];

      const sr = palette ? Math.round(palette.secondary[0] * 255) : 122;
      const sg = palette ? Math.round(palette.secondary[1] * 255) : 88;
      const sb = palette ? Math.round(palette.secondary[2] * 255) : 168;
      const secRGB = [sr, sg, sb];

      // 1. Render Starlight Embers
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const pt of particlesRef.current) {
        pt.x += pt.vx + Math.sin(elapsed * 1.2) * 0.0001;
        pt.y += pt.vy * (1.0 + audioData.bass * 0.8 + audioData.beatPulse * 1.2);
        if (pt.y < 0.04) { pt.y = 0.96; pt.x = 0.10 + Math.random() * 0.80; }
        if (pt.x < 0.04) pt.x = 0.96;
        if (pt.x > 0.96) pt.x = 0.04;

        const twinkle = 0.45 + 0.55 * Math.sin(elapsed * pt.twinkleSpeed + pt.twinklePhase);
        const curAlpha = pt.alpha * twinkle * (0.75 + audioData.bass * 0.35);

        if (curAlpha > 0.02) {
          const sx = pt.x * w;
          const sy = pt.y * h;
          const r = pt.size * (1.0 + audioData.beatPulse * 0.25);
          const glowRad = r * (pt.layer === 2 ? 4.5 : 3.2);

          const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, glowRad);
          grad.addColorStop(0.0, `rgba(255, 255, 255, ${curAlpha})`);
          grad.addColorStop(0.35, `rgba(${pr}, ${pg}, ${pb}, ${curAlpha * 0.60})`);
          grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(sx, sy, glowRad, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();

      // 2. Harmonic Constellation Layout & Springs
      const rawWords = lineWords.length > 0 ? lineWords : [{ text: "DREAMSCAPE" }, { text: "CONSTELLATION" }];
      const totalWords = rawWords.length;
      const nodes = [];

      const startX = totalWords > 5 ? 0.16 : (totalWords > 3 ? 0.22 : 0.30);
      const endX = totalWords > 5 ? 0.84 : (totalWords > 3 ? 0.78 : 0.70);
      const spanX = endX - startX;
      const midY = 0.49;

      for (let i = 0; i < totalWords; i++) {
        const t = totalWords > 1 ? (i / (totalWords - 1)) : 0.5;
        const nx = startX + t * spanX;
        const waveY = Math.sin(t * Math.PI * 1.25) * 0.075 + Math.cos(t * Math.PI * 2.5) * 0.025;
        const ny = midY + waveY;
        const rot = Math.sin(t * Math.PI * 1.5) * 0.035;
        const oy = (i % 2 === 0) ? -24 : 26;

        nodes.push({
          text: rawWords[i].text || rawWords[i],
          x: nx * w,
          y: ny * h,
          ox: 0,
          oy: oy * scaleFactor,
          rot,
          hasRing: (i === 0 || i === totalWords - 1),
        });
      }

      // Update Springs
      for (let i = 0; i < totalWords; i++) {
        if (!wordSpringsRef.current[i]) {
          wordSpringsRef.current[i] = { activation: 0, velActivation: 0, liftY: 0, velLiftY: 0, ringExpand: 0, velRingExpand: 0 };
        }
        const sp = wordSpringsRef.current[i];
        const rel = i - activeWordIndex;
        const targetAct = Math.exp(-(rel * rel) / 0.24);
        sp.velActivation = (sp.velActivation + (targetAct - sp.activation) * 120 * dt) * Math.exp(-15 * dt);
        sp.activation = Math.max(0, Math.min(1.12, sp.activation + sp.velActivation * dt));

        const vocalBreath = Math.sin(elapsed * 3.2 + i) * (2.0 + audioData.mid * 4.5) * sp.activation;
        const targetLift = -sp.activation * 12.0 + vocalBreath;
        sp.velLiftY = (sp.velLiftY + (targetLift - sp.liftY) * 95 * dt) * Math.exp(-14 * dt);
        sp.liftY += sp.velLiftY * dt;

        const targetRing = sp.activation * (1.0 + audioData.mid * 0.08 + audioData.beatPulse * 0.06);
        sp.velRingExpand = (sp.velRingExpand + (targetRing - sp.ringExpand) * 110 * dt) * Math.exp(-15 * dt);
        sp.ringExpand = Math.max(0, sp.ringExpand + sp.velRingExpand * dt);
      }

      // Record active node
      if (nodes[activeWordIndex] && onActiveNodeChange) {
        onActiveNodeChange({
          x: nodes[activeWordIndex].x / w,
          y: 1.0 - (nodes[activeWordIndex].y / h),
        });
      }

      // 3. Continuous Catmull-Rom Ribbon Spline
      const splinePoints = [];
      const numSubSteps = 24;

      if (nodes.length > 1) {
        const getPt = (idx) => nodes[Math.max(0, Math.min(nodes.length - 1, idx))];

        for (let i = 0; i < nodes.length - 1; i++) {
          const p0 = getPt(i - 1);
          const p1 = getPt(i);
          const p2 = getPt(i + 1);
          const p3 = getPt(i + 2);

          for (let step = 0; step < numSubSteps; step++) {
            const u = step / numSubSteps;
            const u2 = u * u;
            const u3 = u2 * u;

            const x = 0.5 * (
              (2 * p1.x) +
              (-p0.x + p2.x) * u +
              (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * u2 +
              (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * u3
            );

            const y = 0.5 * (
              (2 * p1.y) +
              (-p0.y + p2.y) * u +
              (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * u2 +
              (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * u3
            );

            const sGlobal = (i + u) / (nodes.length - 1);
            const harmonicWave = Math.sin(elapsed * 2.2 + sGlobal * 4.2) * (4.5 * scaleFactor) * (0.8 + audioData.bass * 0.8);
            const acousticPulse = audioData.beatPulse > 0.08
              ? Math.exp(-Math.pow(sGlobal - ((elapsed * 1.5) % 1.0), 2.0) * 45.0) * (audioData.beatPulse * 10.0 * scaleFactor)
              : 0;

            splinePoints.push({ x, y: y + harmonicWave + acousticPulse });
          }
        }
        const lastNode = nodes[nodes.length - 1];
        splinePoints.push({ x: lastNode.x, y: lastNode.y });

        // Draw Ribbon Spline Passes
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalCompositeOperation = 'lighter';

        const passes = [
          { width: 14.0 * scaleFactor, alpha: 0.18 + audioData.beatPulse * 0.12, stroke: `rgba(${sr}, ${sg}, ${sb}, ` },
          { width: 4.0 * scaleFactor,  alpha: 0.65 + audioData.bass * 0.30,      stroke: `rgba(${pr}, ${pg}, ${pb}, ` },
          { width: 1.2 * scaleFactor,  alpha: 0.96,                              stroke: `rgba(255, 255, 255, ` }
        ];

        for (const pass of passes) {
          ctx.strokeStyle = `${pass.stroke}${pass.alpha})`;
          ctx.lineWidth = pass.width;
          ctx.beginPath();
          ctx.moveTo(splinePoints[0].x, splinePoints[0].y);
          for (let p = 1; p < splinePoints.length; p++) {
            ctx.lineTo(splinePoints[p].x, splinePoints[p].y);
          }
          ctx.stroke();
        }
        ctx.restore();

        // 4. Curved Traveling Comet Flare
        if (activeWordIndex < totalWords - 1) {
          const targetIndex = Math.min(splinePoints.length - 1, Math.floor((activeWordIndex + vocalProgress) * numSubSteps));
          const cometPt = splinePoints[targetIndex] || splinePoints[0];
          drawStarlightFlare(cometPt.x, cometPt.y, 1.05 + audioData.beatPulse * 0.50, tintRGB, 1.20);

          for (let trail = 1; trail <= 6; trail++) {
            const trIdx = Math.max(0, targetIndex - trail * 3);
            const trPt = splinePoints[trIdx];
            if (trPt) {
              drawStarlightFlare(trPt.x, trPt.y, 0.55 / trail, [245, 235, 255], 0.38);
            }
          }
        }
      }

      // 5. Render Word Nodes, Astrolabe Rings & Typography
      let basePx = 50;
      let heroPx = 74;
      if (totalWords >= 8) { basePx = 36; heroPx = 52; }
      else if (totalWords >= 5) { basePx = 44; heroPx = 64; }

      for (let i = 0; i < totalWords; i++) {
        const node = nodes[i];
        const sp = wordSpringsRef.current[i] || { activation: 0, liftY: 0, ringExpand: 0 };
        const heroWeight = sp.activation;
        const isActive = (i === activeWordIndex);
        const isPast = (i < activeWordIndex);
        const wordAlpha = isActive ? 1.0 : (isPast ? 0.72 : 0.45);

        const wordX = node.x + node.ox;
        const wordY = node.y + node.oy + sp.liftY * scaleFactor;
        const fontPx = (basePx + (heroPx - basePx) * heroWeight) * Math.max(0.85, scaleFactor);

        ctx.save();
        ctx.font = `italic 400 ${fontPx.toFixed(1)}px "Cormorant Garamond", Georgia, serif`;
        const textMetrics = ctx.measureText(node.text);
        const textWidth = textMetrics.width;
        ctx.restore();

        // Astrolabe Gimbal
        if (node.hasRing || isActive || heroWeight > 0.25) {
          const ringCx = wordX + (node.ox === 0 ? 0 : (node.ox > 0 ? textWidth * 0.45 : -textWidth * 0.45));
          const ringCy = wordY - fontPx * 0.28;
          const ringRx = Math.max(textWidth * 0.74, 58 * scaleFactor) * (1.05 + sp.ringExpand * 0.12);
          const ringRy = ringRx * (0.46 - heroWeight * 0.08);
          drawAstrolabeGimbal(ringCx, ringCy, ringRx, ringRy, i === 0 ? -0.16 : 0.12, heroWeight, wordAlpha, elapsed, tintRGB, secRGB);
        }

        // Node Star Flare
        drawStarlightFlare(node.x, node.y, (isActive ? 1.20 : (isPast ? 0.52 : 0.38)) * wordAlpha, isActive ? tintRGB : [195, 185, 230], isActive ? 1.25 : 0.80);

        // Word Typography with Halation Bloom
        ctx.save();
        ctx.translate(wordX, wordY);
        if (node.rot !== 0) ctx.rotate(node.rot);
        ctx.font = `italic 400 ${fontPx.toFixed(1)}px "Cormorant Garamond", Georgia, serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';

        if (isActive || heroWeight > 0.05) {
          // Halation passes
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.shadowColor = `rgba(${pr}, ${pg}, ${pb}, ${0.85 * heroWeight * wordAlpha})`;
          ctx.shadowBlur = 28 * scaleFactor;
          ctx.fillStyle = `rgba(255, 255, 255, ${wordAlpha})`;
          ctx.fillText(node.text, 0, 0);

          ctx.shadowColor = `rgba(255, 242, 250, ${0.95 * heroWeight * wordAlpha})`;
          ctx.shadowBlur = 10 * scaleFactor;
          ctx.fillText(node.text, 0, 0);
          ctx.restore();

          // Core text
          ctx.fillStyle = `rgba(255, 255, 255, ${wordAlpha})`;
          ctx.fillText(node.text, 0, 0);

          // Specular gleam across text
          if (isActive && vocalProgress > 0.02 && vocalProgress < 0.98) {
            ctx.save();
            const gleamSpan = textWidth * 0.5;
            const gleamCenter = (vocalProgress - 0.5) * textWidth * 1.4;
            const gleamGrad = ctx.createLinearGradient(gleamCenter - gleamSpan, 0, gleamCenter + gleamSpan, 0);
            gleamGrad.addColorStop(0.0, 'rgba(255, 255, 255, 0)');
            gleamGrad.addColorStop(0.5, `rgba(255, 255, 255, ${0.95 * wordAlpha})`);
            gleamGrad.addColorStop(1.0, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = gleamGrad;
            ctx.fillText(node.text, 0, 0);
            ctx.restore();
          }
        } else if (isPast) {
          ctx.fillStyle = `rgba(220, 212, 238, ${wordAlpha * 0.88})`;
          ctx.fillText(node.text, 0, 0);
        } else {
          ctx.fillStyle = `rgba(182, 172, 208, ${wordAlpha * 0.70})`;
          ctx.fillText(node.text, 0, 0);
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
  }, [lineWords, activeWordIndex, vocalProgress, isVocal, audioData, palette, onActiveNodeChange]);

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
