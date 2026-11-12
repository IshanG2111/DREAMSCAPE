/* =========================================================================
   WORD GRAPH
   Manages word nodes in world space, their phrase relationships,
   anchor points, and smooth optical transitions.
   ========================================================================= */

window.SongNode = window.SongNode || {};

(function(exports) {
  class WordNode {
    constructor(id) {
      this.id = id;
      this.text = "";
      this.isActive = false;
      this.slotIndex = 0; // -2, -1, 0 (hero), 1, 2

      // Spatial anchors in world space
      this.anchorX = 0;
      this.anchorY = 0;
      this.labelX = 0;
      this.labelY = 0;

      // Optical state
      this.currentScale = 0.72;
      this.targetScale = 0.72;
      this.currentOpacity = 0.0;
      this.targetOpacity = 0.0;
      this.currentBloom = 0.0;
      this.targetBloom = 0.0;

      this.fontSize = 44;
      this.fontColor = "#f7eef3";
    }

    update(dt) {
      // Fast attack for active word (180-280ms), gentle decay for past words (250-450ms)
      const scaleSpeed = this.isActive ? 9.0 : 4.5;
      const opacitySpeed = this.isActive ? 8.0 : 4.0;
      const bloomSpeed = this.isActive ? 10.0 : 5.0;

      this.currentScale += (this.targetScale - this.currentScale) * Math.min(1.0, dt * scaleSpeed);
      this.currentOpacity += (this.targetOpacity - this.currentOpacity) * Math.min(1.0, dt * opacitySpeed);
      this.currentBloom += (this.targetBloom - this.currentBloom) * Math.min(1.0, dt * bloomSpeed);
    }
  }

  class WordGraph {
    constructor() {
      // 5 visible nodes: [-2, -1, 0 (active), 1, 2]
      this.nodes = [];
      for (let i = 0; i < 5; i++) {
        this.nodes.push(new WordNode(i));
      }

      this.activeNodeIndex = 2; // Center node
      this.horizontalSpread = 280; // Distance between word nodes
      this.verticalAmplitude = 45; // Gentle wave oscillation
      this.splineAnchors = [];

      this.updateNodePositions();
    }

    setPhraseWindow(windowWords, heroIndex = 2, centerWordData = null) {
      this.activeNodeIndex = heroIndex;

      for (let i = 0; i < 5; i++) {
        const node = this.nodes[i];
        const slot = i - 2; // -2, -1, 0, 1, 2
        node.slotIndex = slot;

        const wordObj = windowWords[i];
        const text = (wordObj && wordObj.text) ? wordObj.text : "";
        node.text = text;

        if (slot === 0 && text) {
          // ACTIVE HERO WORD
          node.isActive = true;
          node.targetScale = 1.0;
          node.targetOpacity = 1.0;
          node.targetBloom = 1.0;
          node.fontSize = 88;
        } else if (Math.abs(slot) === 1 && text) {
          // IMMEDIATE NEIGHBOURS
          node.isActive = false;
          node.targetScale = 0.68;
          node.targetOpacity = 0.62;
          node.targetBloom = 0.0;
          node.fontSize = 46;
        } else if (text) {
          // OUTER WORDS
          node.isActive = false;
          node.targetScale = 0.52;
          node.targetOpacity = 0.32;
          node.targetBloom = 0.0;
          node.fontSize = 38;
        } else {
          // EMPTY / OFF-SCREEN
          node.isActive = false;
          node.targetScale = 0.40;
          node.targetOpacity = 0.0;
          node.targetBloom = 0.0;
        }
      }

      this.updateNodePositions();
    }

    updateNodePositions() {
      // Natural organic wave pathing matching the liquid-chrome concept art:
      // The curve flows gracefully from left to right with a smooth swoop under the active word
      const spread = this.horizontalSpread;

      // Base anchor offsets for slot [-2, -1, 0, 1, 2]
      // Curve has an elegant gentle dip under the hero word
      const offsets = [
        { x: -spread * 1.85, y: -50 },  // Slot -2 ("I")
        { x: -spread * 0.95, y: -20 },  // Slot -1 ("know")
        { x: 0,              y: 28 },   // Slot 0  (Hero "that" anchor bead below text)
        { x: spread * 0.95,  y: 42 },   // Slot 1  ("you")
        { x: spread * 1.85,  y: 65 }    // Slot 2  ("want")
      ];

      for (let i = 0; i < 5; i++) {
        const node = this.nodes[i];
        const off = offsets[i];

        node.anchorX = off.x;
        node.anchorY = off.y;

        // Position text label ABOVE the anchor bead with guaranteed clearance
        const isHero = (node.slotIndex === 0);
        const clearance = isHero ? 34 : 24;
        node.labelX = off.x;
        node.labelY = off.y - clearance;
      }

      // Build spline control anchors including off-screen lead-in and lead-out points
      this.splineAnchors = [
        { x: -spread * 3.2, y: -90 },  // Far left lead-in
        { x: this.nodes[0].anchorX, y: this.nodes[0].anchorY },
        { x: this.nodes[1].anchorX, y: this.nodes[1].anchorY },
        { x: this.nodes[2].anchorX, y: this.nodes[2].anchorY },
        { x: this.nodes[3].anchorX, y: this.nodes[3].anchorY },
        { x: this.nodes[4].anchorX, y: this.nodes[4].anchorY },
        { x: spread * 3.2, y: 110 }   // Far right lead-out
      ];
    }

    update(dt) {
      for (const node of this.nodes) {
        node.update(dt);
      }
    }

    getActiveNode() {
      return this.nodes[2]; // Slot 0 is hero
    }

    getNextNode() {
      return this.nodes[3]; // Slot +1 is next
    }
  }

  exports.WordGraph = WordGraph;
})(window.SongNode);

