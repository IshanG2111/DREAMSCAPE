/* =========================================================================
   DREAMSCAPE • SPATIAL CONSTELLATION & ATMOSPHERIC ENVIRONMENT
   Based on Product & Design Blueprint v1.0 (Sprint 1 Architecture):
   - Layer 01: GPU Cosmic Nebula Silk, Gravitational Vortex & Liquid Atmosphere
   - Layer 02: 3D Constellation Layout Engine, Camera Director & Refined Typography
   - Layer 03: Fixed Minimalist Viewport Overlay (HTML/CSS)
   ========================================================================= */

window.SongNode = window.SongNode || {};

(function(exports) {

  // =========================================================================
  // 1. LAYER 01: ATMOSPHERIC ENVIRONMENT (WEBGL COSMIC SILK SHADER)
  // =========================================================================
  class ReactBitsAurora {
    constructor(canvas) {
      this.canvas = canvas;
      this.gl = canvas.getContext('webgl', { alpha: false, antialias: false, powerPreference: 'high-performance' })
             || canvas.getContext('experimental-webgl');

      this.isAvailable = Boolean(this.gl);
      if (!this.isAvailable) return;

      this.init();
      this.resize();
    }

    init() {
      const gl = this.gl;
      const vsSrc = `
        attribute vec2 aPos;
        void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
      `;

      const fsSrc = `
        precision highp float;
        uniform vec2 uRes;
        uniform float uTime;
        uniform float uBass;
        uniform float uMids;
        uniform float uTreble;
        uniform vec3 uPrimary;
        uniform vec3 uSecondary;

        mat2 rot(float a) {
          float c = cos(a), s = sin(a);
          return mat2(c, -s, s, c);
        }

        float hash21(vec2 p) {
          p = fract(p * vec2(234.34, 435.345));
          p += dot(p, p + 34.23);
          return fract(p.x * p.y);
        }

        float noise(vec2 p) {
          vec2 i = floor(p), f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(hash21(i + vec2(0.0, 0.0)), hash21(i + vec2(1.0, 0.0)), u.x),
            mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
            u.y
          );
        }

        float fbm(vec2 p) {
          float v = 0.0, a = 0.5;
          mat2 m = rot(0.52);
          for(int i = 0; i < 5; i++) {
            v += a * noise(p);
            p = m * p * 2.04 + vec2(0.24, 0.16);
            a *= 0.5;
          }
          return v;
        }

        void main() {
          vec2 p = (gl_FragCoord.xy - 0.5 * uRes.xy) / min(uRes.x, uRes.y);
          float t = uTime * 0.16;

          // 1. Lower-Right Gravitational Vortex Swirl Distortion
          vec2 vCenter = vec2(0.70, -0.38);
          vec2 dV = p - vCenter;
          float dVort = length(dV);
          float vStrength = exp(-dVort * 3.8);
          float vAngle = atan(dV.y, dV.x) + (1.9 + uBass * 0.5) * vStrength;
          vec2 warpedP = p;
          if (dVort < 0.65) {
            warpedP = vCenter + vec2(cos(vAngle), sin(vAngle)) * dVort;
          }

          // 2. Multi-Octave Silky Cosmic Nebula Smoke
          vec2 q = vec2(
            fbm(warpedP * 1.35 + vec2(0.0, 0.0) + t * 0.26),
            fbm(warpedP * 1.25 + vec2(5.2, 1.3) - t * 0.22)
          );
          vec2 r = vec2(
            fbm(warpedP * 1.4 + 3.2 * q + vec2(1.7, 9.2) + t * 0.30),
            fbm(warpedP * 1.4 + 3.2 * q + vec2(8.3, 2.8) - t * 0.25)
          );
          float f = fbm(warpedP * 1.5 + 3.5 * r + vec2(0.0, t * 0.14));

          // Silk ribbons strictly on edges/corners — preserving deep center for constellation
          float edgeDist = max(abs(p.x) - 0.28, abs(p.y) - 0.20);
          float edgeMask = smoothstep(-0.05, 0.55, edgeDist);

          float trCorner = smoothstep(0.1, 1.3, length(p - vec2(0.65, 0.45)));
          float trStream = smoothstep(0.35, 0.78, f) * (1.1 - trCorner);

          float blCorner = smoothstep(0.1, 1.4, length(p - vec2(-0.70, -0.42)));
          float blStream = smoothstep(0.32, 0.82, f) * (1.1 - blCorner);

          float brStream = smoothstep(0.28, 0.75, f) * exp(-dVort * 1.6);
          float dustVeil = pow(f, 2.2) * 0.5;

          float intensity = clamp(trStream * 1.1 + blStream * 1.2 + brStream * 1.3 + dustVeil * 0.3, 0.0, 1.0);
          intensity *= edgeMask * (0.78 + uBass * 0.38);

          // Vortex accretion ring
          float vRing = exp(-pow(abs(dVort - 0.17) * 22.0, 2.0)) * 0.85;
          float vCore = smoothstep(0.0, 0.14, dVort);

          // Color Palette: Deep obsidian space void #030307
          vec3 col = vec3(0.006, 0.005, 0.012);
          vec3 indigo = vec3(0.04, 0.02, 0.09);
          col = mix(col, indigo, intensity * 0.55);

          vec3 violetSilk = mix(vec3(0.55, 0.36, 0.98), uPrimary, 0.85);
          col += violetSilk * pow(intensity, 1.9) * 0.90;

          vec3 cyanGlint = mix(vec3(0.38, 0.65, 1.0), uSecondary, 0.80);
          float rimGlint = pow(clamp(f * 1.2 - 0.45, 0.0, 1.0), 3.0);
          col += cyanGlint * rimGlint * edgeMask * (0.75 + uMids * 0.4);

          // Warm rose in lower-left fold
          vec3 warmRose = vec3(0.85, 0.48, 0.55);
          float blWarm = smoothstep(0.4, 0.85, blStream) * smoothstep(0.0, -0.6, p.y);
          col += warmRose * blWarm * edgeMask * 0.28;

          // Vortex ring in BR corner
          vec3 vCol = mix(cyanGlint, violetSilk, 0.5);
          col += vCol * vRing * (1.0 + uBass * 0.6);
          col *= vCore;

          // Procedural Starfield
          vec2 sGrid = gl_FragCoord.xy * 0.08;
          float sRnd = hash21(floor(sGrid));
          if (sRnd > 0.955) {
            vec2 sPos = fract(sGrid) - vec2(0.5);
            float sTwinkle = sin(uTime * (3.0 + sRnd * 5.0) + sRnd * 6.28) * 0.35 + 0.65;
            float sGlow = exp(-pow(length(sPos) * 8.0, 2.0)) * sTwinkle * (0.7 + uTreble * 0.6);
            col += vec3(1.0, 0.95, 1.0) * sGlow * 0.90;
          }

          // Editorial Quiet Center Stage (Pristine Black for Constellation)
          float cDist = length(p * vec2(0.9, 1.25));
          float cQuiet = smoothstep(0.10, 0.75, cDist);
          col = mix(col * 0.08, col, cQuiet);

          // Edge Vignette
          float vig = smoothstep(1.45, 0.45, length(p));
          col *= mix(0.35, 1.0, vig);

          // Film grain for silky dithering
          float grain = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233)) + t) * 43758.5) - 0.5;
          col += grain * 0.010;

          gl_FragColor = vec4(col, 1.0);
        }
      `;

      const vs = gl.createShader(gl.VERTEX_SHADER);
      gl.shaderSource(vs, vsSrc);
      gl.compileShader(vs);

      const fs = gl.createShader(gl.FRAGMENT_SHADER);
      gl.shaderSource(fs, fsSrc);
      gl.compileShader(fs);

      const prog = gl.createProgram();
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      this.prog = prog;

      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);

      const aPos = gl.getAttribLocation(prog, "aPos");
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

      this.uRes = gl.getUniformLocation(prog, "uRes");
      this.uTime = gl.getUniformLocation(prog, "uTime");
      this.uBass = gl.getUniformLocation(prog, "uBass");
      this.uMids = gl.getUniformLocation(prog, "uMids");
      this.uTreble = gl.getUniformLocation(prog, "uTreble");
      this.uPrimary = gl.getUniformLocation(prog, "uPrimary");
      this.uSecondary = gl.getUniformLocation(prog, "uSecondary");
    }

    resize(w = window.innerWidth, h = window.innerHeight) {
      if (!this.isAvailable) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
      this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }

    render(timeSec, bands = { bass: 0.15, mids: 0.15, treble: 0.15 }) {
      if (!this.isAvailable) return;
      const gl = this.gl;
      gl.useProgram(this.prog);
      gl.uniform2f(this.uRes, this.canvas.width, this.canvas.height);
      gl.uniform1f(this.uTime, timeSec);
      gl.uniform1f(this.uBass, bands.bass || 0.15);
      gl.uniform1f(this.uMids, bands.mids || 0.15);
      gl.uniform1f(this.uTreble, bands.treble || 0.15);
      gl.uniform3f(this.uPrimary, 0.553, 0.396, 1.0);
      gl.uniform3f(this.uSecondary, 0.415, 0.620, 1.0);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
  }


  // =========================================================================
  // 2. LAYER 02: 3D CAMERA DIRECTOR (SPRING DAMPING & LOOK-AHEAD ANTICIPATION)
  // =========================================================================
  class CameraDirector {
    constructor() {
      // 3D Camera world eye position
      this.eye = { x: 0, y: 0, z: 0 };
      this.targetEye = { x: 0, y: 0, z: 0 };
      this.velocity = { x: 0, y: 0, z: 0 };

      // LookAt focal point
      this.lookAt = { x: 0, y: 0, z: 0 };
      this.targetLookAt = { x: 0, y: 0, z: 0 };
      this.lookAtVel = { x: 0, y: 0, z: 0 };

      // Camera tilt / rotation (radians)
      this.roll = 0;
      this.targetRoll = 0;
      this.pitch = 0;
      this.targetPitch = 0;

      // Mouse-based subtle parallax
      this.mouseParallax = { x: 0, y: 0 };
      this.targetMouseParallax = { x: 0, y: 0 };

      // Physics tuning: critically damped spring
      this.stiffness = 28.0;
      this.damping = 10.5;
      this.lookAheadFactor = 0.28; // Anticipates the next word node
      this.fov = 680;              // Perspective focal distance
    }

    setMouseParallax(normX, normY) {
      // Subtle deflection in world units
      this.targetMouseParallax.x = normX * 45;
      this.targetMouseParallax.y = normY * 30;
    }

    // Directs camera to follow active node, anticipating the upcoming node
    trackNodes(activeNode, nextNode = null, isFirstNode = false) {
      if (!activeNode) {
        // Wide establishing shot
        this.targetEye.x = 0;
        this.targetEye.y = 0;
        this.targetEye.z = 180;
        this.targetRoll = 0;
        return;
      }

      const ax = activeNode.x;
      const ay = activeNode.y;
      const az = activeNode.z || 0;

      let tx = ax;
      let ty = ay;
      let tz = az;

      // Anticipate next node position
      if (nextNode) {
        tx += (nextNode.x - ax) * this.lookAheadFactor;
        ty += (nextNode.y - ay) * this.lookAheadFactor;
        tz += ((nextNode.z || 0) - az) * this.lookAheadFactor;
      }

      // Camera stays slightly pulled back along Z
      this.targetEye.x = tx * 0.42;
      this.targetEye.y = ty * 0.42;
      this.targetEye.z = isFirstNode ? 90 : 0;

      // Subtle roll tilt when active word is vertical or strongly diagonal
      if (activeNode.rotation) {
        this.targetRoll = activeNode.rotation * 0.12;
      } else {
        this.targetRoll = 0;
      }
    }

    update(dt) {
      const clampedDt = Math.min(0.04, Math.max(0.001, dt));

      // Damped spring physics for camera eye position
      const targetX = this.targetEye.x + this.mouseParallax.x;
      const targetY = this.targetEye.y + this.mouseParallax.y;
      const targetZ = this.targetEye.z;

      const dx = this.eye.x - targetX;
      const dy = this.eye.y - targetY;
      const dz = this.eye.z - targetZ;

      const ax = -this.stiffness * dx - this.damping * this.velocity.x;
      const ay = -this.stiffness * dy - this.damping * this.velocity.y;
      const az = -this.stiffness * dz - this.damping * this.velocity.z;

      this.velocity.x += ax * clampedDt;
      this.velocity.y += ay * clampedDt;
      this.velocity.z += az * clampedDt;

      this.eye.x += this.velocity.x * clampedDt;
      this.eye.y += this.velocity.y * clampedDt;
      this.eye.z += this.velocity.z * clampedDt;

      // Smooth camera roll
      this.roll += (this.targetRoll - this.roll) * Math.min(1.0, clampedDt * 5.0);

      // Smooth mouse parallax
      this.mouseParallax.x += (this.targetMouseParallax.x - this.mouseParallax.x) * Math.min(1.0, clampedDt * 4.0);
      this.mouseParallax.y += (this.targetMouseParallax.y - this.mouseParallax.y) * Math.min(1.0, clampedDt * 4.0);
    }

    // Projects 3D world coordinate to 2D screen coordinate
    project(worldX, worldY, worldZ = 0, screenW, screenH) {
      // Translate relative to camera eye
      let x = worldX - this.eye.x;
      let y = worldY - this.eye.y;
      let z = worldZ - this.eye.z;

      // Camera roll rotation in 3D
      if (Math.abs(this.roll) > 0.0001) {
        const cosR = Math.cos(this.roll);
        const sinR = Math.sin(this.roll);
        const rx = x * cosR - y * sinR;
        const ry = x * sinR + y * cosR;
        x = rx;
        y = ry;
      }

      // Perspective divide
      const depth = this.fov + z;
      if (depth <= 20) return null; // Behind camera clipping
      const scale = this.fov / depth;

      return {
        x: screenW * 0.5 + x * scale,
        y: screenH * 0.5 + y * scale,
        scale: scale,
        depth: depth
      };
    }
  }


  // =========================================================================
  // 3. LAYER 02: CONSTELLATION & TRUE FOCUS SPATIAL LYRICS
  // =========================================================================
  class ReactBitsConstellation {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d', { alpha: true });
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);

      // Camera Director
      this.camera = new CameraDirector();

      // Words & Nodes
      this.nodes = [];
      this.activeWordIndex = -1;
      this.isVocal = false;

      // Canonical 5-Node Constellation Asterism with 3D positions & orientations
      // per Product Blueprint:
      // "All": Horizontal 0°
      // "it's": Diagonal -15° (-0.26 rad)
      // "hard": Vertical 90° (1.57 rad)
      // "to": Diagonal +18° (0.31 rad)
      // "you": Horizontal 0°
      this.canonicalStarNodes = [
        {
          id: 0, x: -440, y: -185, z: -35,
          rotation: 0, // Horizontal 0°
          labelPos: 'right', lblOffsetX: 70, lblOffsetY: -10,
          hasOrbit: true, hasOuterOrbit: false, hasFlares: true,
          orbitRx: 78, orbitRy: 30, orbitAngle: -0.28
        },
        {
          id: 1, x: -210, y: -50, z: 25,
          rotation: -0.26, // Diagonal -15°
          labelPos: 'bottom', lblOffsetX: 0, lblOffsetY: 56,
          hasOrbit: false, hasFlares: false
        },
        {
          id: 2, x: 60, y: -160, z: -15,
          rotation: 0, // Vertical phrase label orientation
          isVerticalLayout: true,
          labelPos: 'top', lblOffsetX: 0, lblOffsetY: -54,
          hasOrbit: false, hasFlares: false
        },
        {
          id: 3, x: -20, y: 120, z: 35,
          rotation: 0.31, // Diagonal +18°
          labelPos: 'bottom', lblOffsetX: 0, lblOffsetY: 58,
          hasOrbit: false, hasFlares: false
        },
        {
          id: 4, x: 410, y: -55, z: -45,
          rotation: 0, // Horizontal 0°
          labelPos: 'right', lblOffsetX: 80, lblOffsetY: -4,
          hasOrbit: true, hasOuterOrbit: true, hasFlares: true,
          orbitRx: 74, orbitRy: 30, orbitAngle: -0.22,
          outerRx: 118, outerRy: 44
        }
      ];

      // Intermediate celestial vertex junction
      this.canonicalVertex = { x: 270, y: -30, z: -10 };

      // Orbit beads on planetary rings
      this.orbitBeads = [];
      for (let i = 0; i < 20; i++) {
        this.orbitBeads.push({
          angle: (i / 20) * Math.PI * 2,
          speed: (Math.random() * 0.025 + 0.015) * (i % 2 === 0 ? 1 : -1),
          size: Math.random() * 1.5 + 1.0,
          alpha: Math.random() * 0.6 + 0.4
        });
      }

      // Traveling photons along 3D filaments
      this.photons = [
        { progress: 0.12, speed: 0.16, size: 2.8, color: '#ffffff' },
        { progress: 0.48, speed: 0.20, size: 2.4, color: '#9b72ff' },
        { progress: 0.80, speed: 0.14, size: 2.0, color: '#6A9EFF' }
      ];

      // Shockwaves from audio drum/synth notes
      this.shockwaves = [];

      // Transition alpha for the stage
      this.stageAlpha = 0.0;
      this.noteImpulse = 0.0;

      // Mouse parallax binding
      this.bindMouseParallax();

      this.resize();
    }

    bindMouseParallax() {
      window.addEventListener('mousemove', (e) => {
        const nx = (e.clientX / window.innerWidth) * 2 - 1;
        const ny = (e.clientY / window.innerHeight) * 2 - 1;
        this.camera.setMouseParallax(nx, ny);
      }, { passive: true });
    }

    resize(w = window.innerWidth, h = window.innerHeight) {
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.canvas.width = Math.round(w * this.dpr);
      this.canvas.height = Math.round(h * this.dpr);
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.scale(this.dpr, this.dpr);
      this.width = w;
      this.height = h;
    }

    // Set line of lyrics: constructs or updates spatial LyricNode instances
    setLine(words, activeWordIndex = -1, isVocal = true) {
      this.rawWords = words || [];
      this.activeWordIndex = activeWordIndex;
      this.isVocal = Boolean(isVocal && words && words.length > 0);

      // Reconcile nodes
      const count = Math.min(this.rawWords.length, 5);
      const newNodes = [];

      for (let i = 0; i < count; i++) {
        const template = this.canonicalStarNodes[i];
        const wordObj = this.rawWords[i];

        // Determine node state: upcoming | active | completed
        let state = "upcoming";
        if (i === activeWordIndex) {
          state = "active";
        } else if (activeWordIndex >= 0 && i < activeWordIndex) {
          state = "completed";
        }

        const existing = this.nodes[i];
        const fadeAlpha = existing ? existing.fadeAlpha : (state === "active" ? 1.0 : 0.45);

        newNodes.push({
          id: i,
          word: wordObj ? wordObj.text : "",
          x: template.x,
          y: template.y,
          z: template.z,
          rotation: template.rotation || 0,
          isVerticalLayout: Boolean(template.isVerticalLayout),
          labelPos: template.labelPos,
          lblOffsetX: template.lblOffsetX,
          lblOffsetY: template.lblOffsetY,
          hasOrbit: template.hasOrbit,
          hasOuterOrbit: template.hasOuterOrbit,
          hasFlares: template.hasFlares,
          orbitRx: template.orbitRx,
          orbitRy: template.orbitRy,
          orbitAngle: template.orbitAngle,
          outerRx: template.outerRx,
          outerRy: template.outerRy,
          state: state,
          fadeAlpha: fadeAlpha,
          driftY: existing ? existing.driftY : 0
        });
      }

      this.nodes = newNodes;

      // Direct Camera to track the active node with look-ahead anticipation
      const activeNode = (activeWordIndex >= 0 && activeWordIndex < this.nodes.length)
        ? this.nodes[activeWordIndex]
        : (this.nodes[0] || null);
      const nextNode = (activeWordIndex >= 0 && activeWordIndex + 1 < this.nodes.length)
        ? this.nodes[activeWordIndex + 1]
        : null;

      this.camera.trackNodes(activeNode, nextNode, activeWordIndex <= 0);
    }

    triggerNote(energy = 0.6) {
      this.noteImpulse = Math.min(1.0, this.noteImpulse + energy);
      if (this.activeWordIndex >= 0 && this.activeWordIndex < this.nodes.length) {
        const s = this.nodes[this.activeWordIndex];
        this.shockwaves.push({
          x: s.x, y: s.y, z: s.z || 0,
          radius: 8, maxRadius: 90 + energy * 65,
          alpha: 0.85, speed: 130 + energy * 85
        });
      }
    }

    update(dt, timeSec, bands = { bass: 0.15, mids: 0.15, treble: 0.15 }) {
      const targetAlpha = this.isVocal ? 1.0 : 0.0;
      const ease = 1.0 - Math.exp((this.isVocal ? -6.0 : -3.5) * dt);
      this.stageAlpha += (targetAlpha - this.stageAlpha) * ease;

      this.noteImpulse *= Math.exp(-6.5 * dt);

      // Update 3D Camera
      this.camera.update(dt);

      // Update node states & smooth fade transitions
      for (const node of this.nodes) {
        let targetNodeAlpha = 0.42; // upcoming: silvery-lavender
        if (node.state === "active") {
          targetNodeAlpha = 1.0;
          node.driftY *= Math.exp(-5.0 * dt);
        } else if (node.state === "completed") {
          targetNodeAlpha = 0.30;
          // Gentle environmental drift upwards
          node.driftY -= 4.0 * dt;
        }
        node.fadeAlpha += (targetNodeAlpha - node.fadeAlpha) * Math.min(1.0, dt * 5.0);
      }

      // Advance orbit beads
      for (const bead of this.orbitBeads) {
        bead.angle += bead.speed * dt * (1.0 + bands.bass * 0.4);
      }

      // Advance traveling photons
      for (const p of this.photons) {
        p.progress = (p.progress + dt * p.speed * (1.0 + bands.bass * 0.5)) % 1.0;
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

    render(timeSec, bands = { bass: 0.15, mids: 0.15, treble: 0.15 }) {
      const ctx = this.ctx;
      const w = this.width;
      const h = this.height;

      ctx.clearRect(0, 0, w, h);

      if (this.stageAlpha < 0.01 || this.nodes.length === 0) return;

      const sa = this.stageAlpha;

      // Project all nodes from 3D world space into 2D camera viewport
      const projectedNodes = [];
      for (let i = 0; i < this.nodes.length; i++) {
        const n = this.nodes[i];
        const proj = this.camera.project(n.x, n.y + n.driftY, n.z, w, h);
        projectedNodes.push({ node: n, proj: proj });
      }

      const projVertex = this.camera.project(
        this.canonicalVertex.x,
        this.canonicalVertex.y,
        this.canonicalVertex.z,
        w, h
      );

      // 1. Draw 3D Shockwaves
      for (const sw of this.shockwaves) {
        const swProj = this.camera.project(sw.x, sw.y, sw.z, w, h);
        if (swProj) {
          const r = sw.radius * swProj.scale;
          ctx.lineWidth = 1.2;
          ctx.strokeStyle = `rgba(141, 101, 255, ${sw.alpha * 0.7})`;
          ctx.beginPath();
          ctx.arc(swProj.x, swProj.y, r, 0, Math.PI * 2);
          ctx.stroke();

          ctx.lineWidth = 0.5;
          ctx.strokeStyle = `rgba(255, 255, 255, ${sw.alpha * 0.9})`;
          ctx.beginPath();
          ctx.arc(swProj.x, swProj.y, r, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // 2. Draw Connecting Constellation Filaments & Splines (3D Perspective)
      this.renderFilaments(ctx, projectedNodes, projVertex, sa);

      // 3. Draw Traveling Photons along filaments
      this.renderTravelingPhotons(ctx, projectedNodes, projVertex, sa);

      // 4. Draw Star Nodes, Orbital Rings & Diffraction Flares
      for (let i = 0; i < projectedNodes.length; i++) {
        const { node, proj } = projectedNodes[i];
        if (!proj) continue;
        const isActive = (i === this.activeWordIndex);
        this.renderStarNode(ctx, node, proj, isActive, sa, timeSec, bands);
      }

      // 5. Draw Refined Serif Typography with Varied Orientations (0°, -15°, 90°, etc.)
      for (let i = 0; i < projectedNodes.length; i++) {
        const { node, proj } = projectedNodes[i];
        if (!proj) continue;
        const isActive = (i === this.activeWordIndex);
        this.renderWordText(ctx, node, proj, isActive, sa, bands);
      }
    }

    renderFilaments(ctx, projectedNodes, projVertex, sa) {
      if (projectedNodes.length < 2) return;
      ctx.save();

      const p0 = projectedNodes[0]?.proj;
      const p1 = projectedNodes[1]?.proj;
      const p2 = projectedNodes[2]?.proj;
      const p3 = projectedNodes[3]?.proj;
      const p4 = projectedNodes[4]?.proj;
      const pV = projVertex;

      // Line 0 -> 1 ("All" to "it's")
      if (p0 && p1) {
        this.drawLuminousLine(ctx, p0.x, p0.y, p1.x, p1.y, sa);
      }

      // Line 1 -> 2 ("it's" to "hard")
      if (p1 && p2 && projectedNodes.length >= 3) {
        this.drawLuminousLine(ctx, p1.x, p1.y, p2.x, p2.y, sa);
      }

      // Spline from 2 -> Vertex -> 4, and upward curve from 3 -> Vertex
      if (projectedNodes.length >= 5 && p2 && p3 && pV && p4) {
        // Line 2 -> Vertex
        this.drawLuminousLine(ctx, p2.x, p2.y, pV.x, pV.y, sa);

        // Curved upward spline from Star 3 into Vertex
        const cpX = (p3.x + pV.x) * 0.5 + 40 * p3.scale;
        const cpY = p3.y + 15 * p3.scale;
        this.drawCurvedSpline(ctx, p3.x, p3.y, cpX, cpY, pV.x, pV.y, sa);

        // Line Vertex -> 4 ("vertex" to "you")
        this.drawLuminousLine(ctx, pV.x, pV.y, p4.x, p4.y, sa);

        // Intermediate junction vertex star bead
        ctx.fillStyle = `rgba(241, 234, 251, ${0.85 * sa})`;
        ctx.beginPath();
        ctx.arc(pV.x, pV.y, 2.4 * pV.scale, 0, Math.PI * 2);
        ctx.fill();

      } else if (projectedNodes.length === 4 && p2 && p3) {
        this.drawLuminousLine(ctx, p2.x, p2.y, p3.x, p3.y, sa);
      }

      ctx.restore();
    }

    drawLuminousLine(ctx, x1, y1, x2, y2, sa) {
      // Soft purple glow aura
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = `rgba(141, 101, 255, ${0.30 * sa})`;
      ctx.lineWidth = 3.2;
      ctx.stroke();

      // Sharp white starlight core
      const grad = ctx.createLinearGradient(x1, y1, x2, y2);
      grad.addColorStop(0, `rgba(241, 234, 251, ${0.82 * sa})`);
      grad.addColorStop(0.5, `rgba(255, 255, 255, ${0.98 * sa})`);
      grad.addColorStop(1, `rgba(241, 234, 251, ${0.82 * sa})`);

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.0;
      ctx.stroke();
    }

    drawCurvedSpline(ctx, x1, y1, cx, cy, x2, y2, sa) {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.quadraticCurveTo(cx, cy, x2, y2);
      ctx.strokeStyle = `rgba(141, 101, 255, ${0.32 * sa})`;
      ctx.lineWidth = 3.2;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.quadraticCurveTo(cx, cy, x2, y2);
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.94 * sa})`;
      ctx.lineWidth = 1.05;
      ctx.stroke();
    }

    renderTravelingPhotons(ctx, projectedNodes, projVertex, sa) {
      if (projectedNodes.length < 2) return;
      const count = projectedNodes.length - 1;

      ctx.save();
      for (const p of this.photons) {
        const segIdx = Math.floor(p.progress * count);
        const t = (p.progress * count) - segIdx;

        if (segIdx < count) {
          const p1 = projectedNodes[segIdx]?.proj;
          const p2 = projectedNodes[segIdx + 1]?.proj;
          if (!p1 || !p2) continue;

          const curX = p1.x + (p2.x - p1.x) * t;
          const curY = p1.y + (p2.y - p1.y) * t;
          const curScale = p1.scale + (p2.scale - p1.scale) * t;

          // Radial glow
          const grad = ctx.createRadialGradient(curX, curY, 0, curX, curY, 14 * curScale);
          grad.addColorStop(0, '#ffffff');
          grad.addColorStop(0.35, `rgba(141, 101, 255, ${0.85 * sa})`);
          grad.addColorStop(1, 'rgba(141, 101, 255, 0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(curX, curY, 14 * curScale, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(curX, curY, p.size * curScale, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }

    renderStarNode(ctx, node, proj, isActive, sa, timeSec, bands) {
      ctx.save();
      ctx.translate(proj.x, proj.y);

      const bass = bands.bass || 0.15;
      const treble = bands.treble || 0.15;
      const pScale = proj.scale;

      // 1. Tilted Planetary Orbital Rings (Star 0 'All' and Star 4 'you')
      if (node.hasOrbit || isActive) {
        const rx = (node.orbitRx || 78) * pScale * (1.0 + bass * 0.14 + (isActive ? this.noteImpulse * 0.24 : 0)) * (isActive ? 1.15 : 1.0);
        const ry = (node.orbitRy || 30) * pScale * (1.0 + bass * 0.14 + (isActive ? this.noteImpulse * 0.24 : 0)) * (isActive ? 1.15 : 1.0);
        const orbitAngle = node.orbitAngle || -0.28;

        ctx.save();
        ctx.rotate(orbitAngle);

        // Orbit ellipse line
        ctx.lineWidth = 0.95;
        ctx.strokeStyle = `rgba(141, 101, 255, ${(0.45 + (isActive ? 0.40 : 0.10)) * sa})`;
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.lineWidth = 0.55;
        ctx.strokeStyle = `rgba(255, 255, 255, ${(0.35 + (isActive ? 0.45 : 0.10)) * sa})`;
        ctx.stroke();

        // Traveling beads on orbit
        for (const bead of this.orbitBeads) {
          const bx = Math.cos(bead.angle) * rx;
          const by = Math.sin(bead.angle) * ry;

          ctx.fillStyle = `rgba(141, 101, 255, ${bead.alpha * 0.75 * sa})`;
          ctx.beginPath();
          ctx.arc(bx, by, bead.size * 2.0 * pScale, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = `rgba(255, 255, 255, ${bead.alpha * 0.95 * sa})`;
          ctx.beginPath();
          ctx.arc(bx, by, bead.size * pScale, 0, Math.PI * 2);
          ctx.fill();
        }

        // Outer nested orbit (Star 4 'you')
        if (node.hasOuterOrbit) {
          const outerRx = (node.outerRx || 118) * pScale * (1.0 + bass * 0.12);
          const outerRy = (node.outerRy || 44) * pScale * (1.0 + bass * 0.12);

          ctx.lineWidth = 0.65;
          ctx.strokeStyle = `rgba(106, 158, 255, ${0.32 * sa})`;
          ctx.beginPath();
          ctx.ellipse(0, 0, outerRx, outerRy, 0, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.restore();
      }

      // 2. Star Core & Halo
      const coreSize = (isActive ? (4.0 + this.noteImpulse * 1.6) : 2.8) * pScale;
      const haloSize = coreSize * (isActive ? 7.5 : 4.0);

      const haloGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, haloSize);
      haloGrad.addColorStop(0, '#ffffff');
      haloGrad.addColorStop(0.25, `rgba(141, 101, 255, ${(isActive ? 0.95 : 0.65) * sa})`);
      haloGrad.addColorStop(1, 'rgba(141, 101, 255, 0)');
      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.arc(0, 0, haloSize, 0, Math.PI * 2);
      ctx.fill();

      // White diamond star center
      ctx.fillStyle = `rgba(255, 255, 255, ${0.98 * sa})`;
      ctx.beginPath();
      ctx.arc(0, 0, coreSize, 0, Math.PI * 2);
      ctx.fill();

      // 3. 4-Point Cross Diffraction Lens Flares (✦)
      if (node.hasFlares || isActive) {
        const flareMult = (isActive ? 1.6 : 1.0) * (1.0 + treble * 0.5 + (isActive ? this.noteImpulse * 0.4 : 0));
        const rayH = (isActive ? 75 : 42) * flareMult * pScale;
        const rayV = rayH * 0.72;
        const fAlpha = (isActive ? 0.98 : 0.72) * sa;

        // Horizontal ray
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.95 * fAlpha})`;
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(-rayH, 0); ctx.lineTo(rayH, 0);
        ctx.stroke();

        // Vertical ray
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.85 * fAlpha})`;
        ctx.lineWidth = 0.95;
        ctx.beginPath();
        ctx.moveTo(0, -rayV); ctx.lineTo(0, rayV);
        ctx.stroke();

        // 45-degree glints
        const diag = rayH * 0.32;
        ctx.strokeStyle = `rgba(197, 201, 228, ${0.45 * fAlpha})`;
        ctx.lineWidth = 0.65;
        ctx.beginPath();
        ctx.moveTo(-diag, -diag); ctx.lineTo(diag, diag);
        ctx.moveTo(-diag, diag); ctx.lineTo(diag, -diag);
        ctx.stroke();
      }

      ctx.restore();
    }

    renderWordText(ctx, node, proj, isActive, sa, bands) {
      if (!node.word) return;

      const pScale = proj.scale;
      const lx = proj.x + (node.lblOffsetX || 0) * pScale;
      const ly = proj.y + (node.lblOffsetY || 0) * pScale;

      ctx.save();
      ctx.translate(lx, ly);

      // Apply node rotation (horizontal 0°, diagonal -15°, vertical 90°, etc.)
      if (node.rotation) {
        ctx.rotate(node.rotation);
      }

      const scale = (isActive ? (1.14 + this.noteImpulse * 0.10) : 1.0) * pScale;
      ctx.scale(scale, scale);

      const fontSize = isActive ? 86 : 74;
      ctx.font = `italic 400 ${fontSize}px 'Cormorant Garamond', 'Bodoni Moda', 'Playfair Display', Georgia, serif`;
      ctx.textAlign = node.labelPos === 'right' ? 'left' : 'center';
      ctx.textBaseline = 'middle';

      const nodeAlpha = (node.fadeAlpha !== undefined ? node.fadeAlpha : 1.0) * sa;

      if (isActive) {
        // TrueFocus 3-Pass Bloom
        // Pass 1: Wide ultraviolet halo
        ctx.shadowColor = `rgba(141, 101, 255, ${0.75 * nodeAlpha})`;
        ctx.shadowBlur = 90 + this.noteImpulse * 40;
        ctx.fillStyle = `rgba(180, 148, 255, ${0.35 * nodeAlpha})`;
        ctx.fillText(node.word, 0, 0);

        // Pass 2: Tight sharp inner glow
        ctx.shadowColor = `rgba(220, 200, 255, ${0.95 * nodeAlpha})`;
        ctx.shadowBlur = 40 + this.noteImpulse * 20;
        ctx.fillStyle = `rgba(255, 248, 255, ${0.65 * nodeAlpha})`;
        ctx.fillText(node.word, 0, 0);

        // Pass 3: Crisp Didone white core
        ctx.shadowColor = `rgba(255, 255, 255, ${0.60 * nodeAlpha})`;
        ctx.shadowBlur = 14;
        ctx.fillStyle = `rgba(255, 255, 255, ${0.98 * nodeAlpha})`;
        ctx.fillText(node.word, 0, 0);

      } else {
        // Upcoming or completed word: dim silvery-lavender per specification #786E8A
        ctx.shadowBlur = 0;
        const col = node.state === "completed"
          ? `rgba(130, 120, 155, ${0.32 * nodeAlpha})`
          : `rgba(170, 162, 200, ${0.46 * nodeAlpha})`;
        ctx.fillStyle = col;
        ctx.fillText(node.word, 0, 0);
      }

      ctx.restore();
    }
  }

  exports.ReactBitsAurora = ReactBitsAurora;
  exports.ReactBitsConstellation = ReactBitsConstellation;
  exports.CameraDirector = CameraDirector;

})(window.SongNode);
