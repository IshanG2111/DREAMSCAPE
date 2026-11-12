/* =========================================================================
   SCENE RENDERER (CANVAS 2D EDITORIAL FOREGROUND ENGINE)
   Renders the rose spline filament, luminous word nodes, ivory Didone typography,
   ruby optical blooms, and traveling photon pulses with camera transform.
   ========================================================================= */

window.SongNode = window.SongNode || {};

(function(exports) {
  class SceneRenderer {
    constructor(canvas, wordGraph, splinePath, cameraRig) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d', { alpha: true });
      this.wordGraph = wordGraph;
      this.splinePath = splinePath;
      this.camera = cameraRig;

      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);

      // Traveling photon pulse on the spline
      this.photonProgress = 0.25;
      this.photonSpeed = 0.08;

      // Ambient stardust (sparse dust only, restrained)
      this.stardust = [];
      this.initStardust(45);

      this.resize();
    }

    initStardust(count) {
      this.stardust = [];
      for (let i = 0; i < count; i++) {
        this.stardust.push({
          x: (Math.random() - 0.5) * 1600,
          y: (Math.random() - 0.5) * 900,
          size: Math.random() * 1.4 + 0.6,
          baseAlpha: Math.random() * 0.25 + 0.10,
          phase: Math.random() * Math.PI * 2,
          speed: Math.random() * 0.4 + 0.2
        });
      }
    }

    resize(width = window.innerWidth, height = window.innerHeight) {
      this.width = width;
      this.height = height;
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);

      this.canvas.width = Math.round(width * this.dpr);
      this.canvas.height = Math.round(height * this.dpr);

      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.scale(this.dpr, this.dpr);
    }

    render(dt, timeSec, audio = null) {
      const ctx = this.ctx;
      const w = this.width;
      const h = this.height;

      // Clear foreground canvas
      ctx.clearRect(0, 0, w, h);

      // Build spline path from updated node anchors
      this.splinePath.buildPath(this.wordGraph.splineAnchors);

      // Advance traveling photon
      this.photonProgress = (this.photonProgress + dt * this.photonSpeed) % 1.0;

      // Save canvas state and apply camera view
      ctx.save();
      this.camera.applyToContext(ctx, w, h);

      // 1. Draw sparse ambient stardust
      this.renderStardust(ctx, timeSec);

      // 2. Draw editorial stage reticle (faint elliptical guide and crosshairs from concept art)
      this.renderFocalReticle(ctx, timeSec);

      // 3. Draw single rose Catmull-Rom spline filament
      this.splinePath.drawToCanvas(ctx);

      // 4. Draw traveling photon pulse
      this.renderTravelingPhoton(ctx);

      // 5. Draw word nodes and typography
      this.renderNodes(ctx);

      ctx.restore();
    }

    renderStardust(ctx, timeSec) {
      ctx.save();
      ctx.fillStyle = "#ffffff";
      for (const star of this.stardust) {
        const twinkle = Math.sin(timeSec * star.speed + star.phase) * 0.35 + 0.65;
        ctx.globalAlpha = star.baseAlpha * twinkle;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // Faint elliptical framing & delicate crosshairs as seen in concept art
    renderFocalReticle(ctx, timeSec) {
      ctx.save();
      const heroNode = this.wordGraph.getActiveNode();
      if (!heroNode || heroNode.currentOpacity < 0.1) {
        ctx.restore();
        return;
      }

      const hx = heroNode.anchorX;
      const hy = heroNode.anchorY - 10;
      const alpha = heroNode.currentOpacity * 0.28;

      ctx.translate(hx, hy);
      ctx.rotate(-0.08); // Slight organic tilt

      // Delicate elliptical guide ring
      ctx.strokeStyle = `rgba(255, 138, 184, ${alpha * 0.6})`;
      ctx.lineWidth = 0.75;
      ctx.beginPath();
      ctx.ellipse(0, 0, 165, 68, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Delicate crosshair ticks: + markers at cardinal points
      const tickAlpha = alpha * 0.75;
      ctx.strokeStyle = `rgba(255, 255, 255, ${tickAlpha})`;
      ctx.lineWidth = 0.85;

      // Left tick
      ctx.beginPath();
      ctx.moveTo(-185, 0); ctx.lineTo(-173, 0);
      ctx.moveTo(-179, -5); ctx.lineTo(-179, 5);
      ctx.stroke();

      // Right tick
      ctx.beginPath();
      ctx.moveTo(173, 0); ctx.lineTo(185, 0);
      ctx.moveTo(179, -5); ctx.lineTo(179, 5);
      ctx.stroke();

      // Top tick
      ctx.beginPath();
      ctx.moveTo(0, -82); ctx.lineTo(0, -72);
      ctx.moveTo(-5, -77); ctx.lineTo(5, -77);
      ctx.stroke();

      // Bottom tick
      ctx.beginPath();
      ctx.moveTo(0, 72); ctx.lineTo(0, 82);
      ctx.moveTo(-5, 77); ctx.lineTo(5, 77);
      ctx.stroke();

      ctx.restore();
    }

    renderTravelingPhoton(ctx) {
      if (this.splinePath.totalApproxLength <= 0) return;
      const pt = this.splinePath.getPointAt(this.photonProgress);

      ctx.save();
      // Outer ruby glow
      const grad = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, 16);
      grad.addColorStop(0, "rgba(255, 255, 255, 0.95)");
      grad.addColorStop(0.3, "rgba(255, 138, 184, 0.85)");
      grad.addColorStop(0.7, "rgba(241, 45, 120, 0.35)");
      grad.addColorStop(1, "rgba(241, 45, 120, 0)");

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 16, 0, Math.PI * 2);
      ctx.fill();

      // Core white bead
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 2.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    renderNodes(ctx) {
      for (const node of this.wordGraph.nodes) {
        if (!node.text || node.currentOpacity <= 0.01) continue;

        const isHero = (node.slotIndex === 0);

        // 1. Draw Anchor Bead on the Spline
        this.renderNodeAnchor(ctx, node, isHero);

        // 2. Draw Word Typography
        this.renderNodeText(ctx, node, isHero);
      }
    }

    renderNodeAnchor(ctx, node, isHero) {
      ctx.save();
      const ax = node.anchorX;
      const ay = node.anchorY;
      const opacity = node.currentOpacity;

      if (isHero) {
        // HERO ACTIVE NODE: Large ruby radiant bloom + anamorphic glint
        // Pass 1: Ruby radiant bloom halo
        const bloomRadius = 38 * node.currentBloom;
        if (bloomRadius > 2) {
          const grad = ctx.createRadialGradient(ax, ay, 0, ax, ay, bloomRadius);
          grad.addColorStop(0, `rgba(255, 255, 255, ${0.98 * opacity})`);
          grad.addColorStop(0.22, `rgba(255, 138, 184, ${0.88 * opacity})`);
          grad.addColorStop(0.55, `rgba(241, 45, 120, ${0.45 * opacity})`);
          grad.addColorStop(1, "rgba(241, 45, 120, 0)");

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(ax, ay, bloomRadius, 0, Math.PI * 2);
          ctx.fill();
        }

        // Pass 2: Horizontal anamorphic lens flare glint line
        const glintLen = 42 * node.currentBloom;
        const flareGrad = ctx.createLinearGradient(ax - glintLen, ay, ax + glintLen, ay);
        flareGrad.addColorStop(0, "rgba(255, 138, 184, 0)");
        flareGrad.addColorStop(0.5, `rgba(255, 255, 255, ${0.95 * opacity})`);
        flareGrad.addColorStop(1, "rgba(255, 138, 184, 0)");

        ctx.strokeStyle = flareGrad;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(ax - glintLen, ay);
        ctx.lineTo(ax + glintLen, ay);
        ctx.stroke();

        // Pass 3: Core intense white pearl anchor dot
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(ax, ay, 3.4, 0, Math.PI * 2);
        ctx.fill();

      } else {
        // NEIGHBOUR WORD ANCHOR: Subtle glowing white/rose bead
        const rad = 2.0 * node.currentScale;
        // Subtle halo
        ctx.fillStyle = `rgba(255, 138, 184, ${0.35 * opacity})`;
        ctx.beginPath();
        ctx.arc(ax, ay, rad * 3.0, 0, Math.PI * 2);
        ctx.fill();

        // Core dot
        ctx.fillStyle = `rgba(255, 255, 255, ${0.90 * opacity})`;
        ctx.beginPath();
        ctx.arc(ax, ay, rad, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    renderNodeText(ctx, node, isHero) {
      ctx.save();
      const lx = node.labelX;
      const ly = node.labelY;
      const scale = node.currentScale;
      const opacity = node.currentOpacity;

      ctx.translate(lx, ly);
      ctx.scale(scale, scale);

      // Didone Italic Typography (Cormorant Garamond / Playfair Display)
      const fontFamilies = "'Cormorant Garamond', 'Playfair Display', 'Bodoni Moda', Didot, Georgia, serif";
      const fontSize = isHero ? 88 : (Math.abs(node.slotIndex) === 1 ? 46 : 38);

      ctx.font = `italic 400 ${fontSize}px ${fontFamilies}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      if (isHero) {
        // Active word: Ivory with ruby bloom behind it
        // Underpass optical glow
        ctx.shadowColor = "rgba(241, 45, 120, 0.45)";
        ctx.shadowBlur = 18;
        ctx.fillStyle = `rgba(247, 238, 243, ${opacity})`;
        ctx.fillText(node.text, 0, 0);

        // Core crisp text (crisp edges, zero blur)
        ctx.shadowBlur = 0;
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.98})`;
        ctx.fillText(node.text, 0, 0);
      } else {
        // Supporting words: Lower contrast, smaller, receding into depth
        ctx.shadowBlur = 0;
        ctx.fillStyle = `rgba(217, 213, 223, ${opacity * 0.85})`;
        ctx.fillText(node.text, 0, 0);
      }

      ctx.restore();
    }
  }

  exports.SceneRenderer = SceneRenderer;
})(window.SongNode);

