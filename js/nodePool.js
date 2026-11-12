/* =========================================================================
   NODE POOL MODULE (ZERO-GC OBJECT POOL + 2ND-ORDER SPRING PHYSICS)
   ========================================================================= */

window.SongNode = window.SongNode || {};

(function(exports) {
  // 5-Slot Target Specs
  const SLOT_SPECS = [
    { name: 'FAR_PAST', scale: 0.60, opacity: 0.18, isHero: false },
    { name: 'PREV',     scale: 0.85, opacity: 0.50, isHero: false },
    { name: 'HERO',     scale: 1.85, opacity: 1.00, isHero: true  },
    { name: 'NEXT',     scale: 0.85, opacity: 0.50, isHero: false },
    { name: 'FAR_NEXT', scale: 0.60, opacity: 0.18, isHero: false }
  ];

  class Node {
    constructor(id) {
      this.id = id;
      this.text = "";
      this.slotIndex = 2;

      // Position & Spring Physics
      this.x = 0;
      this.y = 0;
      this.vx = 0;
      this.vy = 0;

      this.targetX = 0;
      this.targetY = 0;

      // Scale & Spring Physics
      this.scale = 1.0;
      this.vScale = 0;
      this.targetScale = 1.0;

      // Opacity & Spring Physics
      this.opacity = 1.0;
      this.vOpacity = 0;
      this.targetOpacity = 1.0;

      // Floating harmonic drift
      this.floatPhase = id * 1.35;
      this.floatY = 0;

      // Hero glow phase (0 = outer, 1 = hero)
      this.heroPhase = 0;
    }

    // Critically Damped Spring Physics Update
    step(dt, stiffness, damping) {
      // 1. Position Spring
      const ax = -stiffness * (this.x - this.targetX) - damping * this.vx;
      const ay = -stiffness * (this.y - this.targetY) - damping * this.vy;
      this.vx += ax * dt;
      this.vy += ay * dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt;

      // 2. Scale Spring
      const aScale = -stiffness * (this.scale - this.targetScale) - damping * this.vScale;
      this.vScale += aScale * dt;
      this.scale += this.vScale * dt;

      // 3. Opacity Spring
      const aOp = -(stiffness * 1.2) * (this.opacity - this.targetOpacity) - (damping * 1.2) * this.vOpacity;
      this.vOpacity += aOp * dt;
      this.opacity = Math.max(0, Math.min(1, this.opacity + this.vOpacity * dt));

      // 4. Hero Transition Phase
      const targetHero = (this.slotIndex === 2) ? 1.0 : 0.0;
      this.heroPhase += (targetHero - this.heroPhase) * (1.0 - Math.exp(-9.0 * dt));

      // 5. Ambient Levitation Drift
      this.floatY = Math.sin(performance.now() * 0.0018 + this.floatPhase) * 4.5;
    }
  }

  class NodePool {
    constructor() {
      // Fixed pool of exactly 5 nodes - ZERO allocations during runtime
      this.nodes = [
        new Node(0),
        new Node(1),
        new Node(2),
        new Node(3),
        new Node(4)
      ];

      // Physical Slot Coordinates along the S-Curve (computed on resize & mode)
      this.slotPositions = [
        { x: -480, y: -190 }, // 0: FAR_PAST (top-left)
        { x: -260, y: -95  }, // 1: PREV
        { x: 0,    y: 0    }, // 2: HERO (center)
        { x: 280,  y: 90   }, // 3: NEXT
        { x: 490,  y: 180  }  // 4: FAR_NEXT (bottom-right)
      ];

      // Spring parameters (modulated by Heuristic Lyric Pacing)
      this.stiffness = 55.0; // Responsive harmonic spring
      this.damping = 13.0;   // Critical damping (no jarring oscillation)

      this.isSweeping = false;
      this.sweepTimer = 0;
    }

    // Recalculate S-curve layout based on canvas dimensions and pacing
    updateLayout(width, height, curveTightness = 1.0) {
      const halfW = width * 0.5;
      const halfH = height * 0.5;

      const spanX = Math.min(680, halfW * 0.72) * curveTightness;
      const spanY = Math.min(270, halfH * 0.55) * curveTightness;

      this.slotPositions[0] = { x: -spanX,        y: -spanY };
      this.slotPositions[1] = { x: -spanX * 0.54, y: -spanY * 0.48 };
      this.slotPositions[2] = { x: 0,             y: 0 };
      this.slotPositions[3] = { x: spanX * 0.54,  y: spanY * 0.48 };
      this.slotPositions[4] = { x: spanX,         y: spanY };

      // Apply target positions to nodes
      for (let i = 0; i < 5; i++) {
        const node = this.nodes[i];
        const slot = node.slotIndex;
        if (slot >= 0 && slot < 5) {
          node.targetX = this.slotPositions[slot].x;
          node.targetY = this.slotPositions[slot].y;
          node.targetScale = SLOT_SPECS[slot].scale;
          node.targetOpacity = SLOT_SPECS[slot].opacity;
        }
      }
    }

    // Set initial or new 5 words sentence cleanly
    setSentence(wordsArray, heroSlot = 2) {
      if (!Array.isArray(wordsArray)) return;

      for (let i = 0; i < 5; i++) {
        const node = this.nodes[i];
        node.text = wordsArray[i] || "";
        node.slotIndex = i;

        const spec = SLOT_SPECS[i];
        const pos = this.slotPositions[i];

        node.targetX = pos.x;
        node.targetY = pos.y;
        node.targetScale = spec.scale;
        node.targetOpacity = spec.opacity;

        // Snappy initial snap if newly initialized
        if (node.x === 0 && node.y === 0 && i !== 2) {
          node.x = pos.x;
          node.y = pos.y;
          node.scale = spec.scale;
          node.opacity = spec.opacity;
        }
      }
    }

    // Zero-GC FIFO Cycle: Oldest word drops out, new word enters at the back
    advance(newWordText) {
      // 1. Shift node 0 (oldest) to the back of the queue
      const recycledNode = this.nodes.shift();
      this.nodes.push(recycledNode);

      // 2. Overwrite text without string destruction
      recycledNode.text = newWordText || "";
      recycledNode.slotIndex = 4; // Targets SLOT_FAR_NEXT

      // 3. Spawn recycled node from offscreen right
      recycledNode.x = this.slotPositions[4].x + 180;
      recycledNode.y = this.slotPositions[4].y + 70;
      recycledNode.opacity = 0.0;
      recycledNode.scale = 0.4;

      // 4. Update all node slot targets
      for (let i = 0; i < 5; i++) {
        const node = this.nodes[i];
        node.slotIndex = i;

        const spec = SLOT_SPECS[i];
        const pos = this.slotPositions[i];

        node.targetX = pos.x;
        node.targetY = pos.y;
        node.targetScale = spec.scale;
        node.targetOpacity = spec.opacity;
      }
    }

    // Heuristic Section Break Sweep: Current constellation sweeps left, new verse fades in right
    triggerSweep(nextWords) {
      this.isSweeping = true;

      // Send all current nodes rushing off to the left into the void
      for (let i = 0; i < 5; i++) {
        const node = this.nodes[i];
        node.targetX -= 700;
        node.targetOpacity = 0.0;
        node.targetScale = 0.3;
      }

      setTimeout(() => {
        // Teleport nodes offscreen right with new words and glide them in
        for (let i = 0; i < 5; i++) {
          const node = this.nodes[i];
          node.text = nextWords[i] || "";
          node.slotIndex = i;

          const spec = SLOT_SPECS[i];
          const pos = this.slotPositions[i];

          node.x = pos.x + 600;
          node.y = pos.y + 150;
          node.vx = 0;
          node.vy = 0;
          node.opacity = 0.0;
          node.scale = 0.3;

          node.targetX = pos.x;
          node.targetY = pos.y;
          node.targetScale = spec.scale;
          node.targetOpacity = spec.opacity;
        }
        this.isSweeping = false;
      }, 550);
    }

    // Set pacing physics based on LRC timestamp gap
    setPacing(gapSeconds) {
      if (gapSeconds < 1.0) {
        // Fast Pacing (rap, fast verse) -> Tighter curve, stiffer spring
        this.stiffness = 85.0;
        this.damping = 16.0;
      } else if (gapSeconds > 2.2) {
        // Ballad / Ambient Pacing -> Lush float, gentle spring
        this.stiffness = 38.0;
        this.damping = 11.0;
      } else {
        // Standard Pacing
        this.stiffness = 55.0;
        this.damping = 13.0;
      }
    }

    update(dt) {
      const fixedDt = Math.min(0.05, dt);
      for (let i = 0; i < 5; i++) {
        this.nodes[i].step(fixedDt, this.stiffness, this.damping);
      }
    }
  }

  exports.NodePool = NodePool;
})(window.SongNode);

