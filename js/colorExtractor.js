/* =========================================================================
   COLOR EXTRACTOR MODULE (DYNAMIC ALBUM ART PALETTE GENERATOR)
   ========================================================================= */

window.SongNode = window.SongNode || {};

(function(exports) {
  // Default luxury palette
  const DEFAULT_PALETTE = {
    dominant: { r: 18, g: 6, b: 24 },       // Deep plum/obsidian mesh
    vibrant:  { r: 255, g: 42, b: 109 },     // Radiant hot ruby/rose glow
    muted:    { r: 6, g: 2, b: 10 },         // Atmospheric vignette base
    accent:   { r: 184, g: 176, b: 232 }     // Delicate ethereal lilac
  };

  class ColorExtractor {
    constructor() {
      this.current = {
        dominant: { ...DEFAULT_PALETTE.dominant },
        vibrant:  { ...DEFAULT_PALETTE.vibrant },
        muted:    { ...DEFAULT_PALETTE.muted },
        accent:   { ...DEFAULT_PALETTE.accent }
      };

      this.target = {
        dominant: { ...DEFAULT_PALETTE.dominant },
        vibrant:  { ...DEFAULT_PALETTE.vibrant },
        muted:    { ...DEFAULT_PALETTE.muted },
        accent:   { ...DEFAULT_PALETTE.accent }
      };

      // Offscreen canvas for sampling
      this.sampleCanvas = document.createElement('canvas');
      this.sampleCanvas.width = 16;
      this.sampleCanvas.height = 16;
      this.sampleCtx = this.sampleCanvas.getContext('2d', { willReadFrequently: true });
    }

    // Process Base64 or Image URL
    extractFromImage(imgSrc) {
      if (!imgSrc) {
        this.resetToDefault();
        return;
      }

      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        try {
          this.sampleCtx.drawImage(img, 0, 0, 16, 16);
          const imgData = this.sampleCtx.getImageData(0, 0, 16, 16).data;
          this.analyzePixelBuffer(imgData);
        } catch (e) {
          console.warn('[ColorExtractor] Sample error:', e);
          this.resetToDefault();
        }
      };
      img.onerror = () => this.resetToDefault();
      img.src = imgSrc;
    }

    analyzePixelBuffer(data) {
      let maxSat = -1;
      let vibrantColor = { ...DEFAULT_PALETTE.vibrant };
      let totalR = 0, totalG = 0, totalB = 0;
      const count = data.length / 4;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        totalR += r;
        totalG += g;
        totalB += b;

        // RGB to Saturation & Brightness
        const max = Math.max(r, g, b) / 255;
        const min = Math.min(r, g, b) / 255;
        const delta = max - min;
        const sat = max === 0 ? 0 : delta / max;
        const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;

        // Seek high saturation with medium-to-high brightness for the glowing pass
        if (sat > maxSat && brightness > 0.35 && brightness < 0.85) {
          maxSat = sat;
          vibrantColor = { r, g, b };
        }
      }

      // Dominant backdrop color (darkened and enriched)
      const avgR = Math.max(10, Math.min(50, Math.round(totalR / count * 0.35)));
      const avgG = Math.max(4, Math.min(30, Math.round(totalG / count * 0.35)));
      const avgB = Math.max(15, Math.min(60, Math.round(totalB / count * 0.35)));

      this.target.dominant = { r: avgR, g: avgG, b: avgB };
      this.target.vibrant = vibrantColor;
      this.target.muted = {
        r: Math.round(avgR * 0.3),
        g: Math.round(avgG * 0.3),
        b: Math.round(avgB * 0.3)
      };
    }

    resetToDefault() {
      this.target.dominant = { ...DEFAULT_PALETTE.dominant };
      this.target.vibrant  = { ...DEFAULT_PALETTE.vibrant };
      this.target.muted    = { ...DEFAULT_PALETTE.muted };
      this.target.accent   = { ...DEFAULT_PALETTE.accent };
    }

    // Smooth continuous color interpolation in render loop
    update(dt) {
      const ease = 1.0 - Math.exp(-3.5 * dt);

      for (const key of ['dominant', 'vibrant', 'muted', 'accent']) {
        this.current[key].r += (this.target[key].r - this.current[key].r) * ease;
        this.current[key].g += (this.target[key].g - this.current[key].g) * ease;
        this.current[key].b += (this.target[key].b - this.current[key].b) * ease;
      }
    }

    getCssRgba(key, alpha = 1) {
      const c = this.current[key];
      return `rgba(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)}, ${alpha})`;
    }
  }

  exports.ColorExtractor = ColorExtractor;
})(window.SongNode);

