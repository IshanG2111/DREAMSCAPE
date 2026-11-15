import React, { useRef, useEffect } from 'react';

const ATMOSPHERE_VS = `
  attribute vec2 aPosition;
  varying vec2 vUv;
  void main() {
    vUv = aPosition * 0.5 + 0.5;
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }
`;

const ATMOSPHERE_FS = `
  precision highp float;
  varying vec2 vUv;

  uniform float uTime;
  uniform vec2 uResolution;
  uniform float uBass;
  uniform vec3 uColorGlow;
  uniform float uGrainIntensity;

  // High quality pseudo-random noise
  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  void main() {
    vec2 uv = vUv;
    
    // 1. Deep Monochromatic Charcoal Base (#050506)
    vec3 col = vec3(0.02, 0.02, 0.024);

    // 2. Subtle Crimson Atmospheric Glow behind Left Disc Player
    // Center of disc player in UV space is approx (0.23, 0.52)
    vec2 discPos = vec2(0.23, 0.52);
    vec2 diffDisc = (uv - discPos) * vec2(uResolution.x / uResolution.y, 1.0);
    float distDisc = length(diffDisc);
    float discGlow = exp(-distDisc * 2.2) * (0.16 + uBass * 0.08);
    col += uColorGlow * discGlow;

    // 3. Subtle Bottom-Left Corner Ambient Light Bleed
    vec2 bleedPos = vec2(0.12, 0.08);
    vec2 diffBleed = (uv - bleedPos) * vec2(uResolution.x / uResolution.y, 1.0);
    float distBleed = length(diffBleed);
    float bleedGlow = exp(-distBleed * 1.8) * 0.12;
    col += uColorGlow * bleedGlow;

    // 4. Subtle Radial Vignette
    vec2 center = vec2(0.5, 0.5);
    float distCenter = length(uv - center);
    float vignette = smoothstep(1.3, 0.35, distCenter);
    col *= (0.4 + vignette * 0.6);

    // 5. Fine Analog Film Grain
    float grain = hash(uv * uResolution + fract(uTime * 23.456)) - 0.5;
    col += grain * uGrainIntensity;

    gl_FragColor = vec4(col, 1.0);
  }
`;

export function AtmosphereCanvas({
  personality,
  audioData = {},
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', { powerPreference: 'high-performance', alpha: false });
    if (!gl) return;

    const compile = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };

    const vs = compile(gl.VERTEX_SHADER, ATMOSPHERE_VS);
    const fs = compile(gl.FRAGMENT_SHADER, ATMOSPHERE_FS);
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );
    const aPos = gl.getAttribLocation(prog, 'aPosition');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(prog, 'uTime');
    const uResolution = gl.getUniformLocation(prog, 'uResolution');
    const uBass = gl.getUniformLocation(prog, 'uBass');
    const uColorGlow = gl.getUniformLocation(prog, 'uColorGlow');
    const uGrainIntensity = gl.getUniformLocation(prog, 'uGrainIntensity');

    let animId;
    let startTime = performance.now();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
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
      gl.uniform1f(uTime, elapsed);
      gl.uniform1f(uBass, audioData.bass || 0);

      const glowRGB = personality?.ambientGlow || [0.77, 0.12, 0.26];
      gl.uniform3f(uColorGlow, glowRGB[0], glowRGB[1], glowRGB[2]);
      gl.uniform1f(uGrainIntensity, 0.055);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [personality?.id, audioData]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  );
}
