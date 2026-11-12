/* =========================================================================
   GSAP LYRIC ENGINE (GREENSTOCK 3 + SVG VECTOR SPLINE + DOM TYPOGRAPHY)
   Awwwards-grade motion design with zero text blur and butter-smooth easing
   ========================================================================= */

window.SongNode = window.SongNode || {};

(function(exports) {
  // Catmull-Rom to Cubic Bezier Converter with Tension 0.5
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

  // Persistent Lyric Node for Zero-GC DOM Typography
  class LyricNodeDOM {
    constructor(id, parentEl) {
      this.id = id;
      this.currentSlot = 2.0;
      this.targetSlot = 2.0;
      this.wordIndex = -999;
      this.active = false;
      this.text = "";
      this.tween = null;

      // Create DOM element
      const el = document.createElement('div');
      el.className = 'lyric-node';

      // Bloom Backlight (Zero Box Edge Radial Glow)
      const bloom = document.createElement('div');
      bloom.className = 'node-bloom';
      el.appendChild(bloom);

      // Glass-like Under-pass Glow
      const glow = document.createElement('span');
      glow.className = 'node-text-glow';
      el.appendChild(glow);

      // Core Crisp Pure White Letterforms
      const text = document.createElement('span');
      text.className = 'node-text';
      el.appendChild(text);

      parentEl.appendChild(el);

      this.el = el;
      this.bloomEl = bloom;
      this.glowEl = glow;
      this.textEl = text;
    }

    setText(str) {
      this.text = str || "";
      this.textEl.textContent = this.text;
      this.glowEl.textContent = this.text;
    }
  }

  class GsapLyricEngine {
    constructor() {
      this.stageEl = document.getElementById('lyricStage');
      this.svgEl = document.getElementById('motionSvg');

      this.width = window.innerWidth;
      this.height = window.innerHeight;

      // 1. Fixed Node Pool (Zero GC, 8 persistent DOM elements)
      this.nodePool = [];
      for (let i = 0; i < 8; i++) {
        this.nodePool.push(new LyricNodeDOM(i, this.stageEl));
      }

      this.currentHeroIndex = 2;
      this.isIdle = true;

      // 2. SVG Sub-groups
      this.splineAmbient = document.getElementById('splineAmbient');
      this.splineMid = document.getElementById('splineMid');
      this.splineCore = document.getElementById('splineCore');
      this.heroRingGroup = document.getElementById('heroRingGroup');
      this.outerWordRings = document.getElementById('outerWordRings');
      this.beadsGroup = document.getElementById('beadsGroup');
      this.photonsGroup = document.getElementById('photonsGroup');
      this.stardustGroup = document.getElementById('stardustGroup');

      // 3. Stardust System (85 pinpoint stars)
      this.stardust = [];
      this.initStardust(85);

      // 4. Traveling Photon Pulses along the Spline
      this.photons = [
        { t: 0.12, speed: 0.14, size: 3.0 },
        { t: 0.48, speed: 0.18, size: 3.8 },
        { t: 0.82, speed: 0.12, size: 2.6 }
      ];

      this.initSvgPhotons();
      this.initSvgOverlays();

      this.resize();
      window.addEventListener('resize', () => this.resize());

      // Start in peaceful Default Idle State ("Let it happen. babe see")
      this.enterIdleState(true);
    }

    initStardust(count) {
      this.stardust = [];
      this.stardustGroup.innerHTML = '';

      for (let i = 0; i < count; i++) {
        const star = {
          x: (Math.random() - 0.5) * 1800,
          y: (Math.random() - 0.5) * 1100,
          size: Math.random() * 1.5 + 0.6,
          phase: Math.random() * Math.PI * 2,
          speed: Math.random() * 0.35 + 0.15,
          alpha: Math.random() * 0.4 + 0.15,
          el: null
        };

        const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        c.setAttribute('r', star.size);
        c.setAttribute('fill', '#ffffff');
        c.setAttribute('opacity', star.alpha);
        this.stardustGroup.appendChild(c);
        star.el = c;

        this.stardust.push(star);
      }
    }

    initSvgPhotons() {
      this.photonsGroup.innerHTML = '';
      for (const p of this.photons) {
        // Halo
        const halo = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        halo.setAttribute('r', p.size * 3.5);
        halo.setAttribute('fill', '#ff2277');
        halo.setAttribute('opacity', '0.25');
        this.photonsGroup.appendChild(halo);

        // Core
        const core = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        core.setAttribute('r', p.size);
        core.setAttribute('fill', '#ffffff');
        core.setAttribute('opacity', '0.95');
        this.photonsGroup.appendChild(core);

        p.haloEl = halo;
        p.coreEl = core;
      }
    }

    // Persistent SVG Rings & Beads for Zero-GC 120 FPS Rendering
    initSvgOverlays() {
      // 1. Hero Ring Group
      this.heroRingGroup.innerHTML = `
        <g id="heroRingTransform">
          <ellipse id="heroHaloRing" rx="175" ry="72" fill="none" stroke="#ff1166" stroke-width="12" opacity="0.08" />
          <ellipse id="heroMidRing" rx="175" ry="72" fill="none" stroke="#ff4488" stroke-width="3.2" opacity="0.32" />
          <ellipse id="heroCoreRing" rx="175" ry="72" fill="none" stroke="url(#ringGrad)" stroke-width="1.2" opacity="0.95" />
          <ellipse id="heroOuterRing" rx="235" ry="96" fill="none" stroke="url(#outerRingGrad)" stroke-width="0.85" opacity="0.32" />
          <line x1="-190" y1="0" x2="190" y2="0" stroke="#ffffff" stroke-width="0.7" opacity="0.18" />
          <line x1="0" y1="-85" x2="0" y2="85" stroke="#ffffff" stroke-width="0.7" opacity="0.18" />
          <line x1="110" y1="-50" x2="280" y2="-125" stroke="#ff8cb5" stroke-width="0.7" opacity="0.35" />
        </g>
      `;
      this.heroRingTransform = document.getElementById('heroRingTransform');
      this.heroHaloRing = document.getElementById('heroHaloRing');
      this.heroMidRing = document.getElementById('heroMidRing');
      this.heroCoreRing = document.getElementById('heroCoreRing');
      this.heroOuterRing = document.getElementById('heroOuterRing');

      // 2. Persistent Outer Word Rings
      this.outerWordRings.innerHTML = '';
      this.ringElements = [];
      for (let i = 0; i < 8; i++) {
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        const ell = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
        ell.setAttribute('fill', 'none');
        ell.setAttribute('stroke', 'url(#ringGrad)');
        ell.setAttribute('stroke-width', '0.9');
        ell.setAttribute('opacity', '0');
        g.appendChild(ell);
        this.outerWordRings.appendChild(g);

        this.ringElements.push({ group: g, ellipse: ell });
      }

      // 3. Persistent Optical Anchor Beads
      this.beadsGroup.innerHTML = '';
      this.beadElements = [];
      for (let i = 0; i < 8; i++) {
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('opacity', '0');

        // Halo
        const halo = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        halo.setAttribute('r', '14');
        halo.setAttribute('fill', 'url(#nodeBeadGlow)');
        g.appendChild(halo);

        // Core dot
        const core = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        core.setAttribute('r', '1.8');
        core.setAttribute('fill', '#ffffff');
        g.appendChild(core);

        // Hero Micro-flares
        const hRay = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        hRay.setAttribute('x1', '-34'); hRay.setAttribute('y1', '0');
        hRay.setAttribute('x2', '34');  hRay.setAttribute('y2', '0');
        hRay.setAttribute('stroke', 'url(#flareLineGrad)');
        hRay.setAttribute('stroke-width', '0.85');
        hRay.setAttribute('opacity', '0');
        g.appendChild(hRay);

        const dRay = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        dRay.setAttribute('x1', '-16'); dRay.setAttribute('y1', '-8');
        dRay.setAttribute('x2', '16');  dRay.setAttribute('y2', '8');
        dRay.setAttribute('stroke', 'url(#flareLineGrad)');
        dRay.setAttribute('stroke-width', '0.6');
        dRay.setAttribute('opacity', '0');
        g.appendChild(dRay);

        this.beadsGroup.appendChild(g);
        this.beadElements.push({ group: g, halo, core, hRay, dRay });
      }
    }

    resize() {
      this.width = window.innerWidth;
      this.height = window.innerHeight;

      this.svgEl.setAttribute('viewBox', `0 0 ${this.width} ${this.height}`);

      this.updateSlotWaypoints();
      this.renderSpline();
      this.renderAllNodes();
    }

    updateSlotWaypoints() {
      const w = this.width;
      const h = this.height;
      const cx = w * 0.5;
      const cy = h * 0.5;

      const spanX = Math.min(580, w * 0.36);
      const spanY = Math.min(220, h * 0.22);

      // Clean S-Curve Waypoints (Smooth continuous arc from top-left to bottom-right)
      this.slotWaypoints = [
        { x: cx - spanX - 220,        y: cy - spanY - 80 },        // Slot -1: Exit left
        { x: cx - spanX,              y: cy - spanY },             // Slot 0:  FAR_PAST ("Let")
        { x: cx - spanX * 0.52,       y: cy - spanY * 0.44 },      // Slot 1:  PREV     ("it")
        { x: cx,                      y: cy },                     // Slot 2:  HERO     ("happen.")
        { x: cx + spanX * 0.50,       y: cy + spanY * 0.42 },      // Slot 3:  NEXT     ("babe")
        { x: cx + spanX,              y: cy + spanY },             // Slot 4:  FAR_NEXT ("see")
        { x: cx + spanX + 220,        y: cy + spanY + 80 }         // Slot 5:  Entry right
      ];
    }

    // Continuous Catmull-Rom Position Evaluation on Spline String for float s in [-1, 5]
    getSlotPos(s) {
      const pts = this.slotWaypoints;
      const u = Math.max(-1.0, Math.min(5.0, s)) + 1.0; // [0, 6]
      const i = Math.min(5, Math.max(0, Math.floor(u)));
      const t = u - i;

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

    getSlotFontSize(s) {
      const dist = Math.abs(s - 2.0);
      if (dist <= 1.0) {
        return Math.round(84 - dist * (84 - 44));
      } else {
        return Math.round(44 - Math.min(1.0, dist - 1.0) * (44 - 38));
      }
    }

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

    getHeroFactor(s) {
      return Math.max(0, 1.0 - Math.abs(s - 2.0));
    }

    // Render the Smooth, Continuous Organic S-Spline (Zero Kinks, Zero Straight Lines)
    renderSpline() {
      const c = this.slotWaypoints;

      // Extract Hero Word Width for Dynamic Period Anchor
      let heroNode = null;
      for (const node of this.nodePool) {
        if (node.active && Math.abs(node.targetSlot - 2.0) < 0.5) {
          heroNode = node;
          break;
        }
      }
      const textLen = heroNode ? (heroNode.text || "").length : 6;
      const heroHalfW = Math.max(28, textLen * 10);

      // Clean, silky S-Curve waypoints through the word anchor points
      const pts = [
        { x: c[0].x,                  y: c[0].y },                  // Lead-in
        { x: c[1].x,                  y: c[1].y + 20 },             // Bead 0 ("Let")
        { x: c[2].x,                  y: c[2].y + 18 },             // Bead 1 ("it")
        { x: c[3].x - heroHalfW - 30, y: c[3].y + 22 },             // Smooth cradle entry under hero
        { x: c[3].x + heroHalfW + 6,  y: c[3].y + 16 },             // Hero period anchor bead
        { x: c[4].x,                  y: c[4].y + 18 },             // Bead 3 ("babe")
        { x: c[5].x,                  y: c[5].y + 20 },             // Bead 4 ("see")
        { x: c[6].x,                  y: c[6].y }                   // Lead-out
      ];

      // Build mathematically continuous cubic Bezier path
      let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
      for (let i = 0; i < pts.length - 1; i++) {
        const pPrev = pts[Math.max(0, i - 1)];
        const pCur  = pts[i];
        const pNext = pts[i + 1];
        const pAfter= pts[Math.min(pts.length - 1, i + 2)];

        const cp = getCatmullRomBezierControlPoints(pPrev, pCur, pNext, pAfter, 0.5);
        d += ` C ${cp.c1.x.toFixed(1)} ${cp.c1.y.toFixed(1)}, ${cp.c2.x.toFixed(1)} ${cp.c2.y.toFixed(1)}, ${pNext.x.toFixed(1)} ${pNext.y.toFixed(1)}`;
      }

      this.splineAmbient.setAttribute('d', d);
      this.splineMid.setAttribute('d', d);
      this.splineCore.setAttribute('d', d);

      this.splinePathEl = this.splineCore;
      this.splineTotalLength = this.splineCore.getTotalLength ? this.splineCore.getTotalLength() : 1800;
    }

    // Default Idle State: Pristine Showcase Mode when nothing is playing
    enterIdleState(immediate = false) {
      this.isIdle = true;
      this.setWords(["Let", "it", "happen.", "babe", "see"], 2, immediate);
    }

    // Exit Idle State: When real music begins playback
    exitIdleState() {
      this.isIdle = false;
    }

    // Word Assignment: Butter-Smooth GSAP 3 Physics Transitions
    setWords(wordsArray, heroIndex = 2, immediate = false) {
      if (!Array.isArray(wordsArray) || wordsArray.length === 0) return;

      const isBigJump = Math.abs(heroIndex - this.currentHeroIndex) > 3;
      this.currentHeroIndex = heroIndex;

      const assignedNodeIds = new Set();

      for (let slot = 0; slot < 5; slot++) {
        const wordText = wordsArray[slot] || "";
        if (!wordText || wordText.trim().length === 0) continue;

        const globalIdx = heroIndex + (slot - 2);

        // Find existing node with matching globalIdx or nearby identical text
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
          matchNode.setText(wordText);
          matchNode.wordIndex = globalIdx;
          matchNode.targetSlot = slot;
          assignedNodeIds.add(matchNode.id);

          if (immediate || isBigJump) {
            if (matchNode.tween) matchNode.tween.kill();
            matchNode.currentSlot = slot;
            this.renderNode(matchNode);
          } else {
            // Animate smoothly along the string using GSAP 3 power3.out
            if (matchNode.tween) matchNode.tween.kill();
            matchNode.tween = gsap.to(matchNode, {
              currentSlot: slot,
              duration: 0.85,
              ease: "power3.out",
              onUpdate: () => this.renderNode(matchNode)
            });
          }
        } else {
          // Free node from pool
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
            freeNode.setText(wordText);
            freeNode.wordIndex = globalIdx;
            freeNode.targetSlot = slot;
            freeNode.active = true;
            assignedNodeIds.add(freeNode.id);

            if (immediate || isBigJump) {
              if (freeNode.tween) freeNode.tween.kill();
              freeNode.currentSlot = slot;
              this.renderNode(freeNode);
            } else {
              // Enter smoothly from the appropriate side of the string
              freeNode.currentSlot = (slot >= 2) ? 5.2 : -1.2;
              this.renderNode(freeNode);

              if (freeNode.tween) freeNode.tween.kill();
              freeNode.tween = gsap.to(freeNode, {
                currentSlot: slot,
                duration: 0.95,
                ease: "power3.out",
                onUpdate: () => this.renderNode(freeNode)
              });
            }
          }
        }
      }

      // Egress unassigned nodes smoothly into the dark void
      for (const node of this.nodePool) {
        if (node.active && !assignedNodeIds.has(node.id)) {
          if (immediate || isBigJump) {
            if (node.tween) node.tween.kill();
            node.active = false;
            node.el.style.opacity = '0';
          } else {
            const exitSlot = (node.targetSlot <= 1.0) ? -1.2 : 5.2;
            if (node.tween) node.tween.kill();
            node.tween = gsap.to(node, {
              currentSlot: exitSlot,
              duration: 0.75,
              ease: "power2.inOut",
              onUpdate: () => this.renderNode(node),
              onComplete: () => {
                node.active = false;
                node.el.style.opacity = '0';
              }
            });
          }
        }
      }

      // Update the smooth spline path to cradle dynamically with new hero word
      this.renderSpline();
    }

    // Render single node DOM state
    renderNode(node) {
      if (!node.active) return;

      const s = node.currentSlot;
      const opacity = this.getSlotOpacity(s);

      if (opacity <= 0.005) {
        node.el.style.opacity = '0';
        return;
      }

      const pos = this.getSlotPos(s);
      const scale = this.getSlotScale(s);
      const fontSize = this.getSlotFontSize(s);
      const heroFactor = this.getHeroFactor(s);

      // Hardware accelerated GPU transform
      node.el.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0) scale3d(${scale}, ${scale}, 1)`;
      node.el.style.opacity = opacity.toFixed(3);

      node.textEl.style.fontSize = `${fontSize}px`;
      node.glowEl.style.fontSize = `${fontSize}px`;

      // Smooth Radial Backlight Bloom on Hero Center Stage
      if (heroFactor > 0.02) {
        node.bloomEl.style.opacity = (heroFactor * 0.90).toFixed(3);
        node.bloomEl.style.transform = `translate(-50%, -50%) scale3d(${0.85 + 0.25 * heroFactor}, ${0.85 + 0.25 * heroFactor}, 1)`;
      } else {
        node.bloomEl.style.opacity = '0';
      }
    }

    renderAllNodes() {
      for (const node of this.nodePool) {
        this.renderNode(node);
      }
      this.updateSvgOverlays();
    }

    // Master Animation Loop Frame (Locked 60 - 120 FPS)
    update(dt, time, audio) {
      // 1. Organic Weightless Floating Levitation for Nodes
      for (const node of this.nodePool) {
        if (!node.active) continue;
        const driftY = Math.sin(time * 0.0016 + node.id * 1.4) * 4.0;
        const pos = this.getSlotPos(node.currentSlot);
        const scale = this.getSlotScale(node.currentSlot);
        node.el.style.transform = `translate3d(${pos.x}px, ${pos.y + driftY}px, 0) scale3d(${scale}, ${scale}, 1)`;
      }

      // 2. Drift Ambient Stardust
      const cx = this.width * 0.5;
      const cy = this.height * 0.5;
      const speedMult = 1.0 + (audio ? audio.mids * 1.5 : 0.2);

      for (const star of this.stardust) {
        const driftY = Math.sin(time * 0.001 * star.speed * speedMult + star.phase) * 12;
        star.el.setAttribute('cx', cx + star.x);
        star.el.setAttribute('cy', cy + star.y + driftY);
        star.el.setAttribute('opacity', star.alpha * (0.8 + (audio ? audio.treble * 0.3 : 0.1)));
      }

      // 3. Animate Traveling Photon Pulses along Spline Wire
      if (this.splinePathEl && this.splineTotalLength > 0) {
        for (const p of this.photons) {
          p.t = (p.t + dt * p.speed * (1.0 + (audio ? audio.mids * 0.4 : 0.2))) % 1.0;
          const pt = this.splinePathEl.getPointAtLength(p.t * this.splineTotalLength);

          p.haloEl.setAttribute('cx', pt.x);
          p.haloEl.setAttribute('cy', pt.y);
          p.coreEl.setAttribute('cx', pt.x);
          p.coreEl.setAttribute('cy', pt.y);
        }
      }

      // 4. Audio Kick Transient Reaction
      if (audio && audio.kickScale > 1.01) {
        for (const node of this.nodePool) {
          if (node.active && Math.abs(node.currentSlot - 2.0) < 0.2) {
            gsap.to(node.el, {
              scale: this.getSlotScale(node.currentSlot) * audio.kickScale,
              duration: 0.15,
              ease: "power2.out",
              overwrite: "auto",
              onComplete: () => {
                gsap.to(node.el, {
                  scale: this.getSlotScale(node.currentSlot),
                  duration: 0.35,
                  ease: "power3.out"
                });
              }
            });
            break;
          }
        }
      }

      this.updateSvgOverlays(audio);
    }

    // Update Persistent SVG Rings & Optical Beads (Zero-GC Attribute Updates)
    updateSvgOverlays(audio) {
      const cx = this.width * 0.5;
      const cy = this.height * 0.5;
      const tilt = -18; // -18 deg isometric tilt

      const ripple = audio ? (audio.orbitalRipple * 38) : 0;

      // 1. Hero Concentric Rings (Centered perfectly on Hero Center Stage)
      this.heroRingTransform.setAttribute('transform', `translate(${cx}, ${cy}) rotate(${tilt})`);
      this.heroHaloRing.setAttribute('rx', 175 + ripple);
      this.heroHaloRing.setAttribute('ry', 72 + ripple * 0.42);
      this.heroMidRing.setAttribute('rx', 175 + ripple);
      this.heroMidRing.setAttribute('ry', 72 + ripple * 0.42);
      this.heroCoreRing.setAttribute('rx', 175 + ripple);
      this.heroCoreRing.setAttribute('ry', 72 + ripple * 0.42);

      // In Idle Mode, rings breathe with serene cosmic pulse
      if (this.isIdle) {
        const idleBreathe = Math.sin(performance.now() * 0.0012) * 5;
        this.heroCoreRing.setAttribute('rx', 175 + idleBreathe);
        this.heroCoreRing.setAttribute('ry', 72 + idleBreathe * 0.42);
      }

      // 2. Outer Word Rings
      for (let i = 0; i < this.nodePool.length; i++) {
        const node = this.nodePool[i];
        const ringObj = this.ringElements[i];
        if (!ringObj) continue;

        if (!node.active) {
          ringObj.ellipse.setAttribute('opacity', '0');
          continue;
        }

        const heroFactor = this.getHeroFactor(node.currentSlot);
        if (heroFactor > 0.6) {
          ringObj.ellipse.setAttribute('opacity', '0');
          continue;
        }

        const pos = this.getSlotPos(node.currentSlot);
        const scale = this.getSlotScale(node.currentSlot);
        const rx = 44 * (scale / 0.74);
        const ry = 19 * (scale / 0.74);
        const opacity = this.getSlotOpacity(node.currentSlot) * 0.65;

        ringObj.group.setAttribute('transform', `translate(${pos.x}, ${pos.y}) rotate(${tilt})`);
        ringObj.ellipse.setAttribute('rx', rx);
        ringObj.ellipse.setAttribute('ry', ry);
        ringObj.ellipse.setAttribute('opacity', opacity.toFixed(3));
      }

      // 3. Optical Anchor Beads on the Spline
      for (let i = 0; i < this.nodePool.length; i++) {
        const node = this.nodePool[i];
        const beadObj = this.beadElements[i];
        if (!beadObj) continue;

        if (!node.active) {
          beadObj.group.setAttribute('opacity', '0');
          continue;
        }

        const pos = this.getSlotPos(node.currentSlot);
        const scale = this.getSlotScale(node.currentSlot);
        const heroFactor = this.getHeroFactor(node.currentSlot);
        const opacity = this.getSlotOpacity(node.currentSlot);

        if (heroFactor > 0.5) {
          // HERO PERIOD ANCHOR BEAD
          const textLen = (node.text || "").length;
          const heroHalfW = Math.max(28, textLen * 10);
          const bx = pos.x + heroHalfW + 6;
          const by = pos.y + 16;

          beadObj.group.setAttribute('transform', `translate(${bx}, ${by})`);
          beadObj.group.setAttribute('opacity', (opacity * heroFactor).toFixed(3));
          beadObj.halo.setAttribute('r', '32');
          beadObj.halo.setAttribute('fill', 'url(#heroBeadGlow)');
          beadObj.core.setAttribute('r', '3.2');
          beadObj.hRay.setAttribute('opacity', (0.92 * heroFactor).toFixed(3));
          beadObj.dRay.setAttribute('opacity', (0.65 * heroFactor).toFixed(3));
        } else {
          // OUTER WORD BEAD
          const bx = pos.x;
          const by = pos.y + 20 * scale;

          beadObj.group.setAttribute('transform', `translate(${bx}, ${by})`);
          beadObj.group.setAttribute('opacity', opacity.toFixed(3));
          beadObj.halo.setAttribute('r', '14');
          beadObj.halo.setAttribute('fill', 'url(#nodeBeadGlow)');
          beadObj.core.setAttribute('r', '1.8');
          beadObj.hRay.setAttribute('opacity', '0');
          beadObj.dRay.setAttribute('opacity', '0');
        }
      }
    }
  }

  exports.GsapLyricEngine = GsapLyricEngine;
})(window.SongNode);
