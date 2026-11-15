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
  uniform vec2 uPointer;
  uniform float uBass;
  uniform float uTreble;
  uniform float uBeatPulse;
  uniform vec3 uColorBg;
  uniform vec3 uColorGlow1;
  uniform vec3 uColorGlow2;
  uniform float uGrainIntensity;
  uniform float uFogDensity;
  uniform float uLightLeak;
  uniform float uAberration;

  // High quality procedural noise
  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash21(i + vec2(0.0, 0.0)), hash21(i + vec2(1.0, 0.0)), u.x),
      mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p = rot * p * 2.0 + vec2(100.0);
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 uv = vUv;
    vec2 p = (gl_FragCoord.xy * 2.0 - uResolution) / min(uResolution.x, uResolution.y);

    // Subtle pointer parallax
    p += uPointer * 0.06;

    // 1. Deep Atmospheric Gradient Base
    float distFromCenter = length(p * vec2(0.85, 1.15));
    vec3 col = uColorBg;

    // 2. Volumetric Organic Smoke / Haze
    float t = uTime * 0.12;
    vec2 hazeCoord = p * 1.2 + vec2(t * 0.1, -t * 0.08);
    float haze1 = fbm(hazeCoord + vec2(fbm(hazeCoord * 1.5 - t * 0.15)));
    float haze2 = fbm(hazeCoord * 2.1 + vec2(-t * 0.1, t * 0.2));
    float combinedHaze = smoothstep(0.2, 0.8, (haze1 * 0.6 + haze2 * 0.4)) * uFogDensity;

    col = mix(col, col + uColorGlow1 * 0.18, combinedHaze * (0.4 + uBass * 0.25));

    // 3. Cinematic Defocused Light Leaks / Soft Anamorphic Blobs
    // Blob 1: Upper-left / drifting
    vec2 blob1Pos = vec2(sin(t * 0.4) * 0.8 - 0.4, cos(t * 0.3) * 0.5 + 0.3);
    float d1 = length(p - blob1Pos);
    float leak1 = exp(-d1 * 1.8) * uLightLeak * (0.8 + uBass * 0.4);
    col += uColorGlow1 * leak1 * 0.45;

    // Blob 2: Lower-right
    vec2 blob2Pos = vec2(cos(t * 0.35) * 0.7 + 0.5, sin(t * 0.25) * 0.6 - 0.4);
    float d2 = length(p - blob2Pos);
    float leak2 = exp(-d2 * 2.2) * uLightLeak * (0.7 + uTreble * 0.3);
    col += uColorGlow2 * leak2 * 0.35;

    // Strobic transient burst on kick/beatPulse
    col += uColorGlow1 * uBeatPulse * 0.12;

    // 4. Subtle Radial Vignette
    float vignette = smoothstep(1.8, 0.4, distFromCenter);
    col *= (0.35 + vignette * 0.65);

    // 5. Analog Film Grain & Dust Imperfections
    float grain = hash21(uv * uResolution + fract(uTime * 17.132)) - 0.5;
    col += grain * uGrainIntensity;

    // 6. Output with Tone Mapping
    col = col / (1.0 + col);
    gl_FragColor = vec4(col, 1.0);
  }
`;

export function CinematicAtmosphereCanvas({
  blendedProfile,
  audioData = {},
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', { powerPreference: 'high-performance', alpha: false });
    if (!gl) return;

    // Compile Shader
    const compile = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(s));
        return null;
      }
      return s;
    };

    const vs = compile(gl.VERTEX_SHADER, ATMOSPHERE_VS);
    const fs = compile(gl.FRAGMENT_SHADER, ATMOSPHERE_FS);
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    gl.useProgram(prog);

    // Quad Buffer
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

    // Uniforms
    const uTime = gl.getUniformLocation(prog, 'uTime');
    const uResolution = gl.getUniformLocation(prog, 'uResolution');
    const uPointer = gl.getUniformLocation(prog, 'uPointer');
    const uBass = gl.getUniformLocation(prog, 'uBass');
    const uTreble = gl.getUniformLocation(prog, 'uTreble');
    const uBeatPulse = gl.getUniformLocation(prog, 'uBeatPulse');
    const uColorBg = gl.getUniformLocation(prog, 'uColorBg');
    const uColorGlow1 = gl.getUniformLocation(prog, 'uColorGlow1');
    const uColorGlow2 = gl.getUniformLocation(prog, 'uColorGlow2');
    const uGrainIntensity = gl.getUniformLocation(prog, 'uGrainIntensity');
    const uFogDensity = gl.getUniformLocation(prog, 'uFogDensity');
    const uLightLeak = gl.getUniformLocation(prog, 'uLightLeak');

    let animId;
    let startTime = performance.now();
    let pointer = { x: 0, y: 0, smoothX: 0, smoothY: 0 };

    const handlePointer = (e) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('mousemove', handlePointer);

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
      pointer.smoothX += (pointer.x - pointer.smoothX) * 0.05;
      pointer.smoothY += (pointer.y - pointer.smoothY) * 0.05;

      gl.uniform1f(uTime, elapsed);
      gl.uniform2f(uPointer, pointer.smoothX, pointer.smoothY);
      gl.uniform1f(uBass, audioData.bass || 0);
      gl.uniform1f(uTreble, audioData.treble || 0);
      gl.uniform1f(uBeatPulse, audioData.beatPulse || 0);

      if (blendedProfile) {
        const bg = blendedProfile.background || [0.01, 0.015, 0.03];
        const g1 = blendedProfile.primaryGlow || [0.22, 0.74, 0.95];
        const g2 = blendedProfile.secondaryGlow || [0.18, 0.83, 0.75];
        gl.uniform3f(uColorBg, bg[0], bg[1], bg[2]);
        gl.uniform3f(uColorGlow1, g1[0], g1[1], g1[2]);
        gl.uniform3f(uColorGlow2, g2[0], g2[1], g2[2]);
        gl.uniform1f(uGrainIntensity, blendedProfile.grainIntensity || 0.12);
        gl.uniform1f(uFogDensity, blendedProfile.dominantPreset.environment.fogDensity || 0.6);
        gl.uniform1f(uLightLeak, blendedProfile.dominantPreset.environment.lightLeakIntensity || 0.5);
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
  }, [blendedProfile, audioData]);

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
