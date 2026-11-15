import { PERSONALITY_PRESETS } from './personalityPresets';

/**
 * Fast deterministic string hashing for repeatable seeds.
 */
function hashString(str = '') {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return (hash >>> 0);
}

/**
 * Seeded pseudo-random number generator (Mulberry32).
 */
export function createSeededRandom(seed) {
  let s = seed;
  return function () {
    s |= 0;
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Classifies a track into a blended personality profile based on metadata and audio reactivity.
 */
export function classifyTrackPersonality(track = {}, audioFeatures = {}) {
  const title = (track.title || '').toLowerCase();
  const artist = (track.artist || '').toLowerCase();
  const album = (track.album || '').toLowerCase();
  const combinedMeta = `${title} ${artist} ${album}`;
  const trackSeed = hashString(combinedMeta || 'dreamscape_seed');
  const rng = createSeededRandom(trackSeed);

  // Keyword heuristic matching
  let weights = {
    DREAM: 0.15,
    PULSE: 0.10,
    NOIR: 0.15,
    EDITORIAL: 0.10,
    EUPHORIA: 0.10,
    VOID: 0.10,
  };

  // Genre & metadata heuristics
  if (/(ambient|space|echo|night|dream|sleep|floating|cloud|star|wave)/i.test(combinedMeta)) {
    weights.DREAM += 0.55;
    weights.VOID += 0.25;
  }
  if (/(dance|techno|synth|electronic|club|remix|house|beat|bass|future|neon)/i.test(combinedMeta)) {
    weights.PULSE += 0.65;
    weights.EDITORIAL += 0.20;
  }
  if (/(sad|cry|hurt|dark|alone|ghost|rain|melanchol|shadow|grey|death|tear)/i.test(combinedMeta)) {
    weights.NOIR += 0.60;
    weights.VOID += 0.20;
  }
  if (/(rap|hip-hop|trap|flow|money|hustle|baby|drill|rich|kendrick|drake|smoke)/i.test(combinedMeta)) {
    weights.EDITORIAL += 0.65;
    weights.PULSE += 0.25;
  }
  if (/(sun|happy|summer|love|dance|euphoria|gold|shine|bright|glow|pop)/i.test(combinedMeta)) {
    weights.EUPHORIA += 0.60;
    weights.PULSE += 0.20;
  }
  if (/(instrumental|interlude|outro|intro|minimal|quiet|piano|solo)/i.test(combinedMeta)) {
    weights.VOID += 0.65;
    weights.DREAM += 0.20;
  }

  // Audio feature adjustments
  const rms = audioFeatures.rms || audioFeatures.energy || 0.4;
  const bass = audioFeatures.bass || 0.3;
  const treble = audioFeatures.treble || 0.3;

  if (rms > 0.65 || bass > 0.60) {
    weights.PULSE += (rms + bass) * 0.4;
    weights.EDITORIAL += (rms) * 0.3;
  } else if (rms < 0.25) {
    weights.VOID += (0.4 - rms) * 0.6;
    weights.DREAM += 0.2;
  }

  if (treble > 0.6) {
    weights.EUPHORIA += treble * 0.3;
  }

  // Normalize weights so sum = 1.0
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  for (const k in weights) {
    weights[k] = weights[k] / total;
  }

  // Identify dominant personality
  let dominantId = 'DREAM';
  let maxWeight = 0;
  for (const [k, v] of Object.entries(weights)) {
    if (v > maxWeight) {
      maxWeight = v;
      dominantId = k;
    }
  }

  // Blend dominant preset with secondary traits
  const primaryPreset = PERSONALITY_PRESETS[dominantId];

  return {
    trackSeed,
    dominantId,
    dominantPreset: primaryPreset,
    weights,
    rng,
  };
}

/**
 * Interpolates two color arrays [r, g, b]
 */
function lerpColor(c1, c2, t) {
  return [
    c1[0] + (c2[0] - c1[0]) * t,
    c1[1] + (c2[1] - c1[1]) * t,
    c1[2] + (c2[2] - c1[2]) * t,
  ];
}

/**
 * Returns dynamic blended parameters based on live weights and energy.
 */
export function getBlendedProfile(profile, liveAudio = {}) {
  const { weights, dominantPreset } = profile;
  const energy = liveAudio.beatPulse || 0;
  const bass = liveAudio.bass || 0.3;

  // Blend background and glow colors based on weights
  let bg = [0, 0, 0];
  let glowPrim = [0, 0, 0];
  let glowSec = [0, 0, 0];

  for (const [id, weight] of Object.entries(weights)) {
    const p = PERSONALITY_PRESETS[id];
    bg[0] += p.palette.background[0] * weight;
    bg[1] += p.palette.background[1] * weight;
    bg[2] += p.palette.background[2] * weight;

    glowPrim[0] += p.palette.primaryGlow[0] * weight;
    glowPrim[1] += p.palette.primaryGlow[1] * weight;
    glowPrim[2] += p.palette.primaryGlow[2] * weight;

    glowSec[0] += p.palette.secondaryGlow[0] * weight;
    glowSec[1] += p.palette.secondaryGlow[1] * weight;
    glowSec[2] += p.palette.secondaryGlow[2] * weight;
  }

  // Add subtle live energy bloom to glow
  glowPrim = [
    Math.min(1.0, glowPrim[0] * (1.0 + energy * 0.3)),
    Math.min(1.0, glowPrim[1] * (1.0 + energy * 0.3)),
    Math.min(1.0, glowPrim[2] * (1.0 + energy * 0.3)),
  ];

  return {
    dominantPreset,
    dominantId: profile.dominantId,
    weights,
    background: bg,
    primaryGlow: glowPrim,
    secondaryGlow: glowSec,
    grainIntensity: dominantPreset.environment.grainIntensity * (1.0 + energy * 0.4),
    dustSpeed: dominantPreset.environment.dustSpeed * (1.0 + bass * 0.5),
    dofBlurStrength: dominantPreset.camera.dofBlurStrength,
    speed: dominantPreset.camera.speed * (1.0 + energy * 0.6),
    fontFamily: dominantPreset.typography.fontFamily,
    fontStyle: dominantPreset.typography.fontStyle,
    fontWeight: dominantPreset.typography.fontWeight,
    letterSpacing: dominantPreset.typography.letterSpacing,
  };
}
