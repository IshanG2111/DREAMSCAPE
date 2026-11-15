/**
 * DREAMSCAPE 2.0 — Cinematic 2.5D Camera Rig
 * Spring-damped trajectory, look-ahead anticipation, depth-of-field focus calculation.
 */

export class CameraRig {
  constructor() {
    this.fov = 680;
    this.pos = { x: 0, y: 0, z: 550 };
    this.targetPos = { x: 0, y: 0, z: 550 };
    this.vel = { x: 0, y: 0, z: 0 };

    this.rot = { x: 0, y: 0, z: 0 };
    this.targetRot = { x: 0, y: 0, z: 0 };

    this.focalDistance = 500;
    this.targetFocal = 500;

    this.springK = 0.055;
    this.damping = 0.80;

    this.driftSeed = Math.random() * 100;
  }

  setTarget(heroNode, nextNode, personality = 'DREAM', lookAhead = 0.3) {
    if (!heroNode) return;

    // Follow the hero node closely so it remains beautifully centered
    let tx = heroNode.x * 0.85;
    let ty = heroNode.y * 0.85;
    let tz = 550 - (heroNode.z || 0) * 0.4;

    // Gentle look-ahead towards the next word
    if (nextNode) {
      tx += (nextNode.x - heroNode.x) * lookAhead * 0.2;
      ty += (nextNode.y - heroNode.y) * lookAhead * 0.2;
    }

    this.targetPos.x = tx;
    this.targetPos.y = ty;
    this.targetPos.z = tz;
    this.targetFocal = 550 - (heroNode.z || 0);

    this.targetRot.z = (tx / 400) * -0.02;
    this.targetRot.y = (tx / 400) * 0.03;
  }

  update(dt = 0.016, elapsed = 0, audioData = {}, driftScale = 1.0) {
    // Subtle organic floating drift
    const driftX = Math.sin(elapsed * 0.35 + this.driftSeed) * 8 * driftScale;
    const driftY = Math.cos(elapsed * 0.28 + this.driftSeed * 1.3) * 6 * driftScale;
    const bassShock = (audioData.beatPulse || 0) * 6.0;

    const curTargetX = this.targetPos.x + driftX;
    const curTargetY = this.targetPos.y + driftY;
    const curTargetZ = this.targetPos.z - bassShock;

    // Spring physics update
    const ax = (curTargetX - this.pos.x) * this.springK;
    const ay = (curTargetY - this.pos.y) * this.springK;
    const az = (curTargetZ - this.pos.z) * (this.springK * 0.7);

    this.vel.x = (this.vel.x + ax) * this.damping;
    this.vel.y = (this.vel.y + ay) * this.damping;
    this.vel.z = (this.vel.z + az) * this.damping;

    this.pos.x += this.vel.x;
    this.pos.y += this.vel.y;
    this.pos.z += this.vel.z;

    this.focalDistance += (this.targetFocal - this.focalDistance) * 0.1;
    this.rot.z += (this.targetRot.z - this.rot.z) * 0.06;
    this.rot.y += (this.targetRot.y - this.rot.y) * 0.06;
  }

  /**
   * Projects a 3D world coordinate (wx, wy, wz) into 2D screen coordinates and calculates Depth of Field blur.
   */
  project(wx, wy, wz, screenW, screenH, dofStrength = 16.0) {
    const cx = screenW * 0.5;
    const cy = screenH * 0.5;

    const dx = wx - this.pos.x;
    const dy = wy - this.pos.y;
    const dz = this.pos.z - wz;

    if (dz <= 15) {
      return { visible: false, screenX: 0, screenY: 0, scale: 0, blur: 25, depthAlpha: 0, dz };
    }

    const factor = this.fov / dz;
    const screenX = cx + dx * factor;
    const screenY = cy + dy * factor;

    // Depth-of-Field
    const focusError = Math.abs(dz - this.focalDistance);
    const blur = Math.min(22.0, (focusError / dz) * dofStrength * 2.2);

    // Depth alpha modulation (clear minimum so words are always discernible)
    const depthAlpha = Math.max(0.35, Math.min(1.0, 1.0 - (focusError / 650)));

    return {
      visible: true,
      screenX,
      screenY,
      factor,
      blur,
      depthAlpha,
      dz,
    };
  }
}
