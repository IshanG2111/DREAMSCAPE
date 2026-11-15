import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { createDiscTextureCanvas } from '../engine/artworkTexture';

export function OpticalDiscPlayer({
  track,
  playback,
  audioData = {},
  isReducedMotion = false,
}) {
  const containerRef = useRef(null);
  const isPlaying = playback?.status === 'playing';

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(0, 0, 6.2);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
      precision: 'highp',
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);

    // Root Group for Mouse Parallax Tilt
    const playerGroup = new THREE.Group();
    scene.add(playerGroup);

    // 2. Lighting Setup
    // Subtle ambient light
    const ambientLight = new THREE.AmbientLight(0x22222a, 1.2);
    scene.add(ambientLight);

    // Key glass reflection light (upper-left)
    const keyLight = new THREE.DirectionalLight(0xf5f5fa, 2.2);
    keyLight.position.set(-3.5, 4.5, 5.0);
    scene.add(keyLight);

    // Soft rim light (upper-right)
    const rimLight = new THREE.DirectionalLight(0xdde0ea, 1.4);
    rimLight.position.set(4.0, 3.0, 3.5);
    scene.add(rimLight);

    // Restrained Crimson LED Lights (Bottom & Mechanical rails)
    const redLedBottom = new THREE.PointLight(0xc51e43, 2.8, 4.5, 1.8);
    redLedBottom.position.set(-0.8, -1.6, 0.2);
    playerGroup.add(redLedBottom);

    const redLedCorner = new THREE.PointLight(0xff1848, 3.2, 3.0, 2.0);
    redLedCorner.position.set(1.4, -1.5, 0.25);
    playerGroup.add(redLedCorner);

    const redLedLaser = new THREE.PointLight(0xff2244, 2.0, 2.0, 2.0);
    redLedLaser.position.set(-1.42, 0.0, 0.15);
    playerGroup.add(redLedLaser);

    // 3. Materials
    // A. Transparent Acrylic Glass Material
    const acrylicMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x08080c,
      transmission: 0.94,
      opacity: 1.0,
      transparent: true,
      roughness: 0.04,
      metalness: 0.04,
      ior: 1.51,
      thickness: 1.1,
      specularIntensity: 1.0,
      specularColor: new THREE.Color(0xffffff),
      clearcoat: 1.0,
      clearcoatRoughness: 0.03,
    });

    // B. Bevel Highlight Material (Subtle glowing edges)
    const bevelLineMaterial = new THREE.LineBasicMaterial({
      color: 0xdedee8,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
    });

    // C. Internal Metal Components Material (Polished steel)
    const metalMaterial = new THREE.MeshStandardMaterial({
      color: 0xc4c7ce,
      metalness: 0.92,
      roughness: 0.16,
    });

    const darkMetalMaterial = new THREE.MeshStandardMaterial({
      color: 0x18191e,
      metalness: 0.85,
      roughness: 0.35,
    });

    // Brass accent material for lens bushing
    const brassMaterial = new THREE.MeshStandardMaterial({
      color: 0xcca84a,
      metalness: 0.95,
      roughness: 0.2,
    });

    // 4. Physical Geometry Construction
    // ----------------------------------------------------
    // Outer Acrylic Casing Box
    const boxWidth = 3.35;
    const boxHeight = 3.35;
    const boxDepth = 0.38;

    // Front Acrylic Cover Pane
    const frontCoverGeo = new THREE.BoxGeometry(boxWidth, boxHeight, 0.06);
    const frontCover = new THREE.Mesh(frontCoverGeo, acrylicMaterial);
    frontCover.position.set(0, 0, 0.2);
    playerGroup.add(frontCover);

    // Back Acrylic Housing Base
    const backBaseGeo = new THREE.BoxGeometry(boxWidth, boxHeight, 0.1);
    const backBase = new THREE.Mesh(backBaseGeo, acrylicMaterial);
    backBase.position.set(0, 0, -0.2);
    playerGroup.add(backBase);

    // Perimeter Acrylic Sidewalls
    const wallThick = 0.08;
    const sideWallGeo = new THREE.BoxGeometry(wallThick, boxHeight, boxDepth);
    const topWallGeo = new THREE.BoxGeometry(boxWidth, wallThick, boxDepth);

    const leftWall = new THREE.Mesh(sideWallGeo, acrylicMaterial);
    leftWall.position.set(-boxWidth * 0.5 + wallThick * 0.5, 0, 0);
    playerGroup.add(leftWall);

    const rightWall = new THREE.Mesh(sideWallGeo, acrylicMaterial);
    rightWall.position.set(boxWidth * 0.5 - wallThick * 0.5, 0, 0);
    playerGroup.add(rightWall);

    const topWall = new THREE.Mesh(topWallGeo, acrylicMaterial);
    topWall.position.set(0, boxHeight * 0.5 - wallThick * 0.5, 0);
    playerGroup.add(topWall);

    const bottomWall = new THREE.Mesh(topWallGeo, acrylicMaterial);
    bottomWall.position.set(0, -boxHeight * 0.5 + wallThick * 0.5, 0);
    playerGroup.add(bottomWall);

    // 5. Bevel Wireframe Highlights around Acrylic Casing
    const edgesGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth));
    const edgesLines = new THREE.LineSegments(edgesGeo, bevelLineMaterial);
    playerGroup.add(edgesLines);

    // Inner bevel frame line
    const innerEdgesGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(boxWidth - 0.12, boxHeight - 0.12, boxDepth - 0.05));
    const innerEdgesLines = new THREE.LineSegments(
      innerEdgesGeo,
      new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.2 })
    );
    playerGroup.add(innerEdgesLines);

    // 6. Corner Standoffs / Metal Screws (4 corners)
    const cornerOffset = 1.48;
    const standoffPositions = [
      [-cornerOffset, cornerOffset],
      [cornerOffset, cornerOffset],
      [-cornerOffset, -cornerOffset],
      [cornerOffset, -cornerOffset],
    ];

    standoffPositions.forEach(([x, y]) => {
      // Cylindrical standoff pin
      const pinGeo = new THREE.CylinderGeometry(0.09, 0.09, boxDepth + 0.02, 24);
      const pin = new THREE.Mesh(pinGeo, metalMaterial);
      pin.rotation.x = Math.PI * 0.5;
      pin.position.set(x, y, 0);
      playerGroup.add(pin);

      // Screw Head Cap with indent
      const capGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.04, 24);
      const capFront = new THREE.Mesh(capGeo, metalMaterial);
      capFront.rotation.x = Math.PI * 0.5;
      capFront.position.set(x, y, 0.22);
      playerGroup.add(capFront);

      // Crosshair / hex dot on screw head
      const dotGeo = new THREE.CircleGeometry(0.04, 6);
      const dot = new THREE.Mesh(dotGeo, darkMetalMaterial);
      dot.position.set(x, y, 0.245);
      playerGroup.add(dot);
    });

    // 7. Internal Mechanical Details (Left Guide Rods & Laser Carriage)
    // Vertical Steel Guide Rods
    const rodGeo = new THREE.CylinderGeometry(0.025, 0.025, 2.7, 16);
    const leftRod1 = new THREE.Mesh(rodGeo, metalMaterial);
    leftRod1.position.set(-1.46, 0, -0.05);
    playerGroup.add(leftRod1);

    const leftRod2 = new THREE.Mesh(rodGeo, metalMaterial);
    leftRod2.position.set(-1.38, 0, -0.05);
    playerGroup.add(leftRod2);

    // Laser Pickup Carriage Assembly
    const carriageGroup = new THREE.Group();
    carriageGroup.position.set(-1.42, -0.3, -0.04);

    const carriageBodyGeo = new THREE.BoxGeometry(0.18, 0.35, 0.12);
    const carriageBody = new THREE.Mesh(carriageBodyGeo, darkMetalMaterial);
    carriageGroup.add(carriageBody);

    // Brass optical lens ring
    const lensRingGeo = new THREE.TorusGeometry(0.05, 0.015, 12, 24);
    const lensRing = new THREE.Mesh(lensRingGeo, brassMaterial);
    lensRing.position.set(0.02, 0, 0.06);
    carriageGroup.add(lensRing);

    // Crimson Laser Diode Emitter Point
    const diodeGeo = new THREE.SphereGeometry(0.025, 12, 12);
    const diodeMat = new THREE.MeshBasicMaterial({ color: 0xff1035 });
    const diode = new THREE.Mesh(diodeGeo, diodeMat);
    diode.position.set(0.02, 0, 0.065);
    carriageGroup.add(diode);

    playerGroup.add(carriageGroup);

    // Subtle Internal Mechanical Clamps / Clips (Top & Bottom)
    const clipGeo = new THREE.BoxGeometry(0.35, 0.06, 0.1);
    const topClip = new THREE.Mesh(clipGeo, darkMetalMaterial);
    topClip.position.set(0, 1.55, 0);
    playerGroup.add(topClip);

    const bottomClip = new THREE.Mesh(clipGeo, darkMetalMaterial);
    bottomClip.position.set(0, -1.55, 0);
    playerGroup.add(bottomClip);

    // 8. Central Spindle Hub Assembly
    const spindleGroup = new THREE.Group();
    spindleGroup.position.set(0, 0, -0.02);

    // Center Spindle Shaft
    const shaftGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.22, 24);
    const shaft = new THREE.Mesh(shaftGeo, darkMetalMaterial);
    shaft.rotation.x = Math.PI * 0.5;
    spindleGroup.add(shaft);

    // Spindle Clamp Ring
    const clampGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.06, 32);
    const clamp = new THREE.Mesh(clampGeo, metalMaterial);
    clamp.rotation.x = Math.PI * 0.5;
    clamp.position.set(0, 0, 0.02);
    spindleGroup.add(clamp);

    // Center knurled cap
    const knurlCapGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.07, 32);
    const knurlCap = new THREE.Mesh(knurlCapGeo, darkMetalMaterial);
    knurlCap.rotation.x = Math.PI * 0.5;
    knurlCap.position.set(0, 0, 0.04);
    spindleGroup.add(knurlCap);

    playerGroup.add(spindleGroup);

    // 9. Central Optical Disc (Rotating CD)
    const discRadius = 1.34;
    const discInnerRadius = 0.08;
    const discGeo = new THREE.RingGeometry(discInnerRadius, discRadius, 64, 1);

    // Correct UV mapping for RingGeometry to standard square (0..1)
    const pos = discGeo.attributes.position;
    const uvs = discGeo.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const u = (pos.getX(i) / discRadius) * 0.5 + 0.5;
      const v = (pos.getY(i) / discRadius) * 0.5 + 0.5;
      uvs.setXY(i, u, v);
    }
    uvs.needsUpdate = true;

    // Disc Material with Canvas Texture
    let discTextureCanvas = createDiscTextureCanvas(track, 1024);
    const discTexture = new THREE.CanvasTexture(discTextureCanvas);
    discTexture.anisotropy = 8;
    discTexture.minFilter = THREE.LinearMipmapLinearFilter;
    discTexture.magFilter = THREE.LinearFilter;
    discTexture.generateMipmaps = true;

    // Callback when texture finishes loading image
    discTextureCanvas._onReady = () => {
      discTexture.needsUpdate = true;
    };

    const discMaterial = new THREE.MeshPhysicalMaterial({
      map: discTexture,
      transparent: true,
      roughness: 0.16,
      metalness: 0.62,
      clearcoat: 0.95,
      clearcoatRoughness: 0.06,
      side: THREE.DoubleSide,
    });

    const discMesh = new THREE.Mesh(discGeo, discMaterial);
    discMesh.position.set(0, 0, 0.015);
    playerGroup.add(discMesh);

    // 10. Optical Anisotropic Reflection Sheen Layer
    // Generates circular rainbow sheen as the disc rotates
    const sheenGeo = new THREE.RingGeometry(0.24, discRadius - 0.02, 64);
    const sheenMaterial = new THREE.ShaderMaterial({
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uAngle: { value: 0 },
        uIntensity: { value: 0.35 },
      },
      vertexShader: `
        varying vec2 vPos;
        void main() {
          vPos = position.xy;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uAngle;
        uniform float uIntensity;
        varying vec2 vPos;

        void main() {
          float dist = length(vPos);
          float angle = atan(vPos.y, vPos.x) - uAngle;
          
          // Two symmetric caustic reflection blades (like a CD in light)
          float blade1 = pow(abs(cos(angle)), 14.0);
          float blade2 = pow(abs(cos(angle + 1.57079)), 18.0);
          float sheen = blade1 * 0.7 + blade2 * 0.3;

          // Subtle rainbow dispersion
          vec3 rainbow = 0.5 + 0.5 * cos(angle * 3.0 + vec3(0.0, 2.0, 4.0) + dist * 5.0);
          vec3 col = mix(vec3(0.9, 0.92, 1.0), rainbow, 0.45) * sheen * uIntensity;

          // Edge fade
          float alpha = smoothstep(0.24, 0.32, dist) * smoothstep(1.32, 1.25, dist) * sheen * uIntensity;
          gl_FragColor = vec4(col, alpha);
        }
      `,
    });

    const sheenMesh = new THREE.Mesh(sheenGeo, sheenMaterial);
    sheenMesh.position.set(0, 0, 0.022);
    playerGroup.add(sheenMesh);

    // 11. Mouse Parallax & Animation Loop
    let animId;
    let lastTime = performance.now();
    let discAngle = 0;
    let discSpeed = isPlaying ? 1.85 : 0;
    let targetSpeed = isPlaying ? 1.85 : 0;

    let targetParallax = { x: 0, y: 0 };
    let currentParallax = { x: 0, y: 0 };

    const handleMouseMove = (e) => {
      if (isReducedMotion) return;
      const rect = container.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width - 0.5;
      const ny = (e.clientY - rect.top) / rect.height - 0.5;
      targetParallax.x = -ny * 0.16; // Pitch
      targetParallax.y = nx * 0.22;  // Yaw
    };
    window.addEventListener('mousemove', handleMouseMove);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    const animate = (now) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      // Disc Speed Inertia (smooth spin up and deceleration)
      targetSpeed = isPlaying ? 1.85 : 0.0;
      discSpeed += (targetSpeed - discSpeed) * (isPlaying ? 0.06 : 0.03);
      discAngle -= discSpeed * dt;

      // Rotate Disc & Spindle
      discMesh.rotation.z = discAngle;
      spindleGroup.rotation.z = discAngle;
      sheenMaterial.uniforms.uAngle.value = discAngle * 0.4;
      sheenMaterial.uniforms.uTime.value = now * 0.001;

      // Audio reactivity: bass pulses gently brighten edge LEDs & sheen
      const bassVal = audioData.bass || 0;
      const beatPulse = audioData.beatPulse || 0;
      redLedBottom.intensity = 2.4 + bassVal * 1.5;
      redLedCorner.intensity = 2.8 + beatPulse * 2.0;
      sheenMaterial.uniforms.uIntensity.value = 0.35 + bassVal * 0.25;

      // Laser carriage subtle micro-movement
      if (isPlaying) {
        carriageGroup.position.y = -0.3 + Math.sin(now * 0.0008) * 0.15;
      }

      // Parallax Interpolation
      currentParallax.x += (targetParallax.x - currentParallax.x) * 0.06;
      currentParallax.y += (targetParallax.y - currentParallax.y) * 0.06;
      playerGroup.rotation.x = currentParallax.x;
      playerGroup.rotation.y = currentParallax.y;

      renderer.render(scene, camera);
      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);

    // Cleanup
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [track?.title, track?.artist, track?.artwork, track?.discArt, isPlaying, isReducedMotion]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    />
  );
}
