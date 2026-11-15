/**
 * DREAMSCAPE 2.0 — Transition Library
 * Handles cinematic entry and exit transitions for words based on musical energy and personality.
 */

export const TRANSITION_TYPES = [
  'soft_emergence',
  'cinematic_focus_pull',
  'scale_expansion',
  'directional_drift',
  'dissolve',
  'motion_blur_displacement',
  'mask_reveal',
  'sudden_cut',
  'depth_swoop',
  'letter_by_letter',
  'fade_to_darkness',
];

// Easing equations
const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3);
const easeOutQuart = (x) => 1 - Math.pow(1 - x, 4);
const easeOutBack = (x) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};
const easeInOutSine = (x) => -(Math.cos(Math.PI * x) - 1) / 2;

/**
 * Calculates transition state given progress (0.0 to 1.0).
 */
export function evaluateTransition(type = 'cinematic_focus_pull', progress = 0, isEntry = true) {
  const p = Math.max(0, Math.min(1, progress));

  switch (type) {
    case 'cinematic_focus_pull': {
      // Starts blurred and drifts into tack-sharp focus
      const t = easeOutCubic(p);
      const blur = isEntry ? (1 - t) * 22 : t * 24;
      const opacity = isEntry ? t : (1 - t);
      const scale = isEntry ? 0.88 + t * 0.12 : 1.0 + t * 0.08;
      return { opacity, blur, scale, dispX: 0, dispY: 0, clip: 1.0, glyphRatio: 1.0 };
    }

    case 'scale_expansion': {
      // Explodes or breathes out with slight spring recoil
      const t = easeOutBack(p);
      const opacity = isEntry ? Math.min(1, p * 2.2) : Math.max(0, 1 - p * 1.5);
      const scale = isEntry ? Math.max(0.01, t) : 1.0 + p * 0.4;
      const blur = isEntry ? (1 - p) * 10 : p * 14;
      return { opacity, blur, scale, dispX: 0, dispY: 0, clip: 1.0, glyphRatio: 1.0 };
    }

    case 'directional_drift': {
      // Drifts in from an asymmetric angle
      const t = easeOutQuart(p);
      const dispX = isEntry ? (1 - t) * 60 : -t * 60;
      const dispY = isEntry ? (1 - t) * 20 : -t * 20;
      const opacity = isEntry ? t : (1 - t);
      const blur = (1 - t) * 6;
      return { opacity, blur, scale: 1.0, dispX, dispY, clip: 1.0, glyphRatio: 1.0 };
    }

    case 'sudden_cut': {
      // Instantaneous stark cut on snare or kick
      const opacity = isEntry ? (p >= 0.05 ? 1.0 : 0.0) : (p >= 0.95 ? 0.0 : 1.0);
      const scale = isEntry ? (p < 0.2 ? 1.15 : 1.0) : 1.0;
      return { opacity, blur: 0, scale, dispX: 0, dispY: 0, clip: 1.0, glyphRatio: 1.0 };
    }

    case 'motion_blur_displacement': {
      // High-speed streak
      const t = easeOutQuart(p);
      const dispX = isEntry ? (1 - t) * 120 : t * 120;
      const blur = isEntry ? (1 - t) * 16 : t * 18;
      const opacity = isEntry ? t : (1 - t);
      return { opacity, blur, scale: 1.0, dispX, dispY: 0, clip: 1.0, glyphRatio: 1.0 };
    }

    case 'mask_reveal': {
      // Architectural wipe/reveal
      const t = easeInOutSine(p);
      const clip = isEntry ? t : (1 - t);
      return { opacity: 1.0, blur: 0, scale: 1.0, dispX: 0, dispY: 0, clip, glyphRatio: 1.0 };
    }

    case 'letter_by_letter': {
      // Progressive glyph reveal
      const glyphRatio = isEntry ? p : 1.0;
      const opacity = isEntry ? 1.0 : (1 - p);
      return { opacity, blur: 0, scale: 1.0, dispX: 0, dispY: 0, clip: 1.0, glyphRatio };
    }

    case 'depth_swoop': {
      // Swoops in from deep camera space
      const t = easeOutCubic(p);
      const scale = isEntry ? 0.2 + t * 0.8 : 1.0 + t * 1.5;
      const blur = isEntry ? (1 - t) * 20 : t * 25;
      const opacity = isEntry ? t : (1 - t);
      return { opacity, blur, scale, dispX: 0, dispY: 0, clip: 1.0, glyphRatio: 1.0 };
    }

    case 'soft_emergence':
    case 'dissolve':
    default: {
      // Gentle atmospheric dissolve
      const t = easeInOutSine(p);
      const opacity = isEntry ? t : (1 - t);
      const blur = isEntry ? (1 - t) * 8 : t * 10;
      return { opacity, blur, scale: 1.0, dispX: 0, dispY: 0, clip: 1.0, glyphRatio: 1.0 };
    }
  }
}
