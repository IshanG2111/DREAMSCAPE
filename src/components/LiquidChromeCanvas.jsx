import React, { useRef, useEffect } from 'react';

const LIQUID_VS = `
  attribute vec2 aPosition;
  varying vec2 vUv;
  void main() {
    vUv = aPosition * 0.5 + 0.5;
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }
`;

const LIQUID_FS = `
  precision highp float;
  varying vec2 vUv;

  uniform float uTime;
  uniform float uMode;
  uniform vec2 uResolution;
  uniform vec2 uPointer;
  uniform float uBass;
  uniform float uTreble;
  uniform float uBeatImpulse;
  uniform vec3 uColPrimary;
  uniform vec3 uColSecondary;
  uniform vec3 uColSpec;
  uniform vec3 uColAbyss;
  uniform vec2 uActiveNode;

  mat2 rot(float a) {
    float c = cos(a), s = sin(a);
    return mat2(c, -s, s, c);
  }

  float hash21(vec2 p) {
    p = fract(p * vec2(234.34, 435.345));
    p += dot(p, p + 34.23);
    return fract(p.x * p.y);
  }

  float liquidRibbonHeight(vec2 p, float t, out float crestDetail) {
    float audioDrift = uBass * 0.32 + uBeatImpulse * 0.22;

    mat2 r1 = rot(-0.40 + uPointer.x * 0.05);
    vec2 q = r1 * p * 1.12;

    float w1 = sin(q.x * 1.55 + sin(q.y * 1.25 + t * 0.36) * 1.10 + t * 0.30);

    if (uMode < 0.5) {
      float w2 = cos(dot(q, vec2(1.7, 1.2)) - t * 0.40) * 0.45;
      crestDetail = abs(w1);
      return (w1 * 0.62 + w2 * 0.38) * (0.88 + audioDrift);
    }

    mat2 r2 = rot(0.68 + uPointer.y * 0.05);
    vec2 q2 = r2 * (q + vec2(w1 * 0.44, -w1 * 0.34) + vec2(t * 0.08, -t * 0.06));
    float w2 = cos(q2.x * 2.15 + sin(q2.y * 1.65 - t * 0.32) * 1.20 - t * 0.24);

    float h = w1 * 0.54 + w2 * 0.46;
    crestDetail = abs(w2);

    if (uMode >= 1.5) {
      mat2 r3 = rot(-0.52);
      vec2 q3 = r3 * (q2 + vec2(w2 * 0.28, w1 * 0.24));
      float w3 = sin(q3.x * 3.30 + sin(q3.y * 2.05 + t * 0.42) * 0.88 + t * 0.38);
      h = h * 0.78 + w3 * 0.22;
      crestDetail = max(crestDetail, abs(w3));

      vec2 aspect = uResolution / min(uResolution.x, uResolution.y);
      vec2 activeP = (uActiveNode - 0.5) * aspect;
      float distToActive = length(p - activeP);
      float wordRipple = sin(distToActive * 18.0 - t * 4.6) * exp(-distToActive * 2.5) * (uBass * 0.12 + uBeatImpulse * 0.24);
      h += wordRipple;
    }

    return h * (0.88 + audioDrift);
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / uResolution.xy;
    vec2 p = (gl_FragCoord.xy - 0.5 * uResolution.xy) / min(uResolution.x, uResolution.y);
    p += uPointer * 0.040;

    float t = uTime * 0.40;

    vec2 centerOffset = (uv - vec2(0.5, 0.5)) * vec2(1.10, 1.40);
    float centerDist = length(centerOffset);
    float centerSanctuary = smoothstep(0.12, 0.72, centerDist);

    float eps = (uMode < 0.5) ? 0.010 : 0.005;
    float crestDetail = 0.0;
    float h0 = liquidRibbonHeight(p, t, crestDetail);
    float hx = liquidRibbonHeight(p + vec2(eps, 0.0), t, crestDetail);
    float hy = liquidRibbonHeight(p + vec2(0.0, eps), t, crestDetail);

    vec3 normal = normalize(vec3(-(hx - h0) / eps, -(hy - h0) / eps, 1.0));
    vec3 viewDir = normalize(vec3(-p * 0.28, 1.0));

    vec3 keyLight = normalize(vec3(-0.62 + sin(t * 0.22) * 0.20, 0.78, 0.62));
    vec3 rimLight = normalize(vec3(0.72, -0.62, 0.48));

    vec3 halfKey = normalize(keyLight + viewDir);
    vec3 halfRim = normalize(rimLight + viewDir);

    float ndotKey = max(dot(normal, keyLight), 0.0);
    float ndotRim = max(dot(normal, rimLight), 0.0);
    float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 3.2);

    float curvature = length(vec2(hx - h0, hy - h0)) / eps;
    float ridgeGlow = smoothstep(0.35, 2.0, curvature);

    vec3 deepAbyss = mix(vec3(0.005, 0.003, 0.007), uColAbyss * 0.85, 0.65);
    vec3 col = deepAbyss;

    vec3 bodyColor = mix(uColAbyss * 0.5, uColSecondary * 0.95, ndotKey * 0.50 + fresnel * 0.55);
    vec3 crestColor = mix(uColPrimary * 1.35, uColSpec, pow(fresnel, 2.0) * 0.65);
    vec3 fluidShading = mix(bodyColor, crestColor, clamp(ndotKey * 0.68 + fresnel * 0.62 + ridgeGlow * 0.28, 0.0, 1.0));

    // Prismatic Thin-Film Spectral Dispersion
    vec3 halfKeyR = normalize(keyLight + viewDir + vec3(0.012, -0.008, 0.0));
    vec3 halfKeyG = normalize(keyLight + viewDir);
    vec3 halfKeyB = normalize(keyLight + viewDir - vec3(0.012, -0.008, 0.0));

    float specR = pow(max(dot(normal, halfKeyR), 0.0), 100.0);
    float specG = pow(max(dot(normal, halfKeyG), 0.0), 88.0);
    float specB = pow(max(dot(normal, halfKeyB), 0.0), 76.0);
    vec3 specPrism = vec3(specR, specG, specB) * uColSpec * 1.35;

    float specBroad = pow(max(dot(normal, halfKey), 0.0), 24.0);
    float specSharp = pow(max(dot(normal, halfKey), 0.0), 80.0);
    float specGlint = pow(max(dot(normal, halfKey), 0.0), 240.0);
    float specRim   = pow(max(dot(normal, halfRim), 0.0), 30.0);

    vec3 specular = (specPrism + uColSpec * (specSharp * 0.55 + specGlint * 1.65)) * (1.0 + uTreble * 0.45);
    specular += uColPrimary * specBroad * 0.38;
    specular += uColSecondary * specRim * 0.32;
    specular *= mix(0.42, 1.0, centerSanctuary);

    vec3 liquidFolds = (fluidShading + specular) * (0.92 + uBass * 0.32 + uBeatImpulse * 0.38);

    col = mix(col, liquidFolds, 0.88 + 0.12 * centerSanctuary);

    float ambientBreathing = (1.0 - smoothstep(0.0, 0.65, centerDist)) * (0.04 + uBass * 0.035);
    col += uColSecondary * ambientBreathing;

    vec2 starUv = uv * 32.0;
    float starHash = hash21(floor(starUv));
    float starTwinkle = sin(t * 3.5 + starHash * 62.8) * 0.5 + 0.5;
    float starIntensity = smoothstep(0.982, 1.0, starHash) * starTwinkle * (1.0 + uTreble * 0.6) * (1.0 - centerSanctuary * 0.4);
    col += uColSpec * starIntensity * 0.70;

    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
  }
`;

export function LiquidChromeCanvas({ qualityMode = 'high', audioData, palette, activeNode }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', { alpha: false, antialias: false, powerPreference: 'high-performance' })
           || canvas.getContext('experimental-webgl');
    if (!gl) return;

    // Compile shaders
    const createShader = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };

    const vs = createShader(gl.VERTEX_SHADER, LIQUID_VS);
    const fs = createShader(gl.FRAGMENT_SHADER, LIQUID_FS);
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    gl.useProgram(prog);

    // Quad geometry
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);

    const aPos = gl.getAttribLocation(prog, 'aPosition');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    // Uniforms
    const uTime = gl.getUniformLocation(prog, 'uTime');
    const uMode = gl.getUniformLocation(prog, 'uMode');
    const uResolution = gl.getUniformLocation(prog, 'uResolution');
    const uPointer = gl.getUniformLocation(prog, 'uPointer');
    const uBass = gl.getUniformLocation(prog, 'uBass');
    const uTreble = gl.getUniformLocation(prog, 'uTreble');
    const uBeatImpulse = gl.getUniformLocation(prog, 'uBeatImpulse');
    const uColPrimary = gl.getUniformLocation(prog, 'uColPrimary');
    const uColSecondary = gl.getUniformLocation(prog, 'uColSecondary');
    const uColSpec = gl.getUniformLocation(prog, 'uColSpec');
    const uColAbyss = gl.getUniformLocation(prog, 'uColAbyss');
    const uActiveNode = gl.getUniformLocation(prog, 'uActiveNode');

    let animId;
    let startTime = performance.now();
    let pointer = { x: 0, y: 0, smoothX: 0, smoothY: 0 };

    const handlePointer = (e) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('mousemove', handlePointer);

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, qualityMode === 'high' ? 1.75 : (qualityMode === 'medium' ? 1.25 : 1.0));
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uResolution, canvas.width, canvas.height);
    };
    window.addEventListener('resize', resize);
    resize();

    const render = (now) => {
      const elapsed = (now - startTime) / 1000;
      pointer.smoothX += (pointer.x - pointer.smoothX) * 0.05;
      pointer.smoothY += (pointer.y - pointer.smoothY) * 0.05;

      gl.uniform1f(uTime, elapsed);
      gl.uniform1f(uMode, qualityMode === 'high' ? 2.0 : (qualityMode === 'medium' ? 1.0 : 0.0));
      gl.uniform2f(uPointer, pointer.smoothX, pointer.smoothY);
      gl.uniform1f(uBass, audioData.bass);
      gl.uniform1f(uTreble, audioData.treble);
      gl.uniform1f(uBeatImpulse, audioData.beatPulse);
      gl.uniform2f(uActiveNode, activeNode ? activeNode.x : 0.5, activeNode ? activeNode.y : 0.5);

      if (palette) {
        gl.uniform3f(uColPrimary, palette.primary[0], palette.primary[1], palette.primary[2]);
        gl.uniform3f(uColSecondary, palette.secondary[0], palette.secondary[1], palette.secondary[2]);
        gl.uniform3f(uColSpec, palette.specular[0], palette.specular[1], palette.specular[2]);
        gl.uniform3f(uColAbyss, palette.abyss[0], palette.abyss[1], palette.abyss[2]);
      }

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', handlePointer);
      window.removeEventListener('resize', resize);
    };
  }, [qualityMode, audioData, palette, activeNode]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 1,
        pointerEvents: 'none',
      }}
    />
  );
}
