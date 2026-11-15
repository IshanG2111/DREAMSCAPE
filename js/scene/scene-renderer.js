/* =========================================================================
   SCENE RENDERER (STAGE CANVAS MASTER FOREGROUND ENGINE)
   Orchestrates the Constellation Lyric Engine, Celestial Starfields,
   Diffraction Flares, and Dynamic Palette Adaptation with exact optical centering.
   ========================================================================= */

window.SongNode = window.SongNode || {};

(function(exports) {
  class SceneRenderer {
    constructor(canvas, wordGraph, splinePath, cameraRig, constellationEngine = null, bubbleManager = null) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d', { alpha: true });
      this.wordGraph = wordGraph;
      this.splinePath = splinePath;
      this.camera = cameraRig;

      this.constellation = constellationEngine || new window.SongNode.ConstellationEngine();
      this.bubbles = bubbleManager;

      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);

      this.resize();
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

    render(dt, timeSec, audio = null, colorExtractor = null, lyricClock = null) {
      const ctx = this.ctx;
      const w = this.width;
      const h = this.height;

      // Clear foreground canvas cleanly
      ctx.clearRect(0, 0, w, h);

      // Single authoritative center stage origin (0, 0)
      ctx.save();
      ctx.translate(w * 0.5, h * 0.5);

      // Render Constellation Lyric Engine
      if (this.constellation) {
        this.constellation.update(dt, timeSec, audio, lyricClock);
        this.constellation.render(ctx, timeSec, audio, colorExtractor, lyricClock);
      }

      ctx.restore();
    }
  }

  exports.SceneRenderer = SceneRenderer;
})(window.SongNode);
