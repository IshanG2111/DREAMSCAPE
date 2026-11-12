/* =========================================================================
   CONSTELLATION MODULE (EXACT CINEMATIC REPLICATION VIA THREE.JS & GSAP)
   ========================================================================= */

window.SongNode = window.SongNode || {};

(function(exports) {
  // A. Procedural Anamorphic Lens Flare Texture
  function createAnamorphicTexture() {
    const cvs = document.createElement('canvas');
    cvs.width = 512;
    cvs.height = 64;
    const ctx = cvs.getContext('2d');

    const grad = ctx.createLinearGradient(0, 32, 512, 32);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
    grad.addColorStop(0.38, 'rgba(255, 70, 130, 0.65)');
    grad.addColorStop(0.5, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.62, 'rgba(255, 70, 130, 0.65)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 28, 512, 8);

    ctx.beginPath();
    ctx.arc(256, 32, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(256, 32, 20, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 80, 140, 0.55)';
    ctx.fill();

    const tex = new THREE.CanvasTexture(cvs);
    tex.needsUpdate = true;
    return tex;
  }

  // B. Soft Radial Magenta Bloom Texture
  function createBloomTexture() {
    const cvs = document.createElement('canvas');
    cvs.width = 512;
    cvs.height = 512;
    const ctx = cvs.getContext('2d');
    const grad = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
    grad.addColorStop(0, 'rgba(255, 245, 252, 0.95)');
    grad.addColorStop(0.28, 'rgba(255, 42, 109, 0.55)');
    grad.addColorStop(0.65, 'rgba(155, 45, 226, 0.15)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    const tex = new THREE.CanvasTexture(cvs);
    tex.needsUpdate = true;
    return tex;
  }

  // C. High-Resolution Didone Italic Text Sprite Renderer (Bodoni Moda / Playfair Display)
  function createWordTexture(text, isHero) {
    const cvs = document.createElement('canvas');
    cvs.width = 1024;
    cvs.height = 256;
    const ctx = cvs.getContext('2d');

    const fontSize = isHero ? 140 : 108;
    ctx.font = `italic 700 ${fontSize}px 'Bodoni Moda', 'Playfair Display', Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (isHero) {
      // 1. Neon Hot Magenta Outer Aura
      ctx.shadowColor = 'rgba(255, 42, 109, 0.95)';
      ctx.shadowBlur = 32;
      ctx.fillStyle = '#ff2a6d';
      ctx.fillText(text, 512, 128);

      // 2. Soft Rose Glow Pass
      ctx.shadowColor = 'rgba(255, 100, 160, 0.8)';
      ctx.shadowBlur = 14;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(text, 512, 128);

      // 3. Crisp Pure White Center Letterforms
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(text, 512, 128);
    } else {
      // Non-Hero Words: Pure Solid Luminous White with Delicate Aura (100% VISIBLE!)
      ctx.shadowColor = 'rgba(255, 255, 255, 0.65)';
      ctx.shadowBlur = 14;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(text, 512, 128);

      // Second crisp pass
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(text, 512, 128);
    }

    const tex = new THREE.CanvasTexture(cvs);
    tex.needsUpdate = true;
    tex.minFilter = THREE.LinearFilter;
    return { canvas: cvs, ctx, texture: tex };
  }

  // Exact 5-Slot Visual Layout Configurations (Pixel-matched from user reference image)
  const SLOT_CONFIGS = [
    {
      defaultWord: "Let",
      wordPos: new THREE.Vector3(-480, 210, 15),
      beadPos: new THREE.Vector3(-460, 175, 5),
      rx: 75, ry: 38, rotZ: -0.28,
      baseScale: 0.85
    },
    {
      defaultWord: "it",
      wordPos: new THREE.Vector3(-280, 105, 15),
      beadPos: new THREE.Vector3(-270, 75, 5),
      rx: 62, ry: 30, rotZ: -0.26,
      baseScale: 0.85
    },
    {
      defaultWord: "happen.",
      wordPos: new THREE.Vector3(0, 0, 25),             // Hero Centered at origin
      cradleUnder: new THREE.Vector3(-60, -52, 5),      // Swoops gracefully UNDER "happen."
      beadPos: new THREE.Vector3(124, -16, 5),          // Anchor bead at the "." of "happen."
      rx: 175, ry: 78, rotZ: -0.28,
      baseScale: 1.30
    },
    {
      defaultWord: "babe",
      wordPos: new THREE.Vector3(310, -95, 15),
      beadPos: new THREE.Vector3(300, -130, 5),
      rx: 78, ry: 38, rotZ: -0.26,
      baseScale: 0.85
    },
    {
      defaultWord: "see",
      wordPos: new THREE.Vector3(510, -190, 15),
      beadPos: new THREE.Vector3(515, -225, 5),
      rx: 65, ry: 32, rotZ: -0.28,
      baseScale: 0.85
    }
  ];

  class ConstellationEngine {
    constructor(scene) {
      this.scene = scene;
      this.rootGroup = new THREE.Group();
      this.scene.add(this.rootGroup);

      this.anamorphicTexture = createAnamorphicTexture();
      this.bloomTexture = createBloomTexture();

      this.currentHeroSlot = 2; // Slot 2 = "happen."
      this.slots = [];

      this.buildSplineRibbon();
      this.buildForegroundBokeh();
      this.buildBackgroundStardust();
      this.buildSlots();

      // Ensure crisp fonts once Google Fonts finish downloading
      if (document.fonts) {
        document.fonts.ready.then(() => {
          this.refreshAllTextures();
        });
      }
    }

    buildSlots() {
      for (let i = 0; i < 5; i++) {
        const cfg = SLOT_CONFIGS[i];
        const isHero = (i === this.currentHeroSlot);

        const group = new THREE.Group();
        group.position.copy(cfg.wordPos);

        // 1. Text Sprite (Elevated to Z = 16 in front of lines)
        const textData = createWordTexture(cfg.defaultWord, isHero);
        const aspect = 1024 / 256;
        const spriteH = isHero ? 145 : 100;
        const spriteW = spriteH * aspect;

        const spriteMat = new THREE.SpriteMaterial({
          map: textData.texture,
          transparent: true,
          depthWrite: false,
          blending: THREE.NormalBlending,
          opacity: 1.0 // 100% OPAQUE & CRISP
        });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.scale.set(spriteW, spriteH, 1);
        sprite.position.set(0, 0, 16);
        group.add(sprite);

        // 2. Primary Tilted Orbital Ring
        const ellipseCurve = new THREE.EllipseCurve(0, 0, cfg.rx, cfg.ry, 0, 2 * Math.PI, false, cfg.rotZ);
        const ellipseGeo = new THREE.BufferGeometry().setFromPoints(ellipseCurve.getPoints(64));
        const ellipseMat = new THREE.LineBasicMaterial({
          color: isHero ? 0xff3366 : 0xb8b0e8,
          transparent: true,
          opacity: isHero ? 0.95 : 0.45,
          blending: THREE.AdditiveBlending
        });
        const ellipseLine = new THREE.Line(ellipseGeo, ellipseMat);
        ellipseLine.position.set(0, 0, 2);
        group.add(ellipseLine);

        // 3. Outer Concentric Ring (for Hero)
        const outerCurve = new THREE.EllipseCurve(0, 0, cfg.rx * 1.35, cfg.ry * 1.35, 0, 2 * Math.PI, false, cfg.rotZ);
        const outerGeo = new THREE.BufferGeometry().setFromPoints(outerCurve.getPoints(64));
        const outerMat = new THREE.LineBasicMaterial({
          color: 0xff4d88,
          transparent: true,
          opacity: isHero ? 0.35 : 0.0,
          blending: THREE.AdditiveBlending
        });
        const outerLine = new THREE.Line(outerGeo, outerMat);
        outerLine.position.set(0, 0, 1);
        group.add(outerLine);

        // 4. Hero Radial Crosshairs
        const crosshairGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(-180, 42, 0), new THREE.Vector3(200, -48, 0),
          new THREE.Vector3(-25, -95, 0), new THREE.Vector3(25, 95, 0)
        ]);
        const crosshairMat = new THREE.LineBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: isHero ? 0.22 : 0.0,
          blending: THREE.AdditiveBlending
        });
        const crosshairLine = new THREE.LineSegments(crosshairGeo, crosshairMat);
        group.add(crosshairLine);

        // 5. Hero Ambient Magenta Bloom
        const bloomMat = new THREE.SpriteMaterial({
          map: this.bloomTexture,
          transparent: true,
          opacity: isHero ? 0.85 : 0.0,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        });
        const bloomSprite = new THREE.Sprite(bloomMat);
        bloomSprite.scale.set(480, 280, 1);
        bloomSprite.position.set(0, 0, -4);
        group.add(bloomSprite);

        // 6. Anchor Bead Flare
        const flareMat = new THREE.SpriteMaterial({
          map: this.anamorphicTexture,
          transparent: true,
          opacity: isHero ? 1.0 : 0.75,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        });
        const flareSprite = new THREE.Sprite(flareMat);
        flareSprite.scale.set(isHero ? 160 : 75, isHero ? 22 : 11, 1);

        const relBead = cfg.beadPos.clone().sub(cfg.wordPos);
        flareSprite.position.set(relBead.x, relBead.y, 8);
        group.add(flareSprite);

        this.rootGroup.add(group);

        const slotItem = {
          idx: i,
          cfg,
          group,
          textData,
          currentText: cfg.defaultWord,
          sprite,
          spriteMat,
          ellipseLine,
          ellipseMat,
          outerLine,
          outerMat,
          crosshairLine,
          crosshairMat,
          bloomSprite,
          bloomMat,
          flareSprite,
          flareMat,
          baseY: cfg.wordPos.y
        };

        // Subtle GSAP organic levitation (individual phase per word)
        gsap.to(group.position, {
          y: cfg.wordPos.y + 4.5,
          duration: 3.2 + i * 0.45,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut"
        });

        this.slots.push(slotItem);
      }
    }

    buildSplineRibbon() {
      // Cradle Spline Path: Swoops smoothly UNDER "happen." to its period "."
      const splinePoints = [
        new THREE.Vector3(-700, 290, -20),
        SLOT_CONFIGS[0].beadPos,
        SLOT_CONFIGS[1].beadPos,
        SLOT_CONFIGS[2].cradleUnder, // Swoops safely UNDER the text!
        SLOT_CONFIGS[2].beadPos,     // Meets the anchor flare on "."
        SLOT_CONFIGS[3].beadPos,
        SLOT_CONFIGS[4].beadPos,
        new THREE.Vector3(720, -320, -20)
      ];

      this.ribbonCurve = new THREE.CatmullRomCurve3(splinePoints, false, 'catmullrom', 0.45);
      const divisions = 260;
      const points = this.ribbonCurve.getPoints(divisions);

      // Core Line with Vertex Colors (Icy Lilac -> Hot Neon Magenta -> Icy Lilac)
      const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
      const colors = [];
      for (let i = 0; i <= divisions; i++) {
        const t = i / divisions;
        if (t < 0.35) {
          colors.push(0.72, 0.65, 0.98);
        } else if (t < 0.65) {
          colors.push(1.0, 0.22, 0.48); // Vivid Hot Magenta Pink
        } else {
          colors.push(0.72, 0.65, 0.98);
        }
      }
      lineGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

      this.coreLineMat = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending
      });
      const coreLine = new THREE.Line(lineGeo, this.coreLineMat);
      coreLine.position.set(0, 0, 4);
      this.rootGroup.add(coreLine);

      // Glowing Outer Tube
      const tubeGeo = new THREE.TubeGeometry(this.ribbonCurve, 160, 4.8, 8, false);
      const tubeColors = [];
      const count = tubeGeo.attributes.position.count;
      for (let i = 0; i < count; i++) {
        const v = new THREE.Vector3().fromBufferAttribute(tubeGeo.attributes.position, i);
        const t = (v.x + 600) / 1200;
        if (t > 0.35 && t < 0.65) {
          tubeColors.push(1.0, 0.20, 0.45);
        } else {
          tubeColors.push(0.52, 0.40, 0.90);
        }
      }
      tubeGeo.setAttribute('color', new THREE.Float32BufferAttribute(tubeColors, 3));

      this.tubeMat = new THREE.MeshBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.38,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const tubeMesh = new THREE.Mesh(tubeGeo, this.tubeMat);
      tubeMesh.position.set(0, 0, 3);
      this.rootGroup.add(tubeMesh);

      // Traveling Light Photon
      const photonMat = new THREE.MeshBasicMaterial({ color: 0xffffff, blending: THREE.AdditiveBlending });
      this.photonMesh = new THREE.Mesh(new THREE.SphereGeometry(3.5, 12, 12), photonMat);
      this.rootGroup.add(this.photonMesh);

      this.photonFlareMat = new THREE.SpriteMaterial({
        map: this.anamorphicTexture,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending
      });
      const photonFlare = new THREE.Sprite(this.photonFlareMat);
      photonFlare.scale.set(70, 12, 1);
      this.photonMesh.add(photonFlare);
    }

    buildForegroundBokeh() {
      // Soft out-of-focus optical bokeh streak in foreground
      const bokehCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-480, -180, 120),
        new THREE.Vector3(-160, -230, 140),
        new THREE.Vector3(140, -270, 110)
      ]);
      const bokehGeo = new THREE.TubeGeometry(bokehCurve, 48, 15, 8, false);

      const count = bokehGeo.attributes.position.count;
      const bokehColors = [];
      for (let i = 0; i < count; i++) {
        const v = new THREE.Vector3().fromBufferAttribute(bokehGeo.attributes.position, i);
        const t = Math.max(0, Math.min(1, (v.x + 480) / 620));
        const fade = Math.sin(t * Math.PI);
        bokehColors.push(0.85 * fade, 0.42 * fade, 0.95 * fade);
      }
      bokehGeo.setAttribute('color', new THREE.Float32BufferAttribute(bokehColors, 3));

      this.bokehMat = new THREE.MeshBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.30,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      this.rootGroup.add(new THREE.Mesh(bokehGeo, this.bokehMat));

      // Specular Glint on Bokeh Streak
      this.bokehGlintMat = new THREE.SpriteMaterial({
        map: this.anamorphicTexture,
        transparent: true,
        opacity: 0.88,
        blending: THREE.AdditiveBlending
      });
      this.bokehGlint = new THREE.Sprite(this.bokehGlintMat);
      this.bokehGlint.scale.set(130, 18, 1);
      this.bokehGlint.position.set(-85, -235, 135);
      this.rootGroup.add(this.bokehGlint);
    }

    buildBackgroundStardust() {
      const count = 90;
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(count * 3);
      for (let i = 0; i < count * 3; i += 3) {
        pos[i] = (Math.random() - 0.5) * 1600;
        pos[i + 1] = (Math.random() - 0.5) * 1000;
        pos[i + 2] = (Math.random() - 0.5) * 600;
      }
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      this.dustMat = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 2.2,
        transparent: true,
        opacity: 0.28,
        blending: THREE.AdditiveBlending
      });
      this.rootGroup.add(new THREE.Points(geo, this.dustMat));
    }

    // Refresh all canvas textures (called when Google Fonts finish loading)
    refreshAllTextures() {
      for (const slot of this.slots) {
        this.updateSlotText(slot.idx, slot.currentText, slot.idx === this.currentHeroSlot);
      }
    }

    updateSlotText(slotIdx, text, isHero) {
      if (slotIdx < 0 || slotIdx >= 5) return;
      const slot = this.slots[slotIdx];
      slot.currentText = text || "";

      const newTexData = createWordTexture(slot.currentText, isHero);
      slot.spriteMat.map.dispose();
      slot.spriteMat.map = newTexData.texture;
      slot.textData = newTexData;
    }

    // Smooth GSAP Spotlight Transition to Target Slot
    setHeroSlot(targetIdx, duration = 0.9) {
      if (targetIdx < 0 || targetIdx >= 5 || targetIdx === this.currentHeroSlot) return;
      const prevHero = this.currentHeroSlot;
      this.currentHeroSlot = targetIdx;

      // 1. Transition previous hero down to outer appearance
      const oldSlot = this.slots[prevHero];
      this.updateSlotText(prevHero, oldSlot.currentText, false);

      gsap.to(oldSlot.group.scale, { x: 0.85, y: 0.85, duration, ease: "power2.out" });
      gsap.to(oldSlot.ellipseMat.color, { r: 0.72, g: 0.69, b: 0.91, duration });
      gsap.to(oldSlot.ellipseMat, { opacity: 0.45, duration });
      gsap.to(oldSlot.outerMat, { opacity: 0.0, duration });
      gsap.to(oldSlot.crosshairMat, { opacity: 0.0, duration });
      gsap.to(oldSlot.bloomMat, { opacity: 0.0, duration });
      gsap.to(oldSlot.flareSprite.scale, { x: 75, y: 11, duration, ease: "power2.out" });
      gsap.to(oldSlot.flareMat, { opacity: 0.75, duration });

      // 2. Transition target slot up to Hero appearance
      const newSlot = this.slots[targetIdx];
      this.updateSlotText(targetIdx, newSlot.currentText, true);

      gsap.to(newSlot.group.scale, { x: 1.30, y: 1.30, duration, ease: "back.out(1.2)" });
      gsap.to(newSlot.ellipseMat.color, { r: 1.0, g: 0.20, b: 0.45, duration });
      gsap.to(newSlot.ellipseMat, { opacity: 0.95, duration });
      gsap.to(newSlot.outerMat, { opacity: 0.35, duration });
      gsap.to(newSlot.crosshairMat, { opacity: 0.22, duration });
      gsap.to(newSlot.bloomMat, { opacity: 0.85, duration });
      gsap.to(newSlot.flareSprite.scale, { x: 160, y: 22, duration, ease: "back.out(1.4)" });
      gsap.to(newSlot.flareMat, { opacity: 1.0, duration });
    }

    // Update 5 Words Sentence with Smooth GSAP Crossfade
    setWords(wordsArray, heroSlot = 2) {
      if (!Array.isArray(wordsArray) || wordsArray.length === 0) return;

      for (let i = 0; i < 5; i++) {
        const text = wordsArray[i] || "";
        const isHero = (i === heroSlot);
        this.updateSlotText(i, text, isHero);
      }

      if (heroSlot !== this.currentHeroSlot) {
        this.setHeroSlot(heroSlot, 0.6);
      }
    }

    // Set Track Title & Artist in Center (Song Without Lyrics Mode)
    showTrackHero(title, artist) {
      this.setWords(["♪", "", title.toUpperCase(), (artist || "").toUpperCase(), "♪"], 2);
    }

    // Set Ambient Celestial Chronos (Default / Idle Mode)
    showIdleChronos(timeString) {
      this.setWords(["Let", "it", "happen.", "babe", "see"], 2);
    }

    update(dt, frameTick, bands) {
      const speed = 0.0022 + bands.mids * 0.002;
      if (this.ribbonCurve) {
        const photonT = (frameTick * speed) % 1;
        const pt = this.ribbonCurve.getPointAt(photonT);
        this.photonMesh.position.copy(pt);
      }

      // Hero Flare Twinkle
      const twinkle = Math.sin(frameTick * 0.04) * 0.12 + (0.88 + bands.treble * 0.25);
      const heroSlot = this.slots[this.currentHeroSlot];
      if (heroSlot) {
        heroSlot.flareSprite.scale.x = 160 * twinkle;
      }
    }
  }

  exports.ConstellationEngine = ConstellationEngine;
})(window.SongNode);
