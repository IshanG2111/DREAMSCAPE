/* =========================================================================
   DREAMSCAPE CONSTELLATION LYRIC ENGINE
   Exact reference replica of the celestial constellation lyric system:
   - Word star nodes with 4-point cross diffraction lens flares.
   - Tilted elliptical planetary orbital rings with traveling starlight beads.
   - Smooth curved spline & filament connections between words.
   - High-contrast Didone italic serif typography with starlight bloom.
   - Real-time audio note reactivity, expanding shockwaves, and harmonic springs.
   ========================================================================= */

window.SongNode = window.SongNode || {};

(function(exports) {
  // 2nd-Order Damped Spring Word Node
  class ConstellationNode {
    constructor(id, text, startMs, endMs) {
      this.id = id;
      this.text = text || "";
      this.startMs = startMs || 0;
      this.endMs = endMs || (startMs + 600);
      this.durationMs = Math.max(200, this.endMs - this.startMs);

      this.isHero = false;
      this.heroFactor = 0.0;
      this.targetHeroFactor = 0.0;
      this.vHero = 0.0;

      // Position in world space (relative to screen center 0, 0)
      this.currentX = 0;
      this.targetX = 0;
      this.vx = 0;

      this.currentY = 0;
      this.targetY = 0;
      this.vy = 0;

      // Word label offset relative to star node
      this.labelOffsetX = 0;
      this.labelOffsetY = 0;
      this.targetLabelOffsetX = 0;
      this.targetLabelOffsetY = 0;
      this.vLabelX = 0;
      this.vLabelY = 0;

      // Optical parameters
      this.currentScale = 0.5;
      this.targetScale = 1.0;
      this.vScale = 0;

      this.currentOpacity = 0.0;
      this.targetOpacity = 0.0;
      this.vOpacity = 0;

      // Orbital features
      this.hasOrbit = false;
      this.orbitRadiusX = 55;
      this.orbitRadiusY = 22;
      this.orbitAngle = -0.26; // ~ -15 degrees
      this.hasOuterOrbit = false;
      this.outerOrbitRadiusX = 95;
      this.outerOrbitRadiusY = 36;
      this.hasFlares = false;

      // Harmonic celestial drift
      this.driftPhaseX = Math.random() * Math.PI * 2;
      this.driftPhaseY = Math.random() * Math.PI * 2;
      this.driftSpeedX = 0.6 + Math.random() * 0.4;
      this.driftSpeedY = 0.8 + Math.random() * 0.4;
      this.driftX = 0;
      this.driftY = 0;

      // Note reaction impulse
      this.noteImpulse = 0.0;

      this.inCurrentWindow = true;
    }

    triggerNote(energy = 0.5) {
      this.noteImpulse = Math.min(1.0, this.noteImpulse + energy);
    }

    update(dt, timeSec, audio = null, currentSongMs = 0) {
      const safeDt = Math.min(0.04, Math.max(0.001, dt));

      // 1. Note impulse decay
      this.noteImpulse *= Math.exp(-7.0 * safeDt);

      // 2. Harmonic celestial micro-drift (gives words living celestial weight)
      const driftScale = 1.0 - this.heroFactor * 0.4;
      this.driftX = Math.cos(timeSec * this.driftSpeedX + this.driftPhaseX) * (3.5 * driftScale);
      this.driftY = Math.sin(timeSec * this.driftSpeedY + this.driftPhaseY) * (4.5 * driftScale);

      // 3. Audio & Vocal Climax Evaluation
      const bass = audio ? (audio.bass || 0.15) : 0.15;
      const mids = audio ? (audio.mids || 0.15) : 0.15;
      let vocalClimax = 0.0;
      if (this.isHero && this.durationMs > 0 && currentSongMs >= this.startMs && currentSongMs <= this.endMs) {
        const p = Math.max(0, Math.min(1, (currentSongMs - this.startMs) / this.durationMs));
        vocalClimax = Math.sin(p * Math.PI) * 0.25;
      }

      const activeScaleBoost = (this.heroFactor * 0.18 * (mids + bass)) + (this.heroFactor * vocalClimax) + (this.noteImpulse * 0.12);
      const modulatedTargetScale = this.targetScale * (1.0 + activeScaleBoost);

      // 4. 2nd-Order Damped Harmonic Spring Physics
      const stiffness = 28.0;
      const damping = 9.8;

      // X Position
      const fx = -stiffness * (this.currentX - this.targetX) - damping * this.vx;
      this.vx += fx * safeDt;
      this.currentX += this.vx * safeDt;

      // Y Position
      const fy = -stiffness * (this.currentY - this.targetY) - damping * this.vy;
      this.vy += fy * safeDt;
      this.currentY += this.vy * safeDt;

      // Label offsets
      const flx = -stiffness * (this.labelOffsetX - this.targetLabelOffsetX) - damping * this.vLabelX;
      this.vLabelX += flx * safeDt;
      this.labelOffsetX += this.vLabelX * safeDt;

      const fly = -stiffness * (this.labelOffsetY - this.targetLabelOffsetY) - damping * this.vLabelY;
      this.vLabelY += fly * safeDt;
      this.labelOffsetY += this.vLabelY * safeDt;

      // Scale
      const fScale = -34.0 * (this.currentScale - modulatedTargetScale) - 10.5 * this.vScale;
      this.vScale += fScale * safeDt;
      this.currentScale = Math.max(0.01, this.currentScale + this.vScale * safeDt);

      // Opacity
      const fOpacity = -30.0 * (this.currentOpacity - this.targetOpacity) - 10.8 * this.vOpacity;
      this.vOpacity += fOpacity * safeDt;
      this.currentOpacity = Math.max(0.0, Math.min(1.0, this.currentOpacity + this.vOpacity * safeDt));

      // Hero factor
      const fHero = -28.0 * (this.heroFactor - this.targetHeroFactor) - 9.8 * this.vHero;
      this.vHero += fHero * safeDt;
      this.heroFactor = Math.max(0.0, Math.min(1.0, this.heroFactor + this.vHero * safeDt));
    }

    getStarPos() {
      return {
        x: this.currentX + this.driftX,
        y: this.currentY + this.driftY
      };
    }

    getLabelPos() {
      return {
        x: this.currentX + this.driftX + this.labelOffsetX,
        y: this.currentY + this.driftY + this.labelOffsetY
      };
    }
  }

  class ConstellationEngine {
    constructor() {
      // Active nodes collection keyed by unique `${text}_${startMs}`
      this.nodes = new Map();
      this.orderedNodeKeys = [];

      this.isVocalActive = false;
      this.vocalStageAlpha = 0.0;

      // Intermediate celestial junction vertex (Vertex Node from reference diagram)
      this.vertexNode = {
        x: 235,
        y: -25,
        currentX: 235,
        currentY: -25,
        alpha: 0.85
      };

      // Orbit traveling beads
      this.orbitBeads = [];
      this.initOrbitBeads(16);

      // Traveling photons along constellation filaments
      this.photons = [
        { progress: 0.12, speed: 0.16, size: 2.6, color: '#ffffff' },
        { progress: 0.48, speed: 0.20, size: 2.2, color: '#9b72ff' },
        { progress: 0.76, speed: 0.14, size: 2.0, color: '#6A9EFF' }
      ];

      // Shockwave rings emitted on drum kicks and vocal climaxes
      this.shockwaves = [];

      // Stardust background particles
      this.stardust = [];
      this.initStardust(65);
    }

    initOrbitBeads(count) {
      this.orbitBeads = [];
      for (let i = 0; i < count; i++) {
        this.orbitBeads.push({
          angle: (i / count) * Math.PI * 2,
          speed: (Math.random() * 0.03 + 0.015) * (i % 2 === 0 ? 1 : -1),
          size: Math.random() * 1.5 + 1.0,
          alpha: Math.random() * 0.6 + 0.4
        });
      }
    }

    initStardust(count) {
      this.stardust = [];
      for (let i = 0; i < count; i++) {
        this.stardust.push({
          x: (Math.random() - 0.5) * 1920,
          y: (Math.random() - 0.5) * 1080,
          size: Math.random() * 1.3 + 0.6,
          baseAlpha: Math.random() * 0.35 + 0.15,
          phase: Math.random() * Math.PI * 2,
          speed: Math.random() * 0.8 + 0.3
        });
      }
    }

    triggerNote(type = 'note', energy = 0.6) {
      // Trigger impulse on hero node
      for (const node of this.nodes.values()) {
        if (node.isHero) {
          node.triggerNote(energy);
          const pos = node.getStarPos();
          this.emitShockwave(pos.x, pos.y, energy);
        }
      }
    }

    emitShockwave(x, y, energy = 0.5) {
      if (this.shockwaves.length > 6) this.shockwaves.shift();
      this.shockwaves.push({
        x, y,
        radius: 8,
        maxRadius: 75 + energy * 65,
        alpha: 0.85,
        speed: 95 + energy * 85
      });
    }

    // Set phrase window with exact reference astronomical geometry
    setPhraseWindow(windowWords, heroIndex = 2, centerWordData = null, isVocalActive = true) {
      this.isVocalActive = Boolean(isVocalActive && centerWordData);

      if (!this.isVocalActive) {
        for (const node of this.nodes.values()) {
          node.targetOpacity = 0.0;
          node.inCurrentWindow = false;
        }
        return;
      }

      // Filter non-null words
      const validWords = [];
      let activeIdxInValid = -1;

      for (let i = 0; i < windowWords.length; i++) {
        const w = windowWords[i];
        if (w && w.text) {
          if (centerWordData && w.startMs === centerWordData.startMs && w.text === centerWordData.text) {
            activeIdxInValid = validWords.length;
          }
          validWords.push(w);
        }
      }

      if (validWords.length === 0 && centerWordData) {
        validWords.push(centerWordData);
        activeIdxInValid = 0;
      }

      // Canonical 5-Node Constellation Geometry from Reference Diagram:
      // Star 0: (-370, -180), Word label right (+65, -8),   Orbit: YES, Flares: YES ("All")
      // Star 1: (-185, -45),  Word label bottom (0, +48),   Orbit: NO,  Flares: NO  ("it's")
      // Star 2: (50, -150),   Word label top (0, -42),      Orbit: NO,  Flares: NO  ("hard")
      // Star 3: (-15, 95),    Word label bottom (0, +48),   Orbit: NO,  Flares: NO  ("to")
      // Star 4: (345, -50),   Word label right (+65, -2),   Orbit: YES (Nested), Flares: YES ("you")
      const canonical5 = [
        {
          x: -370, y: -180,
          lblX: 62, lblY: -8,
          align: 'left',
          hasOrbit: true, hasOuterOrbit: false, hasFlares: true,
          orbitRx: 65, orbitRy: 24, orbitAngle: -0.28
        },
        {
          x: -185, y: -45,
          lblX: 0, lblY: 48,
          align: 'center',
          hasOrbit: false, hasOuterOrbit: false, hasFlares: false
        },
        {
          x: 50, y: -150,
          lblX: 0, lblY: -44,
          align: 'center',
          hasOrbit: false, hasOuterOrbit: false, hasFlares: false
        },
        {
          x: -15, y: 95,
          lblX: 0, lblY: 48,
          align: 'center',
          hasOrbit: false, hasOuterOrbit: false, hasFlares: false
        },
        {
          x: 345, y: -50,
          lblX: 68, lblY: -2,
          align: 'left',
          hasOrbit: true, hasOuterOrbit: true, hasFlares: true,
          orbitRx: 58, orbitRy: 24, orbitAngle: -0.22,
          outerRx: 98, outerRy: 36
        }
      ];

      const n = validWords.length;
      const seenKeys = new Set();
      this.orderedNodeKeys = [];

      for (let i = 0; i < n; i++) {
        const wordObj = validWords[i];
        const key = `${wordObj.text}_${wordObj.startMs}`;
        seenKeys.add(key);
        this.orderedNodeKeys.push(key);

        const isHero = (i === activeIdxInValid) || (activeIdxInValid === -1 && i === Math.floor(n / 2));

        // Map layout slot
        let slot;
        if (n === 5) {
          slot = canonical5[i];
        } else if (n === 4) {
          const idxs = [0, 1, 2, 4];
          slot = canonical5[idxs[i]];
        } else if (n === 3) {
          const idxs = [0, 2, 4];
          slot = canonical5[idxs[i]];
        } else {
          // General distribution
          const t = i / Math.max(1, n - 1);
          slot = {
            x: -420 + t * 840,
            y: Math.sin(t * Math.PI * 2.2) * 110 - 40,
            lblX: 0, lblY: (i % 2 === 0 ? -45 : 45),
            align: 'center',
            hasOrbit: (i === 0 || i === n - 1 || isHero),
            hasOuterOrbit: (i === n - 1),
            hasFlares: (i === 0 || i === n - 1 || isHero),
            orbitRx: 55, orbitRy: 22, orbitAngle: -0.24
          };
        }

        let node = this.nodes.get(key);
        const isFirstMount = !node;

        if (isFirstMount) {
          node = new ConstellationNode(key, wordObj.text, wordObj.startMs, wordObj.endMs);
          node.currentX = slot.x;
          node.currentY = slot.y;
          node.labelOffsetX = slot.lblX;
          node.labelOffsetY = slot.lblY;
          node.currentScale = isHero ? 1.05 : 0.95;
          node.currentOpacity = 0.0;
          this.nodes.set(key, node);
        }

        node.targetX = slot.x;
        node.targetY = slot.y;
        node.targetLabelOffsetX = slot.lblX;
        node.targetLabelOffsetY = slot.lblY;
        node.textAlign = slot.align || 'center';

        node.hasOrbit = slot.hasOrbit;
        node.hasOuterOrbit = slot.hasOuterOrbit;
        node.hasFlares = slot.hasFlares;
        node.orbitRadiusX = slot.orbitRx || 55;
        node.orbitRadiusY = slot.orbitRy || 22;
        node.orbitAngle = slot.orbitAngle || -0.24;
        if (slot.outerRx) node.outerOrbitRadiusX = slot.outerRx;
        if (slot.outerRy) node.outerOrbitRadiusY = slot.outerRy;

        node.isHero = isHero;
        node.targetHeroFactor = isHero ? 1.0 : 0.0;
        node.targetScale = isHero ? 1.08 : 0.92;
        node.targetOpacity = isHero ? 1.0 : 0.72; // Full visibility of non-hero words so constellation forms complete sentence!
        node.inCurrentWindow = true;
      }

      // Smoothly fade out nodes not in active phrase
      for (const [key, node] of this.nodes.entries()) {
        if (!seenKeys.has(key)) {
          node.inCurrentWindow = false;
          node.targetOpacity = 0.0;
          node.targetHeroFactor = 0.0;
          node.isHero = false;
        }
      }
    }

    update(dt, timeSec, audio = null, lyricClock = null) {
      const targetAlpha = this.isVocalActive ? 1.0 : 0.0;
      const vocalEase = 1.0 - Math.exp((this.isVocalActive ? -6.0 : -3.5) * dt);
      this.vocalStageAlpha += (targetAlpha - this.vocalStageAlpha) * vocalEase;

      const currentSongMs = lyricClock ? lyricClock.currentPositionMs : 0;
      const bass = audio ? (audio.bass || 0.15) : 0.15;

      // Update nodes
      const toDelete = [];
      for (const [key, node] of this.nodes.entries()) {
        node.update(dt, timeSec, audio, currentSongMs);
        if (!node.inCurrentWindow && node.currentOpacity < 0.005) {
          toDelete.push(key);
        }
      }
      for (const k of toDelete) this.nodes.delete(k);

      // Advance orbit beads
      for (const bead of this.orbitBeads) {
        bead.angle += bead.speed * dt * (1.0 + bass * 0.4);
      }

      // Advance traveling photons
      for (const p of this.photons) {
        p.progress = (p.progress + dt * p.speed * (1.0 + bass * 0.5)) % 1.0;
      }

      // Update shockwaves
      for (let i = this.shockwaves.length - 1; i >= 0; i--) {
        const sw = this.shockwaves[i];
        sw.radius += sw.speed * dt;
        sw.alpha = Math.max(0, 0.85 * (1.0 - sw.radius / sw.maxRadius));
        if (sw.radius >= sw.maxRadius || sw.alpha <= 0.01) {
          this.shockwaves.splice(i, 1);
        }
      }
    }

    render(ctx, timeSec, audio = null, colorExtractor = null, lyricClock = null) {
      const primaryRgba = (a) => colorExtractor ? colorExtractor.getCssRgba('primary', a) : `rgba(141, 101, 255, ${a})`;
      const secondaryRgba = (a) => colorExtractor ? colorExtractor.getCssRgba('secondary', a) : `rgba(106, 158, 255, ${a})`;
      const pearlRgba = (a) => colorExtractor ? colorExtractor.getCssRgba('pearl', a) : `rgba(241, 234, 251, ${a})`;
      const highlightRgba = (a) => colorExtractor ? colorExtractor.getCssRgba('highlight', a) : `rgba(197, 201, 228, ${a})`;

      // 1. Ambient Stardust
      this.renderStardust(ctx, timeSec, audio);

      // 2. Shockwaves from song notes & kicks
      this.renderShockwaves(ctx, primaryRgba);

      if (this.vocalStageAlpha < 0.02) return;

      const stageAlpha = this.vocalStageAlpha;

      // Extract active ordered nodes
      const activeNodes = [];
      for (const key of this.orderedNodeKeys) {
        const n = this.nodes.get(key);
        if (n && n.currentOpacity > 0.01) {
          activeNodes.push(n);
        }
      }

      if (activeNodes.length === 0) return;

      // 3. Render Connecting Constellation Filaments & Splines
      this.renderConstellationFilaments(ctx, activeNodes, stageAlpha, primaryRgba, secondaryRgba, pearlRgba);

      // 4. Render Traveling Comet Photons along Filaments
      this.renderTravelingPhotons(ctx, activeNodes, stageAlpha, primaryRgba, pearlRgba);

      // 5. Render Constellation Star Nodes, Planetary Orbits, and Diffraction Flares
      for (const node of activeNodes) {
        this.renderStarNode(ctx, node, stageAlpha, timeSec, primaryRgba, secondaryRgba, pearlRgba, highlightRgba, audio);
      }

      // 6. Render Italic Didone Serif Typography
      for (const node of activeNodes) {
        this.renderWordTypography(ctx, node, stageAlpha, timeSec, primaryRgba, pearlRgba, highlightRgba, audio);
      }
    }

    renderStardust(ctx, timeSec, audio) {
      ctx.save();
      ctx.fillStyle = '#ffffff';
      const trebleBoost = audio ? audio.treble * 0.35 : 0;

      for (const s of this.stardust) {
        const twinkle = Math.sin(timeSec * s.speed + s.phase) * 0.35 + 0.65;
        ctx.globalAlpha = Math.min(1.0, (s.baseAlpha + trebleBoost) * twinkle);
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    renderShockwaves(ctx, primaryRgba) {
      if (this.shockwaves.length === 0) return;
      ctx.save();
      for (const sw of this.shockwaves) {
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = primaryRgba(sw.alpha * 0.6);
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.lineWidth = 0.5;
        ctx.strokeStyle = `rgba(255, 255, 255, ${sw.alpha * 0.8})`;
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Connects stars according to the canonical astronomical geometry
    renderConstellationFilaments(ctx, nodes, stageAlpha, primaryRgba, secondaryRgba, pearlRgba) {
      if (nodes.length < 2) return;
      ctx.save();

      const n = nodes.length;

      // When we have the 5-node canonical phrase:
      // Star 0 -> Star 1 -> Star 2 -> Vertex -> Star 4
      // Star 3 -> (curved spline) -> Vertex -> Star 4
      if (n === 5) {
        const p0 = nodes[0].getStarPos();
        const p1 = nodes[1].getStarPos();
        const p2 = nodes[2].getStarPos();
        const p3 = nodes[3].getStarPos();
        const p4 = nodes[4].getStarPos();
        const pV = { x: this.vertexNode.x, y: this.vertexNode.y };

        const a01 = Math.min(nodes[0].currentOpacity, nodes[1].currentOpacity) * stageAlpha;
        const a12 = Math.min(nodes[1].currentOpacity, nodes[2].currentOpacity) * stageAlpha;
        const a2V = Math.min(nodes[2].currentOpacity, stageAlpha);
        const a3V = Math.min(nodes[3].currentOpacity, stageAlpha);
        const aV4 = Math.min(nodes[4].currentOpacity, stageAlpha);

        // Filament 0 -> 1 (All to it's)
        this.drawLine(ctx, p0.x, p0.y, p1.x, p1.y, a01, primaryRgba, pearlRgba);

        // Filament 1 -> 2 (it's to hard)
        this.drawLine(ctx, p1.x, p1.y, p2.x, p2.y, a12, primaryRgba, pearlRgba);

        // Filament 2 -> Vertex (hard to vertex)
        this.drawLine(ctx, p2.x, p2.y, pV.x, pV.y, a2V, primaryRgba, pearlRgba);

        // Filament 3 -> Vertex (to -> vertex CURVED SPLINE ARC)
        // In the diagram, the filament from 'to' curves gracefully up-right into the vertex!
        const cpX = (p3.x + pV.x) * 0.5 + 40;
        const cpY = p3.y + 15;
        this.drawCurvedSpline(ctx, p3.x, p3.y, cpX, cpY, pV.x, pV.y, a3V, primaryRgba, pearlRgba);

        // Filament Vertex -> 4 (vertex to you)
        this.drawLine(ctx, pV.x, pV.y, p4.x, p4.y, aV4, primaryRgba, pearlRgba);

        // Draw Vertex Star Bead
        ctx.fillStyle = pearlRgba(0.85 * stageAlpha);
        ctx.beginPath();
        ctx.arc(pV.x, pV.y, 2.2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Sequential starlight lines for general N words
        for (let i = 0; i < n - 1; i++) {
          const s1 = nodes[i];
          const s2 = nodes[i + 1];
          const p1 = s1.getStarPos();
          const p2 = s2.getStarPos();
          const segAlpha = Math.min(s1.currentOpacity, s2.currentOpacity) * stageAlpha;
          this.drawLine(ctx, p1.x, p1.y, p2.x, p2.y, segAlpha, primaryRgba, pearlRgba);
        }
      }

      ctx.restore();
    }

    drawLine(ctx, x1, y1, x2, y2, alpha, primaryRgba, pearlRgba) {
      if (alpha <= 0.005) return;

      // Soft starlight glow aura
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = primaryRgba(0.26 * alpha);
      ctx.lineWidth = 2.8;
      ctx.stroke();

      // Sharp luminous core filament
      const grad = ctx.createLinearGradient(x1, y1, x2, y2);
      grad.addColorStop(0, pearlRgba(0.85 * alpha));
      grad.addColorStop(0.5, 'rgba(255, 255, 255, ' + (0.95 * alpha) + ')');
      grad.addColorStop(1, pearlRgba(0.85 * alpha));

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 0.95;
      ctx.stroke();
    }

    drawCurvedSpline(ctx, x1, y1, cx, cy, x2, y2, alpha, primaryRgba, pearlRgba) {
      if (alpha <= 0.005) return;

      // Soft starlight glow aura
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.quadraticCurveTo(cx, cy, x2, y2);
      ctx.strokeStyle = primaryRgba(0.28 * alpha);
      ctx.lineWidth = 3.0;
      ctx.stroke();

      // Sharp luminous core curved filament
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.quadraticCurveTo(cx, cy, x2, y2);
      ctx.strokeStyle = pearlRgba(0.90 * alpha);
      ctx.lineWidth = 1.0;
      ctx.stroke();
    }

    renderTravelingPhotons(ctx, nodes, stageAlpha, primaryRgba, pearlRgba) {
      if (nodes.length < 2) return;
      const count = nodes.length - 1;

      ctx.save();
      for (const p of this.photons) {
        const segIdx = Math.floor(p.progress * count);
        const t = (p.progress * count) - segIdx;

        if (segIdx < count) {
          const s1 = nodes[segIdx];
          const s2 = nodes[segIdx + 1];
          const p1 = s1.getStarPos();
          const p2 = s2.getStarPos();

          const curX = p1.x + (p2.x - p1.x) * t;
          const curY = p1.y + (p2.y - p1.y) * t;

          // Glowing photon halo
          const grad = ctx.createRadialGradient(curX, curY, 0, curX, curY, 12);
          grad.addColorStop(0, '#ffffff');
          grad.addColorStop(0.35, primaryRgba(0.85 * stageAlpha));
          grad.addColorStop(1, primaryRgba(0));
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(curX, curY, 12, 0, Math.PI * 2);
          ctx.fill();

          // Photon white head
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(curX, curY, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }

    // Render individual star node with orbital rings and cross diffraction flares
    renderStarNode(ctx, node, stageAlpha, timeSec, primaryRgba, secondaryRgba, pearlRgba, highlightRgba, audio) {
      const pos = node.getStarPos();
      const op = node.currentOpacity * stageAlpha;
      if (op <= 0.005) return;

      const hero = node.heroFactor; // 1.0 for currently sung word, 0.0 for others
      const treble = audio ? audio.treble : 0.15;
      const bass = audio ? audio.bass : 0.15;

      ctx.save();
      ctx.translate(pos.x, pos.y);

      // A. Tilted Planetary Orbital Rings (Star 0 'All' and Star 4 'you')
      if (node.hasOrbit || hero > 0.4) {
        const rx = node.orbitRadiusX * (1.0 + bass * 0.15 + node.noteImpulse * 0.18);
        const ry = node.orbitRadiusY * (1.0 + bass * 0.15 + node.noteImpulse * 0.18);
        const orbitAngle = node.orbitAngle || -0.24;

        ctx.save();
        ctx.rotate(orbitAngle);

        // Primary elliptical orbit line
        ctx.lineWidth = 0.95;
        ctx.strokeStyle = primaryRgba((0.45 + hero * 0.35) * op);
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Starlight sheen core
        ctx.lineWidth = 0.55;
        ctx.strokeStyle = `rgba(255, 255, 255, ${(0.35 + hero * 0.45) * op})`;
        ctx.stroke();

        // Traveling beads on the orbit
        for (const bead of this.orbitBeads) {
          const bx = Math.cos(bead.angle) * rx;
          const by = Math.sin(bead.angle) * ry;

          ctx.fillStyle = primaryRgba(bead.alpha * 0.7 * op);
          ctx.beginPath();
          ctx.arc(bx, by, bead.size * 2.0, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = `rgba(255, 255, 255, ${bead.alpha * 0.95 * op})`;
          ctx.beginPath();
          ctx.arc(bx, by, bead.size, 0, Math.PI * 2);
          ctx.fill();
        }

        // Outer concentric orbit (Nested orbit for Star 4 'you')
        if (node.hasOuterOrbit) {
          const outerRx = (node.outerOrbitRadiusX || 95) * (1.0 + bass * 0.12);
          const outerRy = (node.outerOrbitRadiusY || 36) * (1.0 + bass * 0.12);

          ctx.lineWidth = 0.65;
          ctx.strokeStyle = secondaryRgba(0.28 * op);
          ctx.beginPath();
          ctx.ellipse(0, 0, outerRx, outerRy, 0, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.restore();
      }

      // B. Celestial Star Core & Radiant Halo
      const coreSize = hero > 0.2 ? (3.6 + hero * 1.8 + node.noteImpulse * 1.5) : 2.8;
      const haloSize = coreSize * (hero > 0.2 ? 6.5 : 4.0);

      // Star radial halo
      const haloGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, haloSize);
      haloGrad.addColorStop(0, '#ffffff');
      haloGrad.addColorStop(0.25, primaryRgba((0.85 + hero * 0.15) * op));
      haloGrad.addColorStop(1, primaryRgba(0));
      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.arc(0, 0, haloSize, 0, Math.PI * 2);
      ctx.fill();

      // Diamond white core
      ctx.fillStyle = `rgba(255, 255, 255, ${0.98 * op})`;
      ctx.beginPath();
      ctx.arc(0, 0, coreSize, 0, Math.PI * 2);
      ctx.fill();

      // C. Brilliant 4-Point Cross Diffraction Lens Flares (✦)
      if (node.hasFlares || hero > 0.15) {
        const flareMultiplier = (hero > 0.2 ? 1.45 : 1.0) * (1.0 + treble * 0.45 + node.noteImpulse * 0.4);
        const rayLenH = (hero > 0.2 ? 55 : 38) * flareMultiplier;
        const rayLenV = rayLenH * 0.72;
        const flareAlpha = (0.75 + hero * 0.25) * op;

        // Horizontal ray
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.95 * flareAlpha})`;
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(-rayLenH, 0); ctx.lineTo(rayLenH, 0);
        ctx.stroke();

        // Vertical ray
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.85 * flareAlpha})`;
        ctx.lineWidth = 0.95;
        ctx.beginPath();
        ctx.moveTo(0, -rayLenV); ctx.lineTo(0, rayLenV);
        ctx.stroke();

        // 45-degree delicate diagonal glints
        const diagLen = rayLenH * 0.32;
        ctx.strokeStyle = highlightRgba(0.45 * flareAlpha);
        ctx.lineWidth = 0.65;
        ctx.beginPath();
        ctx.moveTo(-diagLen, -diagLen); ctx.lineTo(diagLen, diagLen);
        ctx.moveTo(-diagLen, diagLen); ctx.lineTo(diagLen, -diagLen);
        ctx.stroke();
      }

      ctx.restore();
    }

    // Render Italic Didone Serif Typography
    renderWordTypography(ctx, node, stageAlpha, timeSec, primaryRgba, pearlRgba, highlightRgba, audio) {
      const pos = node.getLabelPos();
      const op = node.currentOpacity * stageAlpha;
      if (op <= 0.005) return;

      const hero = node.heroFactor; // 1.0 (active singing word) -> 0.0 (supporting word)
      const baseFontSize = 58;      // Elegant editorial display scale

      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.scale(node.currentScale, node.currentScale);

      ctx.font = `italic 400 ${baseFontSize}px 'Cormorant Garamond', 'Bodoni Moda', 'Playfair Display', Georgia, serif`;
      ctx.textAlign = node.textAlign || 'center';
      ctx.textBaseline = 'middle';

      // 1. Luminous Starlight Bloom for Active Word
      if (hero > 0.05) {
        ctx.shadowColor = primaryRgba(0.85 * hero * op);
        ctx.shadowBlur = (24 + hero * 12);
        ctx.fillStyle = pearlRgba(0.40 * hero * op);
        ctx.fillText(node.text, 0, 0);
      }

      // 2. Crisp Editorial Didone Letterform Core
      ctx.shadowBlur = 0;
      const coreAlpha = (0.72 * (1.0 - hero) + 0.98 * hero) * op;
      ctx.fillStyle = hero > 0.25 ? `rgba(255, 255, 255, ${coreAlpha})` : `rgba(235, 230, 248, ${coreAlpha})`;
      ctx.fillText(node.text, 0, 0);

      ctx.restore();
    }
  }

  exports.ConstellationEngine = ConstellationEngine;
})(window.SongNode);
