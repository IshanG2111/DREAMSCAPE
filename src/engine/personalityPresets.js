/**
 * DREAMSCAPE 2.0 — Visual Personality Presets
 * Defines the 6 core visual aesthetics that the adaptive direction engine blends.
 */

export const PERSONALITY_PRESETS = {
  DREAM: {
    id: 'DREAM',
    name: 'Dream / Atmospheric',
    description: 'Deep navy & teal spatial environment, floating words, weightless drift, soft focus.',
    palette: {
      background: [0.008, 0.015, 0.035], // Deep oceanic midnight
      primaryGlow: [0.22, 0.74, 0.95],   // Luminous Cyan #38bdf8
      secondaryGlow: [0.18, 0.83, 0.75], // Diffuse Teal #2dd4bf
      accentGlow: [0.38, 0.65, 0.98],    // Celestial Blue #60a5fa
      textHero: '#f0f9ff',
      textSupporting: '#93c5fd',
      textGhost: 'rgba(56, 189, 248, 0.35)',
    },
    typography: {
      fontFamily: "'Cormorant Garamond', Georgia, serif",
      fontStyle: 'italic',
      fontWeight: '400',
      letterSpacing: '0.08em',
      heroScaleRange: [1.6, 2.8],
      supportingScaleRange: [0.75, 1.1],
      ghostScaleRange: [0.5, 0.8],
    },
    camera: {
      speed: 0.35,
      driftAmount: 45,
      dofBlurStrength: 18.0,
      zoomSensitivity: 0.25,
      lookAheadFactor: 0.4,
    },
    transitions: {
      preferred: ['cinematic_focus_pull', 'soft_emergence', 'directional_drift'],
      durationMs: 1400,
      staggerMs: 180,
    },
    environment: {
      grainIntensity: 0.12,
      dustCount: 45,
      dustSpeed: 0.2,
      lightLeakIntensity: 0.45,
      chromaticAberration: 0.002,
      fogDensity: 0.65,
    },
  },

  PULSE: {
    id: 'PULSE',
    name: 'Pulse / Electronic',
    description: 'High contrast, sudden scale impacts, rhythmic cuts, beat-reactive displacement.',
    palette: {
      background: [0.015, 0.008, 0.025], // Obsidian violet
      primaryGlow: [0.96, 0.25, 0.42],   // Electric Pink #f43f5e
      secondaryGlow: [0.02, 0.71, 0.83], // Acid Cyan #06b6d4
      accentGlow: [0.98, 0.75, 0.14],    // Sunburst Amber #fbbf24
      textHero: '#ffffff',
      textSupporting: '#fbcfe8',
      textGhost: 'rgba(244, 63, 94, 0.4)',
    },
    typography: {
      fontFamily: "'Bebas Neue', Impact, sans-serif",
      fontStyle: 'normal',
      fontWeight: '700',
      letterSpacing: '0.04em',
      heroScaleRange: [2.4, 4.8], // Massive impact
      supportingScaleRange: [0.85, 1.3],
      ghostScaleRange: [0.6, 0.9],
    },
    camera: {
      speed: 1.2,
      driftAmount: 90,
      dofBlurStrength: 12.0,
      zoomSensitivity: 0.75,
      lookAheadFactor: 0.75,
    },
    transitions: {
      preferred: ['sudden_cut', 'scale_expansion', 'motion_blur_displacement'],
      durationMs: 450,
      staggerMs: 90,
    },
    environment: {
      grainIntensity: 0.22,
      dustCount: 25,
      dustSpeed: 0.8,
      lightLeakIntensity: 0.75,
      chromaticAberration: 0.006,
      fogDensity: 0.4,
    },
  },

  NOIR: {
    id: 'NOIR',
    name: 'Noir / Melancholic',
    description: 'Desaturated near-black world, isolated ivory typography, quiet long pauses, analog grain.',
    palette: {
      background: [0.02, 0.02, 0.025],  // Charcoal abyss
      primaryGlow: [0.96, 0.95, 0.92],   // Warm Ivory #f5f5f0
      secondaryGlow: [0.58, 0.64, 0.72], // Muted Slate #94a3b8
      accentGlow: [0.85, 0.47, 0.12],    // Sepia Ember #d97706
      textHero: '#f8fafc',
      textSupporting: '#cbd5e1',
      textGhost: 'rgba(148, 163, 184, 0.25)',
    },
    typography: {
      fontFamily: "'Playfair Display', Georgia, serif",
      fontStyle: 'italic',
      fontWeight: '500',
      letterSpacing: '0.12em',
      heroScaleRange: [1.4, 2.5],
      supportingScaleRange: [0.7, 1.0],
      ghostScaleRange: [0.45, 0.7],
    },
    camera: {
      speed: 0.25,
      driftAmount: 30,
      dofBlurStrength: 22.0,
      zoomSensitivity: 0.2,
      lookAheadFactor: 0.3,
    },
    transitions: {
      preferred: ['cinematic_focus_pull', 'dissolve', 'fade_to_darkness'],
      durationMs: 1600,
      staggerMs: 250,
    },
    environment: {
      grainIntensity: 0.28, // Heavy analog grain
      dustCount: 60,
      dustSpeed: 0.15,
      lightLeakIntensity: 0.25,
      chromaticAberration: 0.0015,
      fogDensity: 0.75,
    },
  },

  EDITORIAL: {
    id: 'EDITORIAL',
    name: 'Editorial / Experimental',
    description: 'Asymmetric layouts, dramatic scale contrast, overlapping or cropped text, stark cuts.',
    palette: {
      background: [0.012, 0.014, 0.018], // Graphite
      primaryGlow: [0.95, 0.98, 1.0],     // Stark White
      secondaryGlow: [0.64, 0.90, 0.21],  // Acid Lime #a3e635
      accentGlow: [0.94, 0.27, 0.27],     // Sharp Crimson #ef4444
      textHero: '#ffffff',
      textSupporting: '#e2e8f0',
      textGhost: 'rgba(226, 232, 240, 0.3)',
    },
    typography: {
      fontFamily: "'Syne', sans-serif",
      fontStyle: 'normal',
      fontWeight: '800',
      letterSpacing: '-0.02em',
      heroScaleRange: [2.8, 5.2], // Extreme dominating scale
      supportingScaleRange: [0.65, 1.1],
      ghostScaleRange: [0.4, 0.7],
    },
    camera: {
      speed: 0.95,
      driftAmount: 80,
      dofBlurStrength: 10.0,
      zoomSensitivity: 0.6,
      lookAheadFactor: 0.8,
    },
    transitions: {
      preferred: ['mask_reveal', 'sudden_cut', 'letter_by_letter', 'scale_expansion'],
      durationMs: 600,
      staggerMs: 110,
    },
    environment: {
      grainIntensity: 0.18,
      dustCount: 20,
      dustSpeed: 0.4,
      lightLeakIntensity: 0.5,
      chromaticAberration: 0.004,
      fogDensity: 0.35,
    },
  },

  EUPHORIA: {
    id: 'EUPHORIA',
    name: 'Euphoria / Upbeat',
    description: 'Luminous vibrant highlights, dynamic spatial expansion, rhythmic scaling, fluid motion.',
    palette: {
      background: [0.02, 0.008, 0.028], // Twilight plum
      primaryGlow: [0.98, 0.44, 0.52],   // Coral #fb7185
      secondaryGlow: [0.98, 0.80, 0.08], // Gold #facc15
      accentGlow: [0.75, 0.52, 0.99],    // Vibrant Violet #c084fc
      textHero: '#fff1f2',
      textSupporting: '#fed7aa',
      textGhost: 'rgba(251, 113, 133, 0.35)',
    },
    typography: {
      fontFamily: "'Playfair Display', Georgia, serif",
      fontStyle: 'italic',
      fontWeight: '600',
      letterSpacing: '0.05em',
      heroScaleRange: [2.0, 3.8],
      supportingScaleRange: [0.8, 1.25],
      ghostScaleRange: [0.55, 0.85],
    },
    camera: {
      speed: 0.8,
      driftAmount: 65,
      dofBlurStrength: 15.0,
      zoomSensitivity: 0.5,
      lookAheadFactor: 0.6,
    },
    transitions: {
      preferred: ['scale_expansion', 'directional_drift', 'cinematic_focus_pull'],
      durationMs: 950,
      staggerMs: 140,
    },
    environment: {
      grainIntensity: 0.14,
      dustCount: 50,
      dustSpeed: 0.5,
      lightLeakIntensity: 0.8,
      chromaticAberration: 0.0035,
      fogDensity: 0.55,
    },
  },

  VOID: {
    id: 'VOID',
    name: 'Void / Instrumental',
    description: 'Pitch black environment, vast negative space, sparse single-word emergence, total serenity.',
    palette: {
      background: [0.004, 0.004, 0.006], // Pure void
      primaryGlow: [0.88, 0.91, 0.94],   // Ghost Silver
      secondaryGlow: [0.45, 0.48, 0.55], // Diffuse Steel
      accentGlow: [0.25, 0.28, 0.35],    // Dark Graphite
      textHero: '#f8fafc',
      textSupporting: 'rgba(148, 163, 184, 0.4)',
      textGhost: 'rgba(148, 163, 184, 0.15)',
    },
    typography: {
      fontFamily: "'Inter', -apple-system, sans-serif",
      fontStyle: 'normal',
      fontWeight: '300',
      letterSpacing: '0.24em',
      heroScaleRange: [1.2, 2.0],
      supportingScaleRange: [0.65, 0.9],
      ghostScaleRange: [0.4, 0.6],
    },
    camera: {
      speed: 0.18,
      driftAmount: 20,
      dofBlurStrength: 26.0,
      zoomSensitivity: 0.15,
      lookAheadFactor: 0.2,
    },
    transitions: {
      preferred: ['soft_emergence', 'fade_to_darkness', 'dissolve'],
      durationMs: 2200,
      staggerMs: 350,
    },
    environment: {
      grainIntensity: 0.08,
      dustCount: 15,
      dustSpeed: 0.08,
      lightLeakIntensity: 0.15,
      chromaticAberration: 0.001,
      fogDensity: 0.85,
    },
  },
};
