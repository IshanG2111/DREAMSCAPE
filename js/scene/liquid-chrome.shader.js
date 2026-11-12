/* =========================================================================
   LIQUID CHROME SHADER (GPU GLSL FRAGMENT SHADER)
   Procedural molten mercury / dark cherry metal background framing a dark
   central editorial stage.
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
    uniform float uQuality; // 1.0 = high, 0.5 = low

    // Smooth domain warping height field for sculpted liquid folds
    float liquidHeight(vec2 p, float t) {
      // Scale coordinates for broad elongated waves
      vec2 uv = p * vec2(1.15, 0.95);

      // Primary flow layer
      vec2 q = vec2(
        sin(uv.x * 1.8 + t * 0.45) + cos(uv.y * 2.2 - t * 0.35),
        cos(uv.x * 2.2 - t * 0.40) + sin(uv.y * 1.8 + t * 0.50)
      );

      // Secondary domain warp
      vec2 r = vec2(
        sin(dot(uv + q * 0.42, vec2(1.2, 1.7)) + t * 0.55),
        cos(dot(uv + q * 0.42, vec2(1.7, 1.2)) - t * 0.50)
      );

      // Main fold elevation
      float h = sin(length(uv + r * 0.35) * 3.2 - t * 0.8) * 0.5 + 0.5;
      h += cos(q.x * 2.1 + r.y * 1.5) * 0.30;
      h += sin(uv.x * 4.2 + uv.y * 3.8 + t * 0.6) * 0.08;

      return h;
    }

    void main() {
      vec2 uv = vUv;
      vec2 p = (gl_FragCoord.xy - 0.5 * uResolution.xy) / min(uResolution.x, uResolution.y);

      // Slow, majestic continuous time
      float t = uTime * 0.18;

      // Central differences for smooth surface normals
      float eps = 0.007;
      float h = liquidHeight(p, t);
      float hR = liquidHeight(p + vec2(eps, 0.0), t);
      float hL = liquidHeight(p - vec2(eps, 0.0), t);
      float hU = liquidHeight(p + vec2(0.0, eps), t);
      float hD = liquidHeight(p - vec2(0.0, eps), t);

      vec3 N = normalize(vec3((hR - hL) / (2.0 * eps), (hU - hD) / (2.0 * eps), 1.25));
      vec3 V = vec3(0.0, 0.0, 1.0);
      vec3 R = reflect(-V, N);

      // Analytical studio lights:
      // 1. Key softbox light (grazing top folds for crisp silver/pearl crests)
      vec3 keyDir = normalize(vec3(0.35, 0.75, 0.60));
      float keySpec = pow(max(dot(R, keyDir), 0.0), 18.0);
      float keyBroad = pow(max(dot(R, keyDir), 0.0), 5.0);

      // 2. Plum/Burgundy fill bounce
      vec3 fillDir = normalize(vec3(-0.75, -0.45, 0.55));
      float fillSpec = pow(max(dot(R, fillDir), 0.0), 10.0);

      // 3. Rose-gold rim light from right edge
      vec3 rimDir = normalize(vec3(0.85, -0.30, 0.45));
      float rimSpec = pow(max(dot(R, rimDir), 0.0), 14.0);

      // 4. Fresnel rim
      float fresnel = pow(1.0 - max(dot(N, V), 0.0), 2.8);

      // BASE PALETTE:
      // --ink: #050407, --cherry: #160710, --plum: #321027
      vec3 inkBase = vec3(0.020, 0.016, 0.027);
      vec3 cherryCrevice = vec3(0.086, 0.027, 0.063); // #160710
      vec3 plumMid = vec3(0.196, 0.063, 0.153);        // #321027
      vec3 roseAccent = vec3(1.0, 0.54, 0.72);         // #ff8ab8
      vec3 pearlChrome = vec3(0.85, 0.83, 0.88);       // #d9d5df

      // Build layered composite
      vec3 col = inkBase;

      // Crevice warmth reacting gently to audio bass
      float bassReact = clamp(uAudioBass * 0.4, 0.0, 0.6);
      col += mix(cherryCrevice, plumMid, h) * (1.1 + bassReact);

      // Fill light (plum sheen across broad waves)
      col += plumMid * fillSpec * 1.4;

      // Rim light (rose-magenta sheen on folds)
      col += (roseAccent * 0.35 + plumMid * 0.65) * rimSpec * 1.5;

      // Broad chrome body sheen
      col += pearlChrome * keyBroad * 0.16;

      // Sharp pearl-silver crest speculars (reserved for crests)
      float crest = smoothstep(0.68, 0.98, h);
      col += pearlChrome * keySpec * (0.85 + crest * 1.2) * (1.0 + uAudioTreble * 0.4);

      // Fresnel edge sheen
      col += mix(plumMid, pearlChrome, 0.4) * fresnel * 0.22;

      // CRITICAL DESIGN RULE:
      // Keep central lyric stage comparatively dark & quiet for high editorial contrast!
      float stageDist = length(p * vec2(1.0, 1.45));
      float centerQuiet = smoothstep(0.18, 0.75, stageDist);
      col = mix(col * 0.32, col, centerQuiet);

      // Vignette
      float vig = smoothstep(1.5, 0.45, length(p));
      col *= mix(0.45, 1.0, vig);

      // Composite fine film-grain (GPU pseudo-random hash, zero CPU overhead)
      float grain = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233)) + t * 5.0) * 43758.5453) - 0.5;
      col += grain * 0.022;

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
        console.warn("[LiquidChromeShader] WebGL not supported, falling back to CSS background.");
        return;
      }

      this.initGL();
      this.resize();
    }

    initGL() {
      const gl = this.gl;

      // Compile vertex shader
      const vs = gl.createShader(gl.VERTEX_SHADER);
      gl.shaderSource(vs, VERTEX_SHADER_SRC);
      gl.compileShader(vs);

      // Compile fragment shader
      const fs = gl.createShader(gl.FRAGMENT_SHADER);
      gl.shaderSource(fs, FRAGMENT_SHADER_SRC);
      gl.compileShader(fs);

      // Link program
      const prog = gl.createProgram();
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      this.program = prog;

      // Fullscreen quad buffer
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

      // Uniforms
      this.uResolution = gl.getUniformLocation(prog, "uResolution");
      this.uTime = gl.getUniformLocation(prog, "uTime");
      this.uAudioBass = gl.getUniformLocation(prog, "uAudioBass");
      this.uAudioMids = gl.getUniformLocation(prog, "uAudioMids");
      this.uAudioTreble = gl.getUniformLocation(prog, "uAudioTreble");
      this.uQuality = gl.getUniformLocation(prog, "uQuality");
    }

    resize(width = window.innerWidth, height = window.innerHeight) {
      if (!this.isAvailable) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      this.canvas.width = Math.round(width * dpr);
      this.canvas.height = Math.round(height * dpr);
      this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }

    render(timeSeconds, audio = { bass: 0.15, mids: 0.15, treble: 0.15 }) {
      if (!this.isAvailable) return;
      const gl = this.gl;

      gl.useProgram(this.program);
      gl.uniform2f(this.uResolution, this.canvas.width, this.canvas.height);
      gl.uniform1f(this.uTime, timeSeconds);
      gl.uniform1f(this.uAudioBass, audio.bass || 0.15);
      gl.uniform1f(this.uAudioMids, audio.mids || 0.15);
      gl.uniform1f(this.uAudioTreble, audio.treble || 0.15);
      gl.uniform1f(this.uQuality, 1.0);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
  }

  exports.LiquidChromeShader = LiquidChromeShader;
})(window.SongNode);

