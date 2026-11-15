/* =========================================================================
   IRIDESCENT 3D TRANSLUCENT BUBBLES
   Renders atmospheric floating liquid-metal / soap bubbles with chromatic
   thin-film refraction, specular highlights, and audio-reactive buoyancy.
   All coordinates are relative to the canvas center (0, 0).
   ========================================================================= */

window.SongNode = window.SongNode || {};

(function(exports) {
  class IridescentBubble {
    constructor(cfg) {
      this.baseX = cfg.x; // relative to screen center (0, 0)
      this.baseY = cfg.y;
      this.radius = cfg.radius;
      this.phase = cfg.phase || Math.random() * Math.PI * 2;
      this.speed = cfg.speed || 0.4;
      this.driftAmpX = cfg.driftAmpX || 15;
      this.driftAmpY = cfg.driftAmpY || 12;
      this.opacity = cfg.opacity || 0.85;

      this.currentX = 0;
      this.currentY = 0;
      this.pulseScale = 1.0;
    }

    update(timeSec, dt, bass = 0) {
      // Harmonic floating physics
      const offsetX = Math.sin(timeSec * this.speed + this.phase) * this.driftAmpX;
      const offsetY = Math.cos(timeSec * (this.speed * 0.8) + this.phase) * this.driftAmpY;
      this.currentX = this.baseX + offsetX;
      this.currentY = this.baseY + offsetY;

      // Bass pulse expansion
      const targetScale = 1.0 + bass * 0.12;
      this.pulseScale += (targetScale - this.pulseScale) * Math.min(1.0, dt * 8.0);
    }

    draw(ctx, colorExtractor = null) {
      const cx = this.currentX;
      const cy = this.currentY;
      const r = this.radius * this.pulseScale;

      ctx.save();
      ctx.translate(cx, cy);

      // 1. Soft Ambient Drop Glow / Volume Depth
      const depthGrad = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r);
      depthGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      depthGrad.addColorStop(0.7, 'rgba(8, 11, 24, 0.12)');
      depthGrad.addColorStop(1, 'rgba(25, 16, 45, 0.45)');
      ctx.fillStyle = depthGrad;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();

      // 2. Chromatic Iridescent Rim (Cyan, Violet, Gold interference)
      const primaryColor = colorExtractor ? colorExtractor.getCssRgba('primary', 0.65) : 'rgba(141, 101, 255, 0.65)';
      const secondaryColor = colorExtractor ? colorExtractor.getCssRgba('secondary', 0.70) : 'rgba(106, 158, 255, 0.70)';

      // Outer delicate iridescent boundary
      ctx.lineWidth = 1.8;
      const rimGrad = ctx.createLinearGradient(-r, -r, r, r);
      rimGrad.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
      rimGrad.addColorStop(0.25, secondaryColor);
      rimGrad.addColorStop(0.65, primaryColor);
      rimGrad.addColorStop(0.85, 'rgba(100, 240, 255, 0.75)');
      rimGrad.addColorStop(1, 'rgba(255, 255, 255, 0.90)');

      ctx.strokeStyle = rimGrad;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();

      // 3. Fresnel Edge Reflection Ring (Subtle inner glow)
      const fresnelGrad = ctx.createRadialGradient(0, 0, r * 0.78, 0, 0, r);
      fresnelGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
      fresnelGrad.addColorStop(0.85, 'rgba(141, 101, 255, 0.22)');
      fresnelGrad.addColorStop(1, 'rgba(255, 255, 255, 0.65)');
      ctx.fillStyle = fresnelGrad;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();

      // 4. Primary Specular Highlight (Key studio light crescent on top-left)
      ctx.save();
      ctx.rotate(-0.65);
      const specGrad = ctx.createRadialGradient(-r * 0.42, -r * 0.45, 0, -r * 0.42, -r * 0.45, r * 0.35);
      specGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      specGrad.addColorStop(0.35, 'rgba(240, 245, 255, 0.75)');
      specGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

      ctx.fillStyle = specGrad;
      ctx.beginPath();
      ctx.ellipse(-r * 0.42, -r * 0.45, r * 0.28, r * 0.14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 5. Secondary Rim Bounce Glint (Bottom-right subtle crescent)
      ctx.save();
      ctx.rotate(2.4);
      const bounceGrad = ctx.createRadialGradient(-r * 0.55, -r * 0.55, 0, -r * 0.55, -r * 0.55, r * 0.28);
      bounceGrad.addColorStop(0, 'rgba(255, 255, 255, 0.65)');
      bounceGrad.addColorStop(0.4, primaryColor);
      bounceGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = bounceGrad;
      ctx.beginPath();
      ctx.ellipse(-r * 0.55, -r * 0.55, r * 0.22, r * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.restore();
    }
  }

  class BubbleManager {
    constructor() {
      // Positions relative to canvas center (0, 0)
      this.bubbles = [
        // 1. Prominent top-right bubble (Reference image approx x: +370, y: -240)
        new IridescentBubble({
          x: 370,
          y: -240,
          radius: 46,
          phase: 0.0,
          speed: 0.35,
          driftAmpX: 14,
          driftAmpY: 10
        }),
        // 2. Bottom-left bubble (Reference image approx x: -580, y: 70)
        new IridescentBubble({
          x: -580,
          y: 70,
          radius: 34,
          phase: 1.8,
          speed: 0.42,
          driftAmpX: 12,
          driftAmpY: 14
        }),
        // 3. Delicate smaller floating bubble (bottom right-ish, x: 440, y: 190)
        new IridescentBubble({
          x: 440,
          y: 190,
          radius: 20,
          phase: 3.5,
          speed: 0.50,
          driftAmpX: 8,
          driftAmpY: 8
        }),
        // 4. Subtle tiny micro-bubble (bottom center, x: -30, y: 280)
        new IridescentBubble({
          x: -30,
          y: 280,
          radius: 12,
          phase: 5.1,
          speed: 0.55,
          driftAmpX: 6,
          driftAmpY: 6
        })
      ];
    }

    update(timeSec, dt, bass = 0) {
      for (const b of this.bubbles) {
        b.update(timeSec, dt, bass);
      }
    }

    draw(ctx, colorExtractor = null) {
      for (const b of this.bubbles) {
        b.draw(ctx, colorExtractor);
      }
    }
  }

  exports.BubbleManager = BubbleManager;
})(window.SongNode);
