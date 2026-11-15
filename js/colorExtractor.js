/* =========================================================================
   COLOR EXTRACTOR MODULE (DYNAMIC ALBUM ART PALETTE GENERATOR & INTERPOLATOR)
   Extracts cohesive iridescent ocean / liquid chrome palettes from album covers
   and smoothly transitions WebGL shaders, constellation engines, and UI.
   ========================================================================= */

window.SongNode = window.SongNode || {};

(function(exports) {
  // Iconic Currents Reference Palette (Default)
  const CURRENTS_PALETTE = {
    abyss:     { r: 3,   g: 3,   b: 7   }, // #030307 Abyss Black
    depth:     { r: 8,   g: 11,  b: 24  }, // #080B18 Midnight Navy / Deep Indigo
    primary:   { r: 141, g: 101, b: 255 }, // #8D65FF Iridescent Violet
    secondary: { r: 106, g: 158, b: 255 }, // #6A9EFF Electric Blue
    highlight: { r: 197, g: 201, b: 228 }, // #C5C9E4 Liquid Silver
    pearl:     { r: 241, g: 234, b: 251 }  // #F1EAFB Pearl White
  };

  class ColorExtractor {
    constructor() {
      this.current = {
        abyss:     { ...CURRENTS_PALETTE.abyss },
        depth:     { ...CURRENTS_PALETTE.depth },
        primary:   { ...CURRENTS_PALETTE.primary },
        secondary: { ...CURRENTS_PALETTE.secondary },
        highlight: { ...CURRENTS_PALETTE.highlight },
        pearl:     { ...CURRENTS_PALETTE.pearl }
      };

      this.target = {
        abyss:     { ...CURRENTS_PALETTE.abyss },
        depth:     { ...CURRENTS_PALETTE.depth },
        primary:   { ...CURRENTS_PALETTE.primary },
        secondary: { ...CURRENTS_PALETTE.secondary },
        highlight: { ...CURRENTS_PALETTE.highlight },
        pearl:     { ...CURRENTS_PALETTE.pearl }
      };

      // Offscreen canvas for fast pixel sampling
      this.sampleCanvas = document.createElement('canvas');
      this.sampleCanvas.width = 32;
      this.sampleCanvas.height = 32;
      this.sampleCtx = this.sampleCanvas.getContext('2d', { willReadFrequently: true });

      this.activeArtworkUrl = null;
      this.transitionSpeed = 3.2; // Smooth cinematic ease
    }

    // Extract palette from Image URL or Base64 data URI
    extractFromImage(imgSrc, onComplete = null) {
      if (!imgSrc) {
        this.resetToDefault();
        if (onComplete) onComplete(this.target);
        return;
      }

      this.activeArtworkUrl = imgSrc;
      const img = new Image();
      img.crossOrigin = 'Anonymous';

      img.onload = () => {
        try {
          this.sampleCtx.clearRect(0, 0, 32, 32);
          this.sampleCtx.drawImage(img, 0, 0, 32, 32);
          const imgData = this.sampleCtx.getImageData(0, 0, 32, 32).data;
          this.analyzePixelBuffer(imgData);
          if (onComplete) onComplete(this.target);
        } catch (e) {
          console.warn('[ColorExtractor] Pixel sampling failed (possibly CORS), fallback used:', e);
          this.inferPaletteFromHeuristics();
          if (onComplete) onComplete(this.target);
        }
      };

      img.onerror = () => {
        console.warn('[ColorExtractor] Image load failed:', imgSrc);
        this.resetToDefault();
        if (onComplete) onComplete(this.target);
      };

      img.src = imgSrc;
    }

    analyzePixelBuffer(data) {
      let maxSat = -1;
      let vibrantRGB = { r: 141, g: 101, b: 255 };
      let secondaryRGB = { r: 106, g: 158, b: 255 };

      let totalR = 0, totalG = 0, totalB = 0;
      const count = data.length / 4;

      const colorBuckets = [];

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        totalR += r;
        totalG += g;
        totalB += b;

        const max = Math.max(r, g, b) / 255;
        const min = Math.min(r, g, b) / 255;
        const delta = max - min;
        const sat = max === 0 ? 0 : delta / max;
        const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;

        // Collect saturated colors
        if (sat > 0.25 && brightness > 0.25 && brightness < 0.90) {
          colorBuckets.push({ r, g, b, sat, brightness });
        }
      }

      // Sort by saturation & brightness appeal
      if (colorBuckets.length > 0) {
        colorBuckets.sort((a, b) => (b.sat * 0.6 + b.brightness * 0.4) - (a.sat * 0.6 + a.brightness * 0.4));
        vibrantRGB = { r: colorBuckets[0].r, g: colorBuckets[0].g, b: colorBuckets[0].b };

        // Find a complementary or shifted second hue
        let foundSecond = false;
        for (let j = 1; j < colorBuckets.length; j++) {
          const c = colorBuckets[j];
          const dist = Math.abs(c.r - vibrantRGB.r) + Math.abs(c.g - vibrantRGB.g) + Math.abs(c.b - vibrantRGB.b);
          if (dist > 80) {
            secondaryRGB = { r: c.r, g: c.g, b: c.b };
            foundSecond = true;
            break;
          }
        }
        if (!foundSecond) {
          // Synthesize an electric chromatic harmonic
          secondaryRGB = {
            r: Math.min(255, Math.max(0, Math.round(vibrantRGB.b * 0.9 + 20))),
            g: Math.min(255, Math.max(0, Math.round(vibrantRGB.r * 0.7 + 30))),
            b: Math.min(255, Math.max(0, Math.round(vibrantRGB.g * 1.1 + 40)))
          };
        }
      }

      // Compute deep ocean backdrop
      const avgR = totalR / count;
      const avgG = totalG / count;
      const avgB = totalB / count;

      const abyss = {
        r: Math.max(2, Math.min(16, Math.round(avgR * 0.08))),
        g: Math.max(3, Math.min(18, Math.round(avgG * 0.08))),
        b: Math.max(5, Math.min(28, Math.round(avgB * 0.12)))
      };

      const depth = {
        r: Math.max(6, Math.min(32, Math.round(avgR * 0.22 + vibrantRGB.r * 0.08))),
        g: Math.max(8, Math.min(36, Math.round(avgG * 0.22 + vibrantRGB.g * 0.08))),
        b: Math.max(16, Math.min(56, Math.round(avgB * 0.28 + vibrantRGB.b * 0.12)))
      };

      const highlight = {
        r: Math.min(255, Math.round(vibrantRGB.r * 0.35 + 165)),
        g: Math.min(255, Math.round(vibrantRGB.g * 0.35 + 168)),
        b: Math.min(255, Math.round(vibrantRGB.b * 0.35 + 185))
      };

      this.target.abyss = abyss;
      this.target.depth = depth;
      this.target.primary = vibrantRGB;
      this.target.secondary = secondaryRGB;
      this.target.highlight = highlight;
      this.target.pearl = { r: 245, g: 242, b: 252 };
    }

    inferPaletteFromHeuristics() {
      this.target.abyss     = { ...CURRENTS_PALETTE.abyss };
      this.target.depth     = { ...CURRENTS_PALETTE.depth };
      this.target.primary   = { ...CURRENTS_PALETTE.primary };
      this.target.secondary = { ...CURRENTS_PALETTE.secondary };
      this.target.highlight = { ...CURRENTS_PALETTE.highlight };
      this.target.pearl     = { ...CURRENTS_PALETTE.pearl };
    }

    setPreset(name) {
      if (name === 'currents') {
        this.target = JSON.parse(JSON.stringify(CURRENTS_PALETTE));
      } else if (name === 'depression-cherry') {
        this.target = {
          abyss:     { r: 8,   g: 2,   b: 6   },
          depth:     { r: 28,  g: 6,   b: 20  },
          primary:   { r: 240, g: 50,  b: 100 },
          secondary: { r: 255, g: 120, b: 170 },
          highlight: { r: 240, g: 210, b: 225 },
          pearl:     { r: 255, g: 245, b: 250 }
        };
      } else if (name === 'blonde') {
        this.target = {
          abyss:     { r: 4,   g: 8,   b: 6   },
          depth:     { r: 12,  g: 26,  b: 18  },
          primary:   { r: 96,  g: 210, b: 140 },
          secondary: { r: 240, g: 185, b: 90  },
          highlight: { r: 210, g: 235, b: 220 },
          pearl:     { r: 248, g: 252, b: 249 }
        };
      } else if (name === 'starboy') {
        this.target = {
          abyss:     { r: 3,   g: 4,   b: 12  },
          depth:     { r: 10,  g: 15,  b: 36  },
          primary:   { r: 255, g: 45,  b: 85  },
          secondary: { r: 70,  g: 130, b: 255 },
          highlight: { r: 200, g: 215, b: 255 },
          pearl:     { r: 245, g: 248, b: 255 }
        };
      }
    }

    resetToDefault() {
      this.target = JSON.parse(JSON.stringify(CURRENTS_PALETTE));
    }

    // Smooth continuous color interpolation in render loop
    update(dt) {
      const ease = 1.0 - Math.exp(-this.transitionSpeed * dt);

      for (const key of ['abyss', 'depth', 'primary', 'secondary', 'highlight', 'pearl']) {
        const cur = this.current[key];
        const tgt = this.target[key];
        if (cur && tgt) {
          cur.r += (tgt.r - cur.r) * ease;
          cur.g += (tgt.g - cur.g) * ease;
          cur.b += (tgt.b - cur.b) * ease;
        }
      }

      this.applyToCssVariables();
    }

    // Returns normalized [r, g, b] array (0.0 to 1.0) for WebGL GLSL uniforms
    getNormalizedGl(key) {
      const c = this.current[key] || CURRENTS_PALETTE[key];
      return [c.r / 255.0, c.g / 255.0, c.b / 255.0];
    }

    // Formats CSS rgba string
    getCssRgba(key, alpha = 1) {
      const c = this.current[key] || CURRENTS_PALETTE[key];
      return `rgba(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)}, ${alpha})`;
    }

    // Formats hex string
    getHex(key) {
      const c = this.current[key] || CURRENTS_PALETTE[key];
      const r = Math.round(c.r).toString(16).padStart(2, '0');
      const g = Math.round(c.g).toString(16).padStart(2, '0');
      const b = Math.round(c.b).toString(16).padStart(2, '0');
      return `#${r}${g}${b}`;
    }

    applyToCssVariables() {
      const root = document.documentElement;
      if (!root) return;

      root.style.setProperty('--color-abyss', this.getHex('abyss'));
      root.style.setProperty('--color-depth', this.getHex('depth'));
      root.style.setProperty('--color-primary', this.getHex('primary'));
      root.style.setProperty('--color-secondary', this.getHex('secondary'));
      root.style.setProperty('--color-highlight', this.getHex('highlight'));
      root.style.setProperty('--color-pearl', this.getHex('pearl'));

      // Backward compatibility variables for existing CSS
      root.style.setProperty('--ruby', this.getHex('primary'));
      root.style.setProperty('--rose', this.getHex('secondary'));
      root.style.setProperty('--chrome', this.getHex('highlight'));
      root.style.setProperty('--ivory', this.getHex('pearl'));
    }
  }

  exports.ColorExtractor = ColorExtractor;
})(window.SongNode);
