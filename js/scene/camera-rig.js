/* =========================================================================
   CAMERA RIG (SPRING-DAMPED FOLLOW WITH LOOK-AHEAD)
   Keeps the active word optically centered while fluidly navigating world space.
   Implements critically damped spring physics with look-ahead anticipation.
   ========================================================================= */

window.SongNode = window.SongNode || {};

(function(exports) {
  class CameraRig {
    constructor() {
      // World position of camera focal point
      this.x = 0;
      this.y = 0;
      this.targetX = 0;
      this.targetY = 0;

      // Spring physics
      this.vx = 0;
      this.vy = 0;
      this.stiffness = 38.0;   // Spring strength
      this.damping = 12.5;     // Near critical damping (2 * sqrt(stiffness) ≈ 12.3)
      this.lookAheadFactor = 0.22; // Bias toward upcoming node

      // Reduced motion flag
      this.reducedMotion = false;

      // Zoom scale
      this.zoom = 1.0;
      this.targetZoom = 1.0;
    }

    setTarget(activeNodePos, nextNodePos = null, immediate = false) {
      if (!activeNodePos) return;

      let tx = activeNodePos.x;
      let ty = activeNodePos.y;

      // Look-ahead toward next node
      if (nextNodePos && !this.reducedMotion) {
        tx += (nextNodePos.x - activeNodePos.x) * this.lookAheadFactor;
        ty += (nextNodePos.y - activeNodePos.y) * this.lookAheadFactor;
      }

      this.targetX = tx;
      this.targetY = ty;

      if (immediate || this.reducedMotion) {
        this.x = tx;
        this.y = ty;
        this.vx = 0;
        this.vy = 0;
      }
    }

    update(dt) {
      if (this.reducedMotion) {
        this.x = this.targetX;
        this.y = this.targetY;
        this.vx = 0;
        this.vy = 0;
        return;
      }

      const clampedDt = Math.min(0.05, Math.max(0.001, dt));

      // Critically damped spring simulation: F = -k * x - c * v
      const dx = this.x - this.targetX;
      const dy = this.y - this.targetY;

      const ax = -this.stiffness * dx - this.damping * this.vx;
      const ay = -this.stiffness * dy - this.damping * this.vy;

      this.vx += ax * clampedDt;
      this.vy += ay * clampedDt;

      this.x += this.vx * clampedDt;
      this.y += this.vy * clampedDt;

      // Smooth zoom
      this.zoom += (this.targetZoom - this.zoom) * Math.min(1.0, clampedDt * 6.0);
    }

    toggleReducedMotion() {
      this.reducedMotion = !this.reducedMotion;
      if (this.reducedMotion) {
        this.x = this.targetX;
        this.y = this.targetY;
        this.vx = 0;
        this.vy = 0;
      }
      return this.reducedMotion;
    }

    // Applies camera transformation to 2D Canvas context:
    // Centers the camera's world position (this.x, this.y) at screen center (cx, cy)
    applyToContext(ctx, screenWidth, screenHeight) {
      const cx = screenWidth * 0.5;
      const cy = screenHeight * 0.5;

      ctx.translate(cx, cy);
      ctx.scale(this.zoom, this.zoom);
      ctx.translate(-this.x, -this.y);
    }
  }

  exports.CameraRig = CameraRig;
})(window.SongNode);

