/* =========================================================================
   RENDERER MODULE (HIGH-PERFORMANCE MULTI-PASS ADDITIVE CANVAS ENGINE)
   ========================================================================= */

window.SongNode = window.SongNode || {};

(function(exports) {
  class Renderer {
    constructor(canvas, nodePool, colorExtractor, audioReact) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d', { alpha: false });
      this.nodePool = nodePool;
      this.colorExtractor = colorExtractor;
      this.audioReact = audioReact;

      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);

      // Stardust particle system (60-80 tiny background stars)
      this.stardust = [];
      this.initStardust(75);

      // Photon pulses along the S-spline
      this.photons = [
        { t: 0.1, speed: 0.22, size: 4 },
        { t: 0.5, speed: 0.28, size: 5 },
        { t: 0.8, speed: 0.18, size: 3 }
      ];

      this.resize();
      window.addEventListener('resize', () => this.resize());
    }

    initStardust(count) {
      this.stardust = [];
      for (let i = 0; i < count; i++) {
        this.stardust.push({
          x: (Math.random() - 0.5) * 1600,
          y: (Math.random() - 0.5) * 1000,
          size: Math.random() * 1.8 + 0.8,
          phase: Math.random() * Math.PI * 2,
          speed: Math.random() * 0.4 + 0.2,
          alpha: Math.random() * 0.45 + 0.15
        });
      }
    }

    resize() {
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.canvas.width = this.width * this.dpr;
      this.canvas.height = this.height * this.dpr;
      this.canvas.style.width = `${this.width}px`;
      this.canvas.style.height = `${this.height}px`;

      this.nodePool.updateLayout(this.width, this.height);
    }

    // Master Render Frame
    render(dt, time) {
      const ctx = this.ctx;
      const w = this.width;
      const h = this.height;
      const dpr = this.dpr;

      // Extract real-time audio parameters
      const audio = this.audioReact.update(dt);
      this.colorExtractor.update(dt);

      // 1. CLEAR & RENDER PROCEDURAL LIQUID MESH GRADIENT
      ctx.save();
      ctx.scale(dpr, dpr);

      this.renderMeshBackground(ctx, w, h, time, audio);

      // 2. AMBIENT STARDUST
      this.renderStardust(ctx, w, h, time, audio);

      // 3. SET ADDITIVE BLENDING FOR ALL GLOWS & NODES (ZERO ctx.shadowBlur!)
      ctx.globalCompositeOperation = 'screen';

      // 4. MULTI-PASS CRADLE S-SPLINE & PHOTON PULSES
      this.renderSplineAndPhotons(ctx, w, h, dt, audio);

      // 5. 5-WORD FOCAL WINDOW (THIN SERIF + MULTI-PASS GLOW)
      this.renderWordNodes(ctx, w, h, audio);

      ctx.restore();
    }

    // 1. Procedural Liquid Mesh Gradient (Driven by Palette & Audio)
    renderMeshBackground(ctx, w, h, time, audio) {
      // Inky obsidian base
      ctx.fillStyle = this.colorExtractor.getCssRgba('muted', 1.0);
      ctx.fillRect(0, 0, w, h);

      // Slow moving mesh blobs
      const t = time * 0.0006;
      const cx1 = w * 0.5 + Math.cos(t * 1.2) * (w * 0.22);
      const cy1 = h * 0.5 + Math.sin(t * 0.9) * (h * 0.18);
      const r1 = Math.max(w, h) * (0.65 + audio.bass * 0.12);

      const grad1 = ctx.createRadialGradient(cx1, cy1, 0, cx1, cy1, r1);
      grad1.addColorStop(0, this.colorExtractor.getCssRgba('dominant', 0.85));
      grad1.addColorStop(0.5, this.colorExtractor.getCssRgba('muted', 0.45));
      grad1.addColorStop(1, 'rgba(1, 0, 3, 0)');
      ctx.fillStyle = grad1;
      ctx.fillRect(0, 0, w, h);

      // Subtle ruby bounce on right rim
      const cx2 = w * 0.75 + Math.sin(t * 1.5) * (w * 0.15);
      const cy2 = h * 0.65 + Math.cos(t * 1.1) * (h * 0.15);
      const grad2 = ctx.createRadialGradient(cx2, cy2, 0, cx2, cy2, r1 * 0.55);
      grad2.addColorStop(0, this.colorExtractor.getCssRgba('vibrant', 0.18 + audio.bass * 0.15));
      grad2.addColorStop(1, 'rgba(1, 0, 3, 0)');
      ctx.fillStyle = grad2;
      ctx.fillRect(0, 0, w, h);
    }

    // 2. Ambient Stardust
    renderStardust(ctx, w, h, time, audio) {
      const cx = w * 0.5;
      const cy = h * 0.5;
      const speedMult = 1.0 + audio.mids * 1.8;

      ctx.fillStyle = '#ffffff';
      for (const star of this.stardust) {
        const driftY = Math.sin(time * 0.001 * star.speed * speedMult + star.phase) * 12;
        const x = cx + star.x;
        const y = cy + star.y + driftY;

        ctx.globalAlpha = star.alpha * (0.8 + audio.treble * 0.4);
        ctx.beginPath();
        ctx.arc(x, y, star.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1.0;
    }

    // 3. Multi-Pass Bezier Cradle Spline (Zero ShadowBlur)
    renderSplineAndPhotons(ctx, w, h, dt, audio) {
      const cx = w * 0.5;
      const cy = h * 0.5;
      const nodes = this.nodePool.nodes;

      // Extract anchor points from nodes
      // Note: Node 2 (Hero) has a cradle dip underneath it so the line never slices letters!
      const p0 = { x: cx + nodes[0].x, y: cy + nodes[0].y + nodes[0].floatY };
      const p1 = { x: cx + nodes[1].x, y: cy + nodes[1].y + nodes[1].floatY + 15 };
      const pHeroBead = { x: cx + nodes[2].x + 115, y: cy + nodes[2].y + nodes[2].floatY - 8 };
      const pCradle = { x: cx + nodes[2].x - 45, y: cy + nodes[2].y + nodes[2].floatY + 48 }; // Swoops cleanly UNDER hero!
      const p3 = { x: cx + nodes[3].x, y: cy + nodes[3].y + nodes[3].floatY + 15 };
      const p4 = { x: cx + nodes[4].x, y: cy + nodes[4].y + nodes[4].floatY };

      // Trace the complete S-curve with cradle routing
      const traceSpline = (c) => {
        c.beginPath();
        c.moveTo(p0.x - 160, p0.y - 70);
        c.bezierCurveTo(p0.x - 60, p0.y - 20, p0.x, p0.y, p0.x, p0.y);
        c.bezierCurveTo(p0.x + 80, p0.y + 30, p1.x - 70, p1.y - 20, p1.x, p1.y);
        // Cradle swoop UNDER hero
        c.bezierCurveTo(p1.x + 80, p1.y + 20, pCradle.x - 40, pCradle.y, pCradle.x, pCradle.y);
        c.bezierCurveTo(pCradle.x + 60, pCradle.y, pHeroBead.x - 40, pHeroBead.y + 20, pHeroBead.x, pHeroBead.y);
        // Down into next nodes
        c.bezierCurveTo(pHeroBead.x + 60, pHeroBead.y - 15, p3.x - 70, p3.y - 20, p3.x, p3.y);
        c.bezierCurveTo(p3.x + 70, p3.y + 20, p4.x - 70, p4.y - 20, p4.x, p4.y);
        c.bezierCurveTo(p4.x + 80, p4.y + 30, p4.x + 160, p4.y + 70, p4.x + 220, p4.y + 90);
      };

      const vibrantRgba = (a) => this.colorExtractor.getCssRgba('vibrant', a);
      const lilacRgba = (a) => this.colorExtractor.getCssRgba('accent', a);

      // MULTI-PASS ADDITIVE STROKES:
      // Pass 1: Wide Ambient Glow (12px, opacity 0.12)
      ctx.lineWidth = 14;
      ctx.strokeStyle = vibrantRgba(0.12 * (0.8 + audio.mids * 0.4));
      traceSpline(ctx);
      ctx.stroke();

      // Pass 2: Medium Soft Glow (4.5px, opacity 0.40)
      ctx.lineWidth = 4.5;
      ctx.strokeStyle = vibrantRgba(0.40 * (0.9 + audio.mids * 0.3));
      traceSpline(ctx);
      ctx.stroke();

      // Pass 3: Crisp Core Laser Fiber (1.5px, opacity 0.95)
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = lilacRgba(0.95);
      traceSpline(ctx);
      ctx.stroke();

      // Moving Photon Pulses along active spline
      for (const photon of this.photons) {
        photon.t = (photon.t + dt * photon.speed * (1.0 + audio.mids * 0.5)) % 1.0;

        // Approximate point along S-curve
        const ptX = (1 - photon.t) * (p0.x - 100) + photon.t * (p4.x + 150);
        const ptY = (1 - photon.t) * (p0.y - 50) + photon.t * (p4.y + 60) + Math.sin(photon.t * Math.PI) * 45;

        // Additive multi-pass photon glow
        ctx.fillStyle = vibrantRgba(0.25);
        ctx.beginPath();
        ctx.arc(ptX, ptY, photon.size * 3.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ptX, ptY, photon.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 4. 5-Word Focal Window Rendering (Thin Serif + Multi-Pass Glow)
    renderWordNodes(ctx, w, h, audio) {
      const cx = w * 0.5;
      const cy = h * 0.5;
      const nodes = this.nodePool.nodes;

      const vibrantRgba = (a) => this.colorExtractor.getCssRgba('vibrant', a);
      const lilacRgba = (a) => this.colorExtractor.getCssRgba('accent', a);

      for (let i = 0; i < 5; i++) {
        const node = nodes[i];
        if (!node.text || node.opacity < 0.01) continue;

        const posX = cx + node.x;
        const posY = cy + node.y + node.floatY;
        const isHero = (node.slotIndex === 2);

        // Bass/Kick scale multiplier applied to Hero word
        const scaleMult = isHero ? (node.scale * audio.kickScale) : node.scale;

        ctx.save();
        ctx.translate(posX, posY);
        ctx.scale(scaleMult, scaleMult);

        // A. CONCENTRIC ORBITAL RINGS & RADIAL CROSSHAIRS (Hero Only)
        if (node.heroPhase > 0.02) {
          const hOp = node.opacity * node.heroPhase;

          // Expanding Ripple Wave on Kick
          const rippleRadius = audio.orbitalRipple * 45;

          // Inner Ellipse (Tilted -16 deg)
          ctx.save();
          ctx.rotate(-0.28);

          // Pass 1: Ambient Ring Glow
          ctx.lineWidth = 6;
          ctx.strokeStyle = vibrantRgba(0.22 * hOp);
          ctx.beginPath();
          ctx.ellipse(0, 0, 130 + rippleRadius, 58 + rippleRadius * 0.45, 0, 0, Math.PI * 2);
          ctx.stroke();

          // Pass 2: Crisp Core Ring
          ctx.lineWidth = 1.4;
          ctx.strokeStyle = vibrantRgba(0.95 * hOp);
          ctx.beginPath();
          ctx.ellipse(0, 0, 130 + rippleRadius, 58 + rippleRadius * 0.45, 0, 0, Math.PI * 2);
          ctx.stroke();

          // Outer Concentric Ring
          ctx.lineWidth = 1.2;
          ctx.strokeStyle = vibrantRgba(0.35 * hOp);
          ctx.beginPath();
          ctx.ellipse(0, 0, 175, 78, 0, 0, Math.PI * 2);
          ctx.stroke();

          // Radial Crosshairs
          ctx.lineWidth = 1.0;
          ctx.strokeStyle = `rgba(255, 255, 255, ${0.20 * hOp})`;
          ctx.beginPath();
          ctx.moveTo(-160, 0); ctx.lineTo(160, 0);
          ctx.moveTo(0, -70); ctx.lineTo(0, 70);
          ctx.stroke();

          ctx.restore();

          // Radial Magenta Ambient Bloom Billboard
          const gradBloom = ctx.createRadialGradient(0, 0, 0, 0, 0, 160);
          gradBloom.addColorStop(0, vibrantRgba(0.70 * hOp));
          gradBloom.addColorStop(0.4, vibrantRgba(0.25 * hOp));
          gradBloom.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = gradBloom;
          ctx.fillRect(-160, -90, 320, 180);
        } else {
          // Non-Hero Single Tilted Ring
          ctx.save();
          ctx.rotate(-0.26);
          ctx.lineWidth = 1.0;
          ctx.strokeStyle = lilacRgba(0.35 * node.opacity);
          ctx.beginPath();
          ctx.ellipse(0, 0, 58, 28, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        // B. TYPOGRAPHY: THIN 400 ITALIC WITH MULTI-PASS ADDITIVE GLOW
        const baseFontSize = isHero ? 72 : 46;
        ctx.font = `italic 400 ${baseFontSize}px 'Playfair Display', 'Cormorant Garamond', Georgia, serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (isHero) {
          // Pass 1: Wide Outer Ruby Glow (14px)
          ctx.lineWidth = 12;
          ctx.strokeStyle = vibrantRgba(0.65 * node.opacity);
          ctx.strokeText(node.text, 0, 0);

          // Pass 2: Mid Rose Radiance (4px)
          ctx.lineWidth = 4;
          ctx.strokeStyle = vibrantRgba(0.95 * node.opacity);
          ctx.strokeText(node.text, 0, 0);

          // Pass 3: Luminous White Solid Core
          ctx.fillStyle = `rgba(255, 255, 255, ${node.opacity})`;
          ctx.fillText(node.text, 0, 0);
        } else {
          // Non-Hero: Crisp Solid White with Soft Ethereal Lilac Halos
          ctx.lineWidth = 3.5;
          ctx.strokeStyle = lilacRgba(0.45 * node.opacity);
          ctx.strokeText(node.text, 0, 0);

          ctx.fillStyle = `rgba(255, 255, 255, ${node.opacity})`;
          ctx.fillText(node.text, 0, 0);
        }

        // C. ANCHOR BEAD & ANAMORPHIC FLARE
        const beadX = isHero ? 88 : 0;
        const beadY = isHero ? -12 : 28;

        // Anamorphic horizontal flare wings
        const flareW = isHero ? 85 : 32;
        const flareH = isHero ? 4 : 2;

        const gradFlare = ctx.createLinearGradient(beadX - flareW, beadY, beadX + flareW, beadY);
        gradFlare.addColorStop(0, 'rgba(255, 255, 255, 0)');
        gradFlare.addColorStop(0.5, isHero ? vibrantRgba(node.opacity) : lilacRgba(node.opacity * 0.8));
        gradFlare.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.fillStyle = gradFlare;
        ctx.fillRect(beadX - flareW, beadY - flareH * 0.5, flareW * 2, flareH);

        // Core white bead spark
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(beadX, beadY, isHero ? 3.5 : 2.0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }
    }
  }

  exports.Renderer = Renderer;
})(window.SongNode);

