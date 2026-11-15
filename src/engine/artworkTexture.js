/**
 * DREAMSCAPE — Optical Disc Texture Compositor
 * Generates physical-grade CD/optical disc textures on offscreen canvas.
 * Integrates album artwork circularly, with inner mirror clamp, printed surface typography,
 * optical microgrooves, and central spindle aperture.
 */

const textureCache = new Map();

/**
 * Creates or retrieves a cached Canvas / Texture for an optical disc.
 * @param {Object} track - { title, artist, album, artwork, discArt }
 * @param {number} size - Resolution of the texture (e.g. 1024)
 * @returns {HTMLCanvasElement}
 */
export function createDiscTextureCanvas(track, size = 1024) {
  const cacheKey = `${track?.title || 'demo'}_${track?.artist || ''}_${track?.artwork || track?.discArt || 'art'}_${size}`;
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey);
  }

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const cx = size * 0.5;
  const cy = size * 0.5;
  const outerR = size * 0.485;
  const dataInnerR = size * 0.19;
  const hubOuterR = size * 0.185;
  const hubInnerR = size * 0.08;
  const centerHoleR = size * 0.065;

  // Clear background
  ctx.clearRect(0, 0, size, size);

  // If a pre-baked disc artwork is provided, we can draw it directly or composite over it
  const renderCompositedDisc = (artImage = null) => {
    ctx.save();

    // 1. Clip to Outer Circular Disc Perimeter
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    // Dark base polycarbonate substrate
    ctx.fillStyle = '#08080a';
    ctx.fill();

    // 2. Render Album Artwork in Playable Data Zone
    if (artImage && artImage.complete && artImage.naturalWidth > 0) {
      ctx.save();
      // Mask playable data ring (dataInnerR to outerR)
      ctx.beginPath();
      ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
      ctx.arc(cx, cy, dataInnerR, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.clip();

      // Draw artwork centered and scaled
      const iw = artImage.naturalWidth || artImage.width;
      const ih = artImage.naturalHeight || artImage.height;
      const scale = Math.max((outerR * 2) / iw, (outerR * 2) / ih);
      const dw = iw * scale;
      const dh = ih * scale;
      ctx.drawImage(artImage, cx - dw * 0.5, cy - dh * 0.5, dw, dh);

      // Subtle dark vignette to emphasize disc curvature
      const radialGrad = ctx.createRadialGradient(cx, cy, dataInnerR, cx, cy, outerR);
      radialGrad.addColorStop(0.0, 'rgba(0, 0, 0, 0.45)');
      radialGrad.addColorStop(0.08, 'rgba(0, 0, 0, 0.1)');
      radialGrad.addColorStop(0.85, 'rgba(0, 0, 0, 0.0)');
      radialGrad.addColorStop(0.98, 'rgba(0, 0, 0, 0.55)');
      radialGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0.95)');
      ctx.fillStyle = radialGrad;
      ctx.fillRect(0, 0, size, size);

      ctx.restore();
    } else {
      // Fallback: Elegant abstract dark crimson/charcoal generative disc surface
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
      ctx.arc(cx, cy, dataInnerR, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.clip();

      const grad = ctx.createLinearGradient(0, 0, size, size);
      grad.addColorStop(0.0, '#1c050b');
      grad.addColorStop(0.35, '#400918');
      grad.addColorStop(0.7, '#0b0a0e');
      grad.addColorStop(1.0, '#17060c');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);

      // Fine concentric rings
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      for (let r = dataInnerR + 20; r < outerR - 10; r += 8) {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 3. Concentric Optical Data Grooves
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
    ctx.lineWidth = 1;
    for (let r = dataInnerR + 8; r < outerR - 4; r += 4) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    // 4. Printed Surface Typography (Screen-printed directly onto disc face)
    ctx.save();
    ctx.fillStyle = 'rgba(240, 240, 245, 0.88)';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 6;
    ctx.font = `600 ${Math.round(size * 0.024)}px 'Space Grotesk', sans-serif`;
    ctx.textBaseline = 'middle';

    // Artist name printed on the left of the spindle
    const artistText = (track?.artist || 'TAME IMPALA').toUpperCase();
    ctx.textAlign = 'right';
    ctx.fillText(artistText, cx - size * 0.22, cy);

    // Track title printed on the right of the spindle
    const titleText = (track?.title || 'LET IT HAPPEN').toUpperCase();
    ctx.textAlign = 'left';
    ctx.fillText(titleText, cx + size * 0.22, cy);

    // Small technical catalog label at bottom of disc
    ctx.fillStyle = 'rgba(220, 220, 230, 0.6)';
    ctx.font = `500 ${Math.round(size * 0.015)}px 'Space Grotesk', sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('COMPACT DISC DIGITAL AUDIO', cx, cy + size * 0.32);
    ctx.fillText('DREAMSCAPE STEREO OPTICAL MEDIA', cx, cy + size * 0.35);

    // Crosshairs on disc face
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1;
    // Top crosshair
    ctx.beginPath();
    ctx.moveTo(cx, cy - size * 0.38);
    ctx.lineTo(cx, cy - size * 0.34);
    ctx.moveTo(cx - size * 0.02, cy - size * 0.36);
    ctx.lineTo(cx + size * 0.02, cy - size * 0.36);
    ctx.stroke();

    ctx.restore();

    // 5. Center Hub & Mirror Clamp Zone (dataInnerR down to hubInnerR)
    ctx.save();
    // Clear plastic / mirror hub transition
    const hubGrad = ctx.createRadialGradient(cx, cy, hubInnerR, cx, cy, dataInnerR);
    hubGrad.addColorStop(0.0, 'rgba(40, 42, 50, 0.95)');
    hubGrad.addColorStop(0.2, 'rgba(180, 185, 200, 0.85)'); // Metallic mirror ring
    hubGrad.addColorStop(0.28, 'rgba(100, 105, 120, 0.9)');
    hubGrad.addColorStop(0.35, 'rgba(220, 225, 235, 0.7)'); // Bright optical highlight ring
    hubGrad.addColorStop(0.5, 'rgba(30, 32, 40, 0.85)');
    hubGrad.addColorStop(0.85, 'rgba(15, 16, 20, 0.92)');
    hubGrad.addColorStop(1.0, 'rgba(8, 8, 10, 0.98)');

    ctx.beginPath();
    ctx.arc(cx, cy, dataInnerR, 0, Math.PI * 2);
    ctx.arc(cx, cy, hubInnerR, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.fillStyle = hubGrad;
    ctx.fill();

    // Concentric micro-ridges on hub clamp
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, hubOuterR, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.beginPath();
    ctx.arc(cx, cy, (hubOuterR + hubInnerR) * 0.5, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();

    // 6. Central Spindle Aperture (Transparent Center Hole)
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(cx, cy, centerHoleR, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Inner edge bevel ring around center hole
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, centerHoleR + 1.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Outer edge bevel ring around disc
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx, cy, outerR - 1.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  };

  // Check if we have an image URL
  const imgUrl = track?.discArt || track?.artwork || track?.coverArt;
  if (imgUrl) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      renderCompositedDisc(img);
      canvas._isReady = true;
      if (canvas._onReady) canvas._onReady();
    };
    img.onerror = () => {
      renderCompositedDisc(null);
      canvas._isReady = true;
      if (canvas._onReady) canvas._onReady();
    };
    img.src = imgUrl;
  } else {
    renderCompositedDisc(null);
    canvas._isReady = true;
  }

  textureCache.set(cacheKey, canvas);
  return canvas;
}
