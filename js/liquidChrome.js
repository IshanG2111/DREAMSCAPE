/* =========================================================================
   LIQUID CHROME MODULE (PHOTOREALISTIC ANALYTICAL STUDIO SHADER)
   ========================================================================= */

window.SongNode = window.SongNode || {};

(function(exports) {
  const vertexShader = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const fragmentShader = `
    uniform float uTime;
    uniform vec2 uResolution;
    uniform vec2 uMouse;
    uniform float uBass;
    uniform float uMids;
    uniform float uTreble;
    varying vec2 vUv;

    // Continuous harmonic domain warping for molten liquid currents
    float liquidHeight(vec2 p, float t) {
      vec2 q = vec2(
        cos(p.x * 2.2 + t * 0.7) + sin(p.y * 2.6 - t * 0.5),
        sin(p.x * 2.6 - t * 0.6) + cos(p.y * 2.2 + t * 0.8)
      );

      vec2 r = vec2(
        cos(dot(p + q * 0.35, vec2(1.5, 2.1)) + t * 0.85),
        sin(dot(p + q * 0.35, vec2(2.1, 1.4)) - t * 0.75)
      ) * (0.8 + uBass * 0.9);

      float h = sin(length(p + r * 0.28) * 4.2 - t * 1.5) * 0.5 + 0.5;
      h += cos(q.x * 2.6 + r.y * 1.7) * 0.25;
      h += (sin(p.x * 6.5 + t * 2.2) * cos(p.y * 6.5 - t * 2.2)) * 0.06 * (1.0 + uTreble * 1.8);
      return h;
    }

    void main() {
      vec2 p = (gl_FragCoord.xy - 0.5 * uResolution.xy) / min(uResolution.x, uResolution.y);
      p += (uMouse - 0.5) * 0.08;

      float t = uTime * (0.22 + uMids * 0.35);

      // Central differences for smooth, un-quantized surface normals
      float eps = 0.006;
      float h = liquidHeight(p, t);
      float hR = liquidHeight(p + vec2(eps, 0.0), t);
      float hL = liquidHeight(p - vec2(eps, 0.0), t);
      float hU = liquidHeight(p + vec2(0.0, eps), t);
      float hD = liquidHeight(p - vec2(0.0, eps), t);

      vec3 N = normalize(vec3((hR - hL) / (2.0 * eps), (hU - hD) / (2.0 * eps), 1.15));
      vec3 V = vec3(0.0, 0.0, 1.0);
      vec3 R = reflect(-V, N);

      // ANALYTICAL STUDIO ENVIRONMENT LIGHTING (Photorealistic Liquid Chrome):
      // 1. Primary key light (sharp white platinum specular reflection)
      vec3 keyLightDir = normalize(vec3(cos(t * 0.25) * 0.4 - 0.1, 0.65, 0.70));
      float softbox = pow(max(dot(R, keyLightDir), 0.0), 24.0);
      float broadSheen = pow(max(dot(R, keyLightDir), 0.0), 6.0);

      // 2. Left rim light (velvety deep indigo / violet reflection)
      vec3 leftRimDir = normalize(vec3(-0.85, -0.2, 0.5));
      float leftRim = pow(max(dot(R, leftRimDir), 0.0), 12.0);

      // 3. Right rim light (warm ruby / deep rose bounce reflection)
      vec3 rightRimDir = normalize(vec3(0.85, -0.15, 0.5));
      float rightRim = pow(max(dot(R, rightRimDir), 0.0), 12.0);

      // 4. Metallic Fresnel rim reflection
      float fresnel = pow(1.0 - max(dot(N, V), 0.0), 2.4);

      // SUBTLY BLENDED COLOR COMPOSITE:
      // Base: Inky obsidian liquid mercury
      vec3 color = vec3(0.018, 0.010, 0.024);

      // Bass warmth in the liquid crevices (deep velvety wine / ruby)
      vec3 bassGlow = mix(vec3(0.10, 0.015, 0.05), vec3(0.32, 0.03, 0.12), clamp(uBass, 0.0, 1.5));
      color += bassGlow * (1.0 - h) * 1.5;

      // Mids violet sheen across the fluid currents
      vec3 midSheen = mix(vec3(0.06, 0.02, 0.14), vec3(0.18, 0.04, 0.28), clamp(uMids, 0.0, 1.5));
      color += midSheen * leftRim * 1.6;

      // Right ruby rim bounce
      vec3 rightSheen = mix(vec3(0.12, 0.025, 0.08), vec3(0.35, 0.06, 0.18), clamp(uBass, 0.0, 1.5));
      color += rightSheen * rightRim * 1.6;

      // Broad chrome body sheen
      color += vec3(0.08, 0.05, 0.11) * broadSheen * 0.7;

      // Crisp platinum & rose-gold specular highlights
      vec3 specColor = mix(vec3(0.95, 0.92, 1.0), vec3(1.0, 0.82, 0.90), clamp(uTreble, 0.0, 1.5));
      color += specColor * softbox * (1.1 + uTreble * 1.5);

      // Ambient metallic Fresnel sheen
      color += vec3(0.70, 0.60, 0.85) * fresnel * 0.18;

      // Gentle natural edge falloff (preserves rich liquid waves across full screen)
      float vig = smoothstep(1.6, 0.65, length(p));
      color *= mix(0.40, 1.0, vig);

      gl_FragColor = vec4(color, 1.0);
    }
  `;

  class LiquidChromeBackground {
    constructor(scene) {
      this.material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          uTime: { value: 0 },
          uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
          uMouse: { value: new THREE.Vector2(0.5, 0.5) },
          uBass: { value: 0.15 },
          uMids: { value: 0.15 },
          uTreble: { value: 0.15 }
        },
        depthWrite: false,
        depthTest: false
      });

      this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(3600, 2400), this.material);
      this.mesh.position.set(0, 0, -320);
      scene.add(this.mesh);
    }

    update(frameTick, bands, mouseNorm) {
      this.material.uniforms.uTime.value = frameTick * 0.02;
      this.material.uniforms.uBass.value = bands.bass;
      this.material.uniforms.uMids.value = bands.mids;
      this.material.uniforms.uTreble.value = bands.treble;

      if (mouseNorm) {
        this.material.uniforms.uMouse.value.set(mouseNorm.x, mouseNorm.y);
      }
    }

    resize(w, h) {
      this.material.uniforms.uResolution.value.set(w, h);
    }
  }

  exports.LiquidChromeBackground = LiquidChromeBackground;
})(window.SongNode);

