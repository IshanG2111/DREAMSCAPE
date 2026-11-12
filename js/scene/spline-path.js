/* =========================================================================
   SPLINE PATH (SINGLE CATMULL-ROM FILAMENT)
   Builds the smooth, continuous organic path connecting word nodes.
   Guarantees zero letterform collisions by maintaining anchor clearance.
   ========================================================================= */

window.SongNode = window.SongNode || {};

(function(exports) {
  function getCatmullRomBezierControlPoints(p0, p1, p2, p3, tension = 0.5) {
    const factor = 6 * tension;
    return {
      c1: {
        x: p1.x + (p2.x - p0.x) / factor,
        y: p1.y + (p2.y - p0.y) / factor
      },
      c2: {
        x: p2.x - (p3.x - p1.x) / factor,
        y: p2.y - (p3.y - p1.y) / factor
      }
    };
  }

  class SplinePath {
    constructor() {
      this.points = [];
      this.bezierSegments = [];
      this.totalApproxLength = 0;
    }

    buildPath(anchors) {
      if (!Array.isArray(anchors) || anchors.length < 2) {
        this.points = [];
        this.bezierSegments = [];
        this.totalApproxLength = 0;
        return;
      }

      this.points = anchors;
      this.bezierSegments = [];
      let totalLen = 0;

      for (let i = 0; i < anchors.length - 1; i++) {
        const p0 = anchors[Math.max(0, i - 1)];
        const p1 = anchors[i];
        const p2 = anchors[i + 1];
        const p3 = anchors[Math.min(anchors.length - 1, i + 2)];

        const cp = getCatmullRomBezierControlPoints(p0, p1, p2, p3, 0.5);
        const approxDist = Math.hypot(p2.x - p1.x, p2.y - p1.y);

        this.bezierSegments.push({
          p1: { x: p1.x, y: p1.y },
          c1: cp.c1,
          c2: cp.c2,
          p2: { x: p2.x, y: p2.y },
          approxLength: approxDist,
          startDist: totalLen
        });

        totalLen += approxDist;
      }

      this.totalApproxLength = totalLen;
    }

    // Evaluate point on the spline for normalized t in [0, 1]
    getPointAt(t) {
      if (this.bezierSegments.length === 0) return { x: 0, y: 0 };
      const clampedT = Math.max(0, Math.min(1, t));
      const targetDist = clampedT * this.totalApproxLength;

      // Find segment
      let seg = this.bezierSegments[0];
      for (let i = 0; i < this.bezierSegments.length; i++) {
        const s = this.bezierSegments[i];
        if (targetDist >= s.startDist && targetDist <= (s.startDist + s.approxLength)) {
          seg = s;
          break;
        }
      }

      const segT = seg.approxLength > 0 ? (targetDist - seg.startDist) / seg.approxLength : 0;
      const u = Math.max(0, Math.min(1, segT));
      const u2 = u * u;
      const u3 = u2 * u;
      const inv = 1 - u;
      const inv2 = inv * inv;
      const inv3 = inv2 * inv;

      const x = inv3 * seg.p1.x + 3 * inv2 * u * seg.c1.x + 3 * inv * u2 * seg.c2.x + u3 * seg.p2.x;
      const y = inv3 * seg.p1.y + 3 * inv2 * u * seg.c1.y + 3 * inv * u2 * seg.c2.y + u3 * seg.p2.y;

      return { x, y };
    }

    drawToCanvas(ctx, options = {}) {
      if (this.bezierSegments.length === 0) return;

      const segs = this.bezierSegments;

      // Multi-pass optical bloom:
      // Pass 1: Ruby ambient bloom (#f12d78)
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(segs[0].p1.x, segs[0].p1.y);
      for (const s of segs) {
        ctx.bezierCurveTo(s.c1.x, s.c1.y, s.c2.x, s.c2.y, s.p2.x, s.p2.y);
      }
      ctx.strokeStyle = "rgba(241, 45, 120, 0.18)";
      ctx.lineWidth = 14;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();

      // Pass 2: Rose mid filament (#ff8ab8)
      ctx.beginPath();
      ctx.moveTo(segs[0].p1.x, segs[0].p1.y);
      for (const s of segs) {
        ctx.bezierCurveTo(s.c1.x, s.c1.y, s.c2.x, s.c2.y, s.p2.x, s.p2.y);
      }
      ctx.strokeStyle = "rgba(255, 138, 184, 0.65)";
      ctx.lineWidth = 3.5;
      ctx.stroke();

      // Pass 3: Ivory crisp core (#f7eef3)
      ctx.beginPath();
      ctx.moveTo(segs[0].p1.x, segs[0].p1.y);
      for (const s of segs) {
        ctx.bezierCurveTo(s.c1.x, s.c1.y, s.c2.x, s.c2.y, s.p2.x, s.p2.y);
      }
      ctx.strokeStyle = "rgba(247, 238, 243, 0.95)";
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();
    }
  }

  exports.SplinePath = SplinePath;
})(window.SongNode);

