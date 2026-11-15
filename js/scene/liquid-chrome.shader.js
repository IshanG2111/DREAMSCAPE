/* =========================================================================
   COSMIC NEBULA SILK & GRAVITATIONAL VORTEX SHADER (GPU GLSL FRAGMENT SHADER)
   Deep velvety black celestial void with domain-warped ethereal nebula ribbons,
   silky purple/violet cosmic smoke, lower-right gravitational lens vortex,
   procedural twinkling starfield, and real-time audio note reactivity.
   ========================================================================= */

window.SongNode = window.SongNode || {};

(function(exports) {
  const VERTEX_SHADER_SRC = `
    attribute vec2 aPosition;
    varying vec2 vUv;
    void main() {
      vUv = aPosition * 0.5 + 0.5;
      gl_Position = vec4(aPosition, 0.0, 1.0);
    }
  `;

  const FRAGMENT_SHADER_SRC = `
    precision highp float;
    varying vec2 vUv;

    uniform vec2 uResolution;
    uniform float uTime;
    uniform float uAudioBass;
    uniform float uAudioMids;
    uniform float uAudioTreble;

    // Dynamic Palette Uniforms
    uniform vec3 uColorAbyss;
    uniform vec3 uColorDepth;
    uniform vec3 uColorPrimary;
    uniform vec3 uColorSecondary;
    uniform vec3 uColorHighlight;

    // 2D Rotation
    mat2 rot(float a) {
      float c = cos(a);
      float s = sin(a);
      return mat2(c, -s, s, c);
    }

    // Pseudo-random hash for starfield
    float hash21(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }

    // Smooth value noise
    float vnoise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(hash21(i + vec2(0.0, 0.0)), hash21(i + vec2(1.0, 0.0)), u.x),
        mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
        u.y
      );
    }

    // Fractional Brownian Motion with rotation
    float fbm(vec2 p) {
      float v = 0.0;
      float a = 0.5;
      mat2 m = rot(0.52);
      for (int i = 0; i < 5; i++) {
        v += a * vnoise(p);
        p = m * p * 2.04 + vec2(0.24, 0.16);
        a *= 0.5;
      }
      return v;
    }

    void main() {
      // Aspect-corrected coordinate space: center is (0, 0)
      vec2 p = (gl_FragCoord.xy - 0.5 * uResolution.xy) / min(uResolution.x, uResolution.y);

      float t = uTime * 0.18;
      float bass = clamp(uAudioBass, 0.0, 1.0);
      float mids = clamp(uAudioMids, 0.0, 1.0);
      float treble = clamp(uAudioTreble, 0.0, 1.0);

      // 1. Lower-Right Gravitational Vortex Swirl Distortion (Reference Diagram Feature)
      vec2 vortexCenter = vec2(0.70, -0.38);
      vec2 dV = p - vortexCenter;
      float distVortex = length(dV);
      float vortexStrength = exp(-distVortex * 3.8);
      float vortexAngle = atan(dV.y, dV.x) + (1.9 + bass * 0.5) * vortexStrength;
      vec2 warpedP = p;
      if (distVortex < 0.65) {
        warpedP = vortexCenter + vec2(cos(vortexAngle), sin(vortexAngle)) * distVortex;
      }

      // 2. Multi-Octave Silky Cosmic Nebula Smoke Flow
      // Domain warping simulating fluid celestial gas & velvet silk folds
      vec2 q = vec2(
        fbm(warpedP * 1.35 + vec2(0.0, 0.0) + t * 0.28),
        fbm(warpedP * 1.25 + vec2(5.2, 1.3) - t * 0.24)
      );

      vec2 r = vec2(
        fbm(warpedP * 1.4 + 3.2 * q + vec2(1.7, 9.2) + t * 0.32),
        fbm(warpedP * 1.4 + 3.2 * q + vec2(8.3, 2.8) - t * 0.26)
      );

      float nebulaFbm = fbm(warpedP * 1.5 + 3.5 * r + vec2(0.0, t * 0.15));

      // Sculpt silk streamers along the edges and corners (Matching reference image)
      // Push nebula to edges only — edge mask keeps center dark for lyrics
      float edgeDist = max(abs(p.x) - 0.28, abs(p.y) - 0.20);
      float edgeMask = smoothstep(-0.05, 0.60, edgeDist);

      // Top-right stream
      float trCorner = smoothstep(0.1, 1.3, length(p - vec2(0.65, 0.45)));
      float trStream = smoothstep(0.35, 0.78, nebulaFbm) * (1.1 - trCorner);

      // Bottom-left stream
      float blCorner = smoothstep(0.1, 1.4, length(p - vec2(-0.70, -0.42)));
      float blStream = smoothstep(0.32, 0.82, nebulaFbm) * (1.1 - blCorner);

      // Bottom-right stream around vortex
      float brStream = smoothstep(0.28, 0.75, nebulaFbm) * exp(-distVortex * 1.6);

      // Broad celestial dust veil
      float dustVeil = pow(nebulaFbm, 2.2) * 0.5;

      float silkIntensity = clamp(trStream * 1.1 + blStream * 1.2 + brStream * 1.3 + dustVeil * 0.3, 0.0, 1.0);
      silkIntensity *= edgeMask * (0.78 + bass * 0.38); // Audio bass swells the nebula ribbons

      // 3. Lower-right celestial vortex accretion ring
      float ringDist = abs(distVortex - 0.17);
      float vortexRing = exp(-pow(ringDist * 22.0, 2.0)) * 0.85;
      float vortexInnerDark = smoothstep(0.0, 0.15, distVortex);

      // 4. Color Compositing (Exact Reference Tame Impala Currents Palette)
      // Deep space abyss base (#020206)
      vec3 col = vec3(0.008, 0.006, 0.014);

      // Deep celestial indigo / dark violet depth
      vec3 indigoDepth = mix(vec3(0.03, 0.02, 0.08), uColorDepth, 0.75);
      col = mix(col, indigoDepth, silkIntensity * 0.6);

      // Primary royal violet / purple silk ribbons
      vec3 violetSilk = mix(vec3(0.55, 0.36, 0.98), uColorPrimary, 0.85);
      col += violetSilk * pow(silkIntensity, 1.8) * 0.95;

      // Electric starlight blue & cyan specular edge glints
      vec3 cyanAccent = mix(vec3(0.38, 0.65, 1.0), uColorSecondary, 0.80);
      float rimGlint = pow(clamp(nebulaFbm * 1.2 - 0.45, 0.0, 1.0), 3.0);
      col += cyanAccent * rimGlint * edgeMask * (0.85 + mids * 0.45);

      // Warm rose in lower-left fold
      vec3 warmRose = vec3(0.85, 0.48, 0.55);
      float blWarmth = smoothstep(0.4, 0.85, blStream) * smoothstep(0.0, -0.6, p.y);
      col += warmRose * blWarmth * edgeMask * 0.28;

      // Add the vortex accretion ring in luminous cyan/violet
      vec3 vortexColor = mix(cyanAccent, violetSilk, 0.5);
      col += vortexColor * vortexRing * (1.0 + bass * 0.6);
      col *= vortexInnerDark; // Dark center of the vortex

      // 5. Procedural Starfield & Celestial Stardust
      vec2 starGrid = gl_FragCoord.xy * 0.08;
      vec2 starCell = floor(starGrid);
      float starRnd = hash21(starCell);
      if (starRnd > 0.955) {
        vec2 starPos = fract(starGrid) - vec2(0.5);
        float starDist = length(starPos);
        float starTwinkle = sin(uTime * (3.0 + starRnd * 5.0) + starRnd * 6.28) * 0.35 + 0.65;
        float starSize = (starRnd - 0.955) * 22.0 + 0.04;
        float starGlow = exp(-pow(starDist * 8.0, 2.0)) * starTwinkle * (0.7 + treble * 0.6);
        vec3 starCol = mix(vec3(1.0, 1.0, 1.0), uColorHighlight, 0.5);
        col += starCol * starGlow * 0.9;
      }

      // 6. Deep center — near-pure black so constellation text pops
      float centerDist = length(p * vec2(0.9, 1.25));
      float centerQuiet = smoothstep(0.10, 0.75, centerDist);
      col = mix(col * 0.08, col, centerQuiet);

      // 7. Atmospheric Screen Vignette to deep black borders
      float vig = smoothstep(1.45, 0.45, length(p));
      col *= mix(0.35, 1.0, vig);

      // Subtle film grain for silky 10-bit gradient smoothing
      float grain = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233)) + t * 2.0) * 43758.5453) - 0.5;
      col += grain * 0.010;

      gl_FragColor = vec4(col, 1.0);
    }
  `;

  class LiquidChromeShader {
    constructor(canvas) {
      this.canvas = canvas;
      this.gl = canvas.getContext('webgl', {
        alpha: false,
        antialias: false,
        powerPreference: 'high-performance'
      }) || canvas.getContext('experimental-webgl');

      this.isAvailable = Boolean(this.gl);
      if (!this.isAvailable) {
        console.warn("[CosmicNebulaShader] WebGL not supported, falling back to CSS background.");
        return;
      }

      this.initGL();
      this.resize();
    }

    initGL() {
      const gl = this.gl;

      const vs = gl.createShader(gl.VERTEX_SHADER);
      gl.shaderSource(vs, VERTEX_SHADER_SRC);
      gl.compileShader(vs);
      if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
        console.error("Vertex shader compile error:", gl.getShaderInfoLog(vs));
      }

      const fs = gl.createShader(gl.FRAGMENT_SHADER);
      gl.shaderSource(fs, FRAGMENT_SHADER_SRC);
      gl.compileShader(fs);
      if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
        console.error("Fragment shader compile error:", gl.getShaderInfoLog(fs));
      }

      const prog = gl.createProgram();
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        console.error("Shader program link error:", gl.getProgramInfoLog(prog));
      }
      this.program = prog;

      const posBuf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1,
         1, -1,
        -1,  1,
        -1,  1,
         1, -1,
         1,  1
      ]), gl.STATIC_DRAW);

      this.aPosition = gl.getAttribLocation(prog, "aPosition");
      gl.enableVertexAttribArray(this.aPosition);
      gl.vertexAttribPointer(this.aPosition, 2, gl.FLOAT, false, 0, 0);

      // Uniform locations
      this.uResolution = gl.getUniformLocation(prog, "uResolution");
      this.uTime = gl.getUniformLocation(prog, "uTime");
      this.uAudioBass = gl.getUniformLocation(prog, "uAudioBass");
      this.uAudioMids = gl.getUniformLocation(prog, "uAudioMids");
      this.uAudioTreble = gl.getUniformLocation(prog, "uAudioTreble");

      this.uColorAbyss = gl.getUniformLocation(prog, "uColorAbyss");
      this.uColorDepth = gl.getUniformLocation(prog, "uColorDepth");
      this.uColorPrimary = gl.getUniformLocation(prog, "uColorPrimary");
      this.uColorSecondary = gl.getUniformLocation(prog, "uColorSecondary");
      this.uColorHighlight = gl.getUniformLocation(prog, "uColorHighlight");
    }

    resize(width = window.innerWidth, height = window.innerHeight) {
      if (!this.isAvailable) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      this.canvas.width = Math.round(width * dpr);
      this.canvas.height = Math.round(height * dpr);
      this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }

    render(timeSeconds, audio = { bass: 0.15, mids: 0.15, treble: 0.15 }, colorExtractor = null) {
      if (!this.isAvailable) return;
      const gl = this.gl;

      gl.useProgram(this.program);
      gl.uniform2f(this.uResolution, this.canvas.width, this.canvas.height);
      gl.uniform1f(this.uTime, timeSeconds);
      gl.uniform1f(this.uAudioBass, audio.bass || 0.15);
      gl.uniform1f(this.uAudioMids, audio.mids || 0.15);
      gl.uniform1f(this.uAudioTreble, audio.treble || 0.15);

      if (colorExtractor) {
        gl.uniform3fv(this.uColorAbyss, colorExtractor.getNormalizedGl('abyss'));
        gl.uniform3fv(this.uColorDepth, colorExtractor.getNormalizedGl('depth'));
        gl.uniform3fv(this.uColorPrimary, colorExtractor.getNormalizedGl('primary'));
        gl.uniform3fv(this.uColorSecondary, colorExtractor.getNormalizedGl('secondary'));
        gl.uniform3fv(this.uColorHighlight, colorExtractor.getNormalizedGl('highlight'));
      } else {
        gl.uniform3f(this.uColorAbyss, 0.008, 0.006, 0.014);
        gl.uniform3f(this.uColorDepth, 0.03, 0.02, 0.08);
        gl.uniform3f(this.uColorPrimary, 0.553, 0.396, 1.0);
        gl.uniform3f(this.uColorSecondary, 0.415, 0.620, 1.0);
        gl.uniform3f(this.uColorHighlight, 0.90, 0.92, 0.98);
      }

      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
  }

  exports.LiquidChromeShader = LiquidChromeShader;
})(window.SongNode);
