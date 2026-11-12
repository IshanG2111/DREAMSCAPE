/* =========================================================================
   CINEMATIC RENDERER (CATMULL-ROM SPLINES, MULTI-PASS BLOOM, ISOMETRIC RINGS)
   Spring-Damped String Physics & Zero-GC Node Pool for Buttery-Smooth Lyrics
   ========================================================================= */

window.SongNode = window.SongNode || {};

(function(exports) {
  // Catmull-Rom Spline to Cubic Bezier Converter with Tension 0.5
  function getCatmullRomBezierControlPoints(pPrev, pCur, pNext, pAfter, tension = 0.5) {
    const factor = 6 * tension;
    return {
      c1: {
        x: pCur.x + (pNext.x - pPrev.x) / factor,
        y: pCur.y + (pNext.y - pPrev.y) / factor
      },
      c2: {
        x: pNext.x - (pAfter.x - pCur.x) / factor,
        y: pNext.y - (pAfter.y - pCur.y) / factor
      }
    };
  }

  // Persistent Lyric Node for Zero-GC Spring-Damped Gliding
  class LyricNode {
    constructor(id) {
      this.id = id;
      this.text = "";
      this.currentSlot = 2.0;
      this.targetSlot = 2.0;
      this.wordIndex = -999;
      this.active = false;
    }
  }

  class CinematicRenderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d', { alpha: true });

      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);

      // 1. Zero-GC Lyric Node Pool (Continuous string gliding)
      this.nodePool = [];
      for (let i = 0; i < 12; i++) {
        this.nodePool.push(new LyricNode(i));
      }

      // Initialize with iconic reference lyrics ("Let it happen. babe see")
      const defaultWords = ["Let", "it", "happen.", "babe", "see"];
      for (let i = 0; i < 5; i++) {
        const node = this.nodePool[i];
        node.text = defaultWords[i];
        node.currentSlot = i;
        node.targetSlot = i;
        node.wordIndex = i;
        node.active = true;
      }
      this.currentHeroIndex = 2;

      // 2. Stardust System (85 pinpoint particles drifting on slow sine waves)
      this.stardust = [];
      this.initStardust(85);

      // 3. Cinematic Out-of-Focus Bokeh Light Ribbons (Depth of field streaks)
      this.bokehRibbons = [
        { yOffset: 0.72, phase: 0.0, speed: 0.00045, width: 68, alpha: 0.08, glintX: 0.44 },
        { yOffset: 0.18, phase: 2.1, speed: 0.00035, width: 45, alpha: 0.05, glintX: 0.28 },
        { yOffset: 0.88, phase: 4.2, speed: 0.00050, width: 55, alpha: 0.06, glintX: 0.72 }
      ];

      // 4. Traveling Photon Pulses along the Spline
      this.photons = [
        { t: 0.14, speed: 0.15, size: 2.8 },
        { t: 0.48, speed: 0.18, size: 3.6 },
        { t: 0.82, speed: 0.14, size: 2.5 }
      ];

      this.resize();
      window.addEventListener('resize', () => this.resize());
    }

    initStardust(count) {
      this.stardust = [];
      for (let i = 0; i < count; i++) {
        this.stardust.push({
          x: (Math.random() - 0.5) * 1800,
          y: (Math.random() - 0.5) * 1100,
          size: Math.random() * 1.5 + 0.6,
          phase: Math.random() * Math.PI * 2,
          speed: Math.random() * 0.35 + 0.15,
          alpha: Math.random() * 0.4 + 0.15
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

      this.updateSlotCoordinates();
    }

    updateSlotCoordinates() {
      const w = this.width;
      const h = this.height;
      const cx = w * 0.5;
      const cy = h * 0.5;

      const spanX = Math.min(620, w * 0.35);
      const spanY = Math.min(230, h * 0.23);

      // Waypoints for slots -1 through 5 (Continuous String Anchor Guide)
      this.slotWaypoints = [
        { x: cx - spanX - 220,        y: cy - spanY - 85 },        // Slot -1: Exit left
        { x: cx - spanX,              y: cy - spanY },             // Slot 0:  FAR_PAST ("Let")
        { x: cx - spanX * 0.52,       y: cy - spanY * 0.44 },      // Slot 1:  PREV     ("it")
        { x: cx,                      y: cy },                     // Slot 2:  HERO     ("happen.")
        { x: cx + spanX * 0.50,       y: cy + spanY * 0.42 },      // Slot 3:  NEXT     ("babe")
        { x: cx + spanX,              y: cy + spanY },             // Slot 4:  FAR_NEXT ("see")
        { x: cx + spanX + 220,        y: cy + spanY + 85 }         // Slot 5:  Entry right
      ];
    }

    // Continuous Catmull-Rom Position Evaluation on String for ANY float slot s in [-1, 5]
    getSlotPosition(s) {
      const pts = this.slotWaypoints;
      const u = Math.max(-1.0, Math.min(5.0, s)) + 1.0; // u in [0, 6]
      const i = Math.min(5, Math.max(0, Math.floor(u)));
      const t = u - i; // t in [0, 1]

      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[Math.min(6, i + 1)];
      const p3 = pts[Math.min(6, i + 2)];

      const tt = t * t;
      const ttt = tt * t;

      const x = 0.5 * (
        (2 * p1.x) +
        (-p0.x + p2.x) * t +
        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * tt +
        (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * ttt
      );

      const y = 0.5 * (
        (2 * p1.y) +
        (-p0.y + p2.y) * t +
        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * tt +
        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * ttt
      );

      return { x, y };
    }

    // Continuous Scale Evaluation
    getSlotScale(s) {
      const dist = Math.abs(s - 2.0);
      if (dist <= 1.0) {
        return 1.00 - dist * (1.00 - 0.74);
      } else if (dist <= 2.0) {
        return 0.74 - (dist - 1.0) * (0.74 - 0.56);
      } else {
        return Math.max(0.30, 0.56 - (dist - 2.0) * (0.56 - 0.30));
      }
    }

    // Continuous Font Size Evaluation
    getSlotFontSize(s) {
      const dist = Math.abs(s - 2.0);
      if (dist <= 1.0) {
        return Math.round(84 - dist * (84 - 44));
      } else {
        return Math.round(44 - Math.min(1.0, dist - 1.0) * (44 - 38));
      }
    }

    // Continuous Opacity Evaluation
    getSlotOpacity(s) {
      if (s < 0.0) {
        return Math.max(0, 0.45 * (1.0 + s));
      } else if (s > 4.0) {
        return Math.max(0, 0.45 * (5.0 - s));
      } else {
        const dist = Math.abs(s - 2.0);
        if (dist <= 1.0) {
          return 1.00 - dist * (1.00 - 0.70);
        } else {
          return 0.70 - (dist - 1.0) * (0.70 - 0.45);
        }
      }
    }

    // Proximity to Hero Center Stage (0.0 to 1.0)
    getHeroFactor(s) {
      return Math.max(0, 1.0 - Math.abs(s - 2.0));
    }

    // Word Assignment: Spring-Damped Target Slot Transition
    setWords(wordsArray, heroIndex = 2) {
      if (!Array.isArray(wordsArray) || wordsArray.length === 0) return;

      const isBigJump = Math.abs(heroIndex - this.currentHeroIndex) > 3;
      this.currentHeroIndex = heroIndex;

      const assignedNodeIds = new Set();

      for (let slot = 0; slot < 5; slot++) {
        const wordText = wordsArray[slot] || "";
        if (!wordText || wordText.trim().length === 0) continue;

        const globalIdx = heroIndex + (slot - 2);

        // 1. Try to find existing node with matching globalIdx or nearby identical text
        let matchNode = null;
        for (const node of this.nodePool) {
          if (node.active && !assignedNodeIds.has(node.id)) {
            if (node.wordIndex === globalIdx || (node.text === wordText && Math.abs(node.targetSlot - slot) <= 2)) {
              matchNode = node;
              break;
            }
          }
        }

        if (matchNode) {
          // Found: advance targetSlot; node will smoothly glide to its new slot
          matchNode.text = wordText;
          matchNode.wordIndex = globalIdx;
          matchNode.targetSlot = slot;
          if (isBigJump) {
            matchNode.currentSlot = slot;
          }
          assignedNodeIds.add(matchNode.id);
        } else {
          // Free node from pool to enter along the string
          let freeNode = null;
          for (const node of this.nodePool) {
            if (!node.active && !assignedNodeIds.has(node.id)) {
              freeNode = node;
              break;
            }
          }
          if (!freeNode) {
            let maxDist = -1;
            for (const node of this.nodePool) {
              if (!assignedNodeIds.has(node.id)) {
                const dist = Math.abs(node.currentSlot - 2.0);
                if (dist > maxDist) {
                  maxDist = dist;
                  freeNode = node;
                }
              }
            }
          }

          if (freeNode) {
            freeNode.text = wordText;
            freeNode.wordIndex = globalIdx;
            freeNode.targetSlot = slot;
            // Smoothly glide in from the string's outer ends
            if (isBigJump) {
              freeNode.currentSlot = slot;
            } else {
              freeNode.currentSlot = (slot >= 2) ? 5.2 : -1.2;
            }
            freeNode.active = true;
            assignedNodeIds.add(freeNode.id);
          }
        }
      }

      // Egress unassigned nodes smoothly into the darkness
      for (const node of this.nodePool) {
        if (node.active && !assignedNodeIds.has(node.id)) {
          if (isBigJump) {
            node.active = false;
          } else {
            if (node.targetSlot <= 1.0) {
              node.targetSlot = -1.2; // Slide off left
            } else {
              node.targetSlot = 5.2;  // Slide off right
            }
          }
        }
      }
    }

    // Master Render Frame (Locked 60 - 120 FPS, Spring-Damped Motion)
    render(dt, time, audio) {
      const ctx = this.ctx;
      const w = this.width;
      const h = this.height;
      const dpr = this.dpr;

      this.updateSlotCoordinates();

      // 1. Spring-Damping Physics Step (Words act as beads on a silk string)
      const springRate = 6.8; // Smooth, cinematic glide rate
      const springFactor = 1.0 - Math.exp(-springRate * dt);

      for (const node of this.nodePool) {
        if (!node.active) continue;

        const delta = node.targetSlot - node.currentSlot;
        node.currentSlot += delta * springFactor;

        if (Math.abs(delta) < 0.002) {
          node.currentSlot = node.targetSlot;
        }

        // Recycle nodes that have completely exited
        if ((node.targetSlot <= -1.0 && node.currentSlot <= -1.1) ||
            (node.targetSlot >= 5.0 && node.currentSlot >= 5.1)) {
          node.active = false;
        }
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      // 2. Transparent Clear (GPU Liquid Chrome shows through underneath)
      ctx.clearRect(0, 0, w, h);

      // 3. Ambient Stardust
      this.renderStardust(ctx, w, h, time, audio);

      // 4. Cinematic Out-of-Focus Bokeh Light Ribbons (Depth of field streaks)
      ctx.globalCompositeOperation = 'screen';
      this.renderBokehRibbons(ctx, w, h, time, audio);

      // 5. Build Continuous Spline Guide String
      const splinePts = this.buildSplinePoints(w, h);

      // 6. Render Glowing Spline Wire with Multi-Pass Bloom
      this.renderCatmullRomSpline(ctx, splinePts, dt, time, audio);

      // 7. Render All Active Nodes (Rings, Bloom, Pure White Letterforms, Optical Beads)
      this.renderLyricNodes(ctx, time, audio);

      ctx.restore();
    }

    // Build Continuous Smooth Spline Points
    buildSplinePoints(w, h) {
      const c = this.slotWaypoints;
      return [
        { x: c[0].x - 60,  y: c[0].y - 30 }, // Lead-in
        { x: c[1].x,       y: c[1].y + 22 }, // Bead 0 ("Let")
        { x: c[2].x,       y: c[2].y + 20 }, // Bead 1 ("it")
        { x: c[3].x - 140, y: c[3].y + 38 }, // Cradle dip before hero
        { x: c[3].x - 10,  y: c[3].y + 44 }, // Deep cradle under hero center
        { x: c[3].x + 110, y: c[3].y + 16 }, // Hero period anchor
        { x: c[4].x,       y: c[4].y + 20 }, // Bead 3 ("babe")
        { x: c[5].x,       y: c[5].y + 22 }, // Bead 4 ("see")
        { x: c[6].x + 60,  y: c[6].y + 30 }  // Lead-out
      ];
    }

    // Ambient Stardust
    renderStardust(ctx, w, h, time, audio) {
      const cx = w * 0.5;
      const cy = h * 0.5;
      const speedMult = 1.0 + (audio ? audio.mids * 1.5 : 0.2);

      ctx.fillStyle = '#ffffff';
      for (const star of this.stardust) {
        const driftY = Math.sin(time * 0.001 * star.speed * speedMult + star.phase) * 12;
        const x = cx + star.x;
        const y = cy + star.y + driftY;

        ctx.globalAlpha = star.alpha * (0.8 + (audio ? audio.treble * 0.3 : 0.1));
        ctx.beginPath();
        ctx.arc(x, y, star.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1.0;
    }

    // Cinematic Out-of-Focus Bokeh Light Ribbons
    renderBokehRibbons(ctx, w, h, time, audio) {
      for (const rib of this.bokehRibbons) {
        const cy = h * rib.yOffset + Math.sin(time * rib.speed + rib.phase) * 35;
        const grad = ctx.createLinearGradient(0, cy - rib.width, w, cy + rib.width);
        grad.addColorStop(0, 'rgba(255, 68, 136, 0)');
        grad.addColorStop(rib.glintX - 0.15, 'rgba(255, 45, 115, 0.03)');
        grad.addColorStop(rib.glintX, `rgba(255, 180, 210, ${rib.alpha * (1.0 + (audio ? audio.mids * 0.5 : 0))})`);
        grad.addColorStop(rib.glintX + 0.15, 'rgba(200, 160, 240, 0.03)');
        grad.addColorStop(1, 'rgba(150, 80, 220, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(w * rib.glintX, cy, w * 0.42, rib.width * 0.5, -0.22, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Continuous Organic Catmull-Rom Spline
    renderCatmullRomSpline(ctx, pts, dt, time, audio) {
      if (!pts || pts.length < 4) return;
      const tension = 0.5;

      const buildPath = (c) => {
        c.beginPath();
        c.moveTo(pts[1].x, pts[1].y);

        for (let i = 1; i < pts.length - 2; i++) {
          const pPrev = pts[i - 1];
          const pCur  = pts[i];
          const pNext = pts[i + 1];
          const pAfter= pts[i + 2];

          const cp = getCatmullRomBezierControlPoints(pPrev, pCur, pNext, pAfter, tension);
          c.bezierCurveTo(cp.c1.x, cp.c1.y, cp.c2.x, cp.c2.y, pNext.x, pNext.y);
        }
      };

      // Multi-Pass Bloom
      // Pass 1: Wide Ambient Ruby Halo
      ctx.lineWidth = 14;
      ctx.strokeStyle = '#ff1166';
      ctx.globalAlpha = 0.08 * (0.8 + (audio ? audio.mids * 0.4 : 0.2));
      buildPath(ctx);
      ctx.stroke();

      // Pass 2: Vivid Mid-Glow
      ctx.lineWidth = 3.6;
      ctx.strokeStyle = '#ff3388';
      ctx.globalAlpha = 0.36 * (0.9 + (audio ? audio.mids * 0.3 : 0.2));
      buildPath(ctx);
      ctx.stroke();

      // Pass 3: Core Laser Fiber
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = '#ffffff';
      ctx.globalAlpha = 0.95;
      buildPath(ctx);
      ctx.stroke();

      // Traveling Light Photon Pulses
      const pStart = pts[1];
      const pEnd = pts[pts.length - 2];

      for (const photon of this.photons) {
        photon.t = (photon.t + dt * photon.speed * (1.0 + (audio ? audio.mids * 0.4 : 0.2))) % 1.0;

        const px = (1 - photon.t) * pStart.x + photon.t * pEnd.x;
        const py = (1 - photon.t) * pStart.y + photon.t * pEnd.y + Math.sin(photon.t * Math.PI) * 45;

        // Ambient glow
        ctx.fillStyle = '#ff2277';
        ctx.globalAlpha = 0.22;
        ctx.beginPath();
        ctx.arc(px, py, photon.size * 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Core white
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.95;
        ctx.beginPath();
        ctx.arc(px, py, photon.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Render All Active Nodes Along the String
    renderLyricNodes(ctx, time, audio) {
      const tilt = -0.31; // -18 degrees unified isometric tilt
      const ripple = audio ? (audio.orbitalRipple * 38) : 0;
      const kickMult = audio ? audio.kickScale : 1.0;

      for (const node of this.nodePool) {
        if (!node.active) continue;

        const s = node.currentSlot;
        const opacity = this.getSlotOpacity(s);
        if (opacity <= 0.01) continue;

        const pos = this.getSlotPosition(s);
        const scale = this.getSlotScale(s);
        const fontSize = this.getSlotFontSize(s);
        const heroFactor = this.getHeroFactor(s);

        // Organic levitation drift
        const driftY = Math.sin(time * 0.0016 + node.id * 1.3) * 3.5;
        const posX = pos.x;
        const posY = pos.y + driftY;

        const activeScale = scale * (1.0 + (kickMult - 1.0) * heroFactor);

        // A. AMBIENT RUBY BACKLIGHTING BLOOM (Grows smoothly as node enters center stage)
        if (heroFactor > 0.04) {
          const bloomRadius = 240 * (0.8 + 0.2 * heroFactor);
          const gradBloom = ctx.createRadialGradient(posX, posY, 0, posX, posY, bloomRadius);
          gradBloom.addColorStop(0, `rgba(255, 34, 110, ${0.40 * heroFactor})`);
          gradBloom.addColorStop(0.35, `rgba(220, 25, 85, ${0.16 * heroFactor})`);
          gradBloom.addColorStop(0.70, `rgba(140, 20, 75, ${0.03 * heroFactor})`);
          gradBloom.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = gradBloom;
          ctx.globalAlpha = 0.90 * heroFactor;
          ctx.beginPath();
          ctx.arc(posX, posY, bloomRadius, 0, Math.PI * 2);
          ctx.fill();
        }

        // B. TILTED ORBITAL RINGS
        ctx.save();
        ctx.translate(posX, posY);
        ctx.rotate(tilt);
        ctx.scale(activeScale, activeScale);

        // Base Ring (Scales with node)
        const rx = 44 + 131 * heroFactor + ripple * heroFactor;
        const ry = 19 + 53 * heroFactor + ripple * 0.42 * heroFactor;

        const gradRing = ctx.createLinearGradient(-rx, 0, rx, 0);
        gradRing.addColorStop(0, `rgba(255, 45, 115, ${0.45 + 0.50 * heroFactor})`);
        gradRing.addColorStop(0.40, `rgba(255, 120, 180, ${0.60 + 0.25 * heroFactor})`);
        gradRing.addColorStop(0.85, 'rgba(180, 160, 230, 0.20)');
        gradRing.addColorStop(1, 'rgba(0, 0, 0, 0)');

        // Inner Ellipse: Pass 1 Ambient (Hero only)
        if (heroFactor > 0.2) {
          ctx.lineWidth = 12;
          ctx.strokeStyle = '#ff1166';
          ctx.globalAlpha = 0.07 * heroFactor;
          ctx.beginPath();
          ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
          ctx.stroke();

          ctx.lineWidth = 3.2;
          ctx.strokeStyle = '#ff4488';
          ctx.globalAlpha = 0.32 * heroFactor;
          ctx.beginPath();
          ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Core Ring
        ctx.lineWidth = 0.9 + 0.3 * heroFactor;
        ctx.strokeStyle = gradRing;
        ctx.globalAlpha = opacity * (0.80 + 0.18 * heroFactor);
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Concentric Outer Ring & Crosshairs for Hero Word
        if (heroFactor > 0.15) {
          ctx.lineWidth = 0.85;
          ctx.strokeStyle = gradRing;
          ctx.globalAlpha = 0.32 * heroFactor;
          ctx.beginPath();
          ctx.ellipse(0, 0, 235, 96, 0, 0, Math.PI * 2);
          ctx.stroke();

          // Crosshairs
          ctx.lineWidth = 0.7;
          ctx.strokeStyle = '#ffffff';
          ctx.globalAlpha = 0.16 * heroFactor;
          ctx.beginPath();
          ctx.moveTo(-190, 0); ctx.lineTo(190, 0);
          ctx.moveTo(0, -85);  ctx.lineTo(0, 85);
          ctx.stroke();

          // Tangent laser filament
          ctx.lineWidth = 0.65;
          ctx.strokeStyle = 'rgba(255, 140, 190, 0.28)';
          ctx.beginPath();
          ctx.moveTo(110, -50);
          ctx.lineTo(280, -125);
          ctx.stroke();
        }

        ctx.restore();

        // C. EDITORIAL TYPOGRAPHY (Razor-Thin Didone Italic, Pure White, ZERO STROKE BUBBLES!)
        ctx.save();
        ctx.translate(posX, posY);
        ctx.scale(activeScale, activeScale);

        ctx.font = `italic 400 ${fontSize}px 'Bodoni Moda', 'Playfair Display', 'Cormorant Garamond', Georgia, serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Layer 1: Ethereal glass-like neon under-pass
        ctx.fillStyle = `rgba(255, 140, 185, ${0.35 * opacity})`;
        ctx.globalAlpha = 0.70;
        ctx.fillText(node.text, 0, 0);

        // Layer 2: Core Brilliant White Letterforms (#FFFFFF)
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = opacity;
        ctx.fillText(node.text, 0, 0);

        ctx.restore();

        // D. LUMINOUS OPTICAL BEAD ON THE SPLINE
        const beadY = posY + 20 * scale;
        this.renderOpticalBead(ctx, posX, beadY, heroFactor > 0.6, audio, heroFactor);
      }
    }

    // Pure Optical Point of Light (Zero fillRect / Zero Box Glow)
    renderOpticalBead(ctx, bx, by, isHero, audio, heroFactor = 0) {
      const haloRadius = 14 + 18 * heroFactor;
      const midRadius = 5.5 + 5.5 * heroFactor;
      const coreRadius = 1.8 + 1.2 * heroFactor;

      // 1. Ambient Circular Halo
      const gradHalo = ctx.createRadialGradient(bx, by, 0, bx, by, haloRadius);
      gradHalo.addColorStop(0, `rgba(255, 45, 115, ${0.22 + 0.23 * heroFactor})`);
      gradHalo.addColorStop(0.5, `rgba(220, 25, 90, ${0.08 + 0.07 * heroFactor})`);
      gradHalo.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = gradHalo;
      ctx.globalAlpha = 0.90;
      ctx.beginPath();
      ctx.arc(bx, by, haloRadius, 0, Math.PI * 2);
      ctx.fill();

      // 2. Mid-Glow
      const gradMid = ctx.createRadialGradient(bx, by, 0, bx, by, midRadius);
      gradMid.addColorStop(0, 'rgba(255, 230, 245, 0.95)');
      gradMid.addColorStop(0.4, 'rgba(255, 68, 136, 0.75)');
      gradMid.addColorStop(1, 'rgba(255, 34, 110, 0)');

      ctx.fillStyle = gradMid;
      ctx.globalAlpha = 0.95;
      ctx.beginPath();
      ctx.arc(bx, by, midRadius, 0, Math.PI * 2);
      ctx.fill();

      // 3. Core Brilliant White Point
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 1.0;
      ctx.beginPath();
      ctx.arc(bx, by, coreRadius, 0, Math.PI * 2);
      ctx.fill();

      // 4. Optical Anamorphic Micro-Rays (Razor-thin hair lines for Hero Word)
      if (heroFactor > 0.4) {
        const rayLen = 32 * heroFactor;

        const gradRay = ctx.createLinearGradient(bx - rayLen, by, bx + rayLen, by);
        gradRay.addColorStop(0, 'rgba(255, 68, 136, 0)');
        gradRay.addColorStop(0.5, `rgba(255, 255, 255, ${0.92 * heroFactor})`);
        gradRay.addColorStop(1, 'rgba(255, 68, 136, 0)');

        ctx.lineWidth = 0.85;
        ctx.strokeStyle = gradRay;
        ctx.beginPath();
        ctx.moveTo(bx - rayLen, by);
        ctx.lineTo(bx + rayLen, by);
        ctx.stroke();

        const diagLen = 16 * heroFactor;
        const gradDiag = ctx.createLinearGradient(bx - diagLen, by - diagLen * 0.45, bx + diagLen, by + diagLen * 0.45);
        gradDiag.addColorStop(0, 'rgba(255, 68, 136, 0)');
        gradDiag.addColorStop(0.5, `rgba(255, 255, 255, ${0.65 * heroFactor})`);
        gradDiag.addColorStop(1, 'rgba(255, 68, 136, 0)');

        ctx.lineWidth = 0.6;
        ctx.strokeStyle = gradDiag;
        ctx.beginPath();
        ctx.moveTo(bx - diagLen, by - diagLen * 0.45);
        ctx.lineTo(bx + diagLen, by + diagLen * 0.45);
        ctx.stroke();
      }
    }
  }

  exports.CinematicRenderer = CinematicRenderer;
})(window.SongNode);
