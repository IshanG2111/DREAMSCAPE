/**
 * DREAMSCAPE — THE LIVING ALBUM
 * Curated Demo Tracks Collection
 * 
 * Provides 5 complete, beautifully styled demo tracks with custom album arts,
 * circular disc textures, ASCII silhouette mappings, word-level synchronized lyrics,
 * and distinct visual personalities.
 */

export const DEMO_TRACKS = [
  {
    id: 'let-it-happen',
    index: '01',
    title: 'LET IT HAPPEN',
    artist: 'TAME IMPALA',
    album: 'CURRENTS',
    year: '2015',
    genre: 'PSYCHEDELIC ROCK',
    durationMs: 467000,
    bpm: 125,
    coverArt: '/assets/demo/art_let_it_happen.png',
    discArt: '/assets/demo/disc_let_it_happen.png',
    thumbnail: '/assets/demo/thumb_let_it_happen.png',
    silhouetteMask: '/assets/demo/mask_profile.png',
    hasNegativeStrip: true,
    personality: {
      id: 'CRIMSON_CURRENTS',
      name: 'Currents / Psychedelic Crimson',
      accentColor: '#C51E43',
      secondaryColor: '#7E122D',
      ambientGlow: [0.77, 0.12, 0.26],
      backgroundColor: '#050506',
      typographyFont: "'Cormorant Garamond', Georgia, serif",
      asciiDensity: 0.85,
      asciiContrast: 1.6,
      discReflectivity: 0.95,
      waveIntensity: 1.2,
    },
    lines: [
      {
        startMs: 0,
        endMs: 7000,
        words: [
          { text: "It's", startMs: 500, endMs: 1200 },
          { text: "always", startMs: 1200, endMs: 2200 },
          { text: "around", startMs: 2200, endMs: 3400 },
          { text: "me,", startMs: 3400, endMs: 4400 },
          { text: "all", startMs: 4400, endMs: 5400 },
          { text: "this", startMs: 5400, endMs: 6200 },
          { text: "noise", startMs: 6200, endMs: 7000 }
        ]
      },
      {
        startMs: 7200,
        endMs: 14000,
        words: [
          { text: "Nothing", startMs: 7400, endMs: 8400 },
          { text: "seems", startMs: 8400, endMs: 9400 },
          { text: "as", startMs: 9400, endMs: 10200 },
          { text: "big", startMs: 10200, endMs: 11200 },
          { text: "as", startMs: 11200, endMs: 12000 },
          { text: "the", startMs: 12000, endMs: 12800 },
          { text: "'cause", startMs: 12800, endMs: 14000 }
        ]
      },
      {
        // Reference Hero Line: "and it's coming on"
        startMs: 14200,
        endMs: 22500,
        words: [
          { text: "and", startMs: 14400, endMs: 15600 },
          { text: "it's", startMs: 15600, endMs: 16800 },
          { text: "coming", startMs: 16800, endMs: 19800 },
          { text: "on", startMs: 19800, endMs: 22500 }
        ]
      },
      {
        startMs: 22800,
        endMs: 29000,
        words: [
          { text: "Let", startMs: 23000, endMs: 23800 },
          { text: "it", startMs: 23800, endMs: 24400 },
          { text: "happen,", startMs: 24400, endMs: 25800 },
          { text: "babe", startMs: 25800, endMs: 27200 },
          { text: "see", startMs: 27200, endMs: 29000 }
        ]
      },
      {
        startMs: 29200,
        endMs: 36000,
        words: [
          { text: "It's", startMs: 29400, endMs: 30200 },
          { text: "gonna", startMs: 30200, endMs: 31200 },
          { text: "feel", startMs: 31200, endMs: 32600 },
          { text: "so", startMs: 32600, endMs: 33800 },
          { text: "good", startMs: 33800, endMs: 36000 }
        ]
      },
      {
        startMs: 36200,
        endMs: 44000,
        words: [
          { text: "Just", startMs: 36400, endMs: 37400 },
          { text: "let", startMs: 37400, endMs: 38400 },
          { text: "it", startMs: 38400, endMs: 39200 },
          { text: "happen,", startMs: 39200, endMs: 40800 },
          { text: "let", startMs: 40800, endMs: 41800 },
          { text: "it", startMs: 41800, endMs: 42600 },
          { text: "happen", startMs: 42600, endMs: 44000 }
        ]
      }
    ]
  },

  {
    id: 'wavy',
    index: '02',
    title: 'WAVY',
    artist: 'KARAN AUJLA · JAY TRAK',
    album: 'FOUR YOU',
    year: '2023',
    genre: 'CONTEMPORARY HIP-HOP',
    durationMs: 198000,
    bpm: 98,
    coverArt: '/assets/demo/art_wavy.png',
    discArt: null,
    thumbnail: null,
    silhouetteMask: '/assets/demo/mask_profile.png',
    hasNegativeStrip: false,
    personality: {
      id: 'NOIR_METALLIC',
      name: 'Wavy / Obsidian Chrome',
      accentColor: '#E11D48',
      secondaryColor: '#475569',
      ambientGlow: [0.88, 0.11, 0.28],
      backgroundColor: '#040405',
      typographyFont: "'Space Grotesk', sans-serif",
      asciiDensity: 0.9,
      asciiContrast: 1.8,
      discReflectivity: 0.98,
      waveIntensity: 1.4,
    },
    lines: [
      {
        startMs: 0,
        endMs: 6500,
        words: [
          { text: "Yeah", startMs: 400, endMs: 1200 },
          { text: "they", startMs: 1200, endMs: 2000 },
          { text: "know", startMs: 2000, endMs: 3200 },
          { text: "the", startMs: 3200, endMs: 4200 },
          { text: "signature", startMs: 4200, endMs: 6500 }
        ]
      },
      {
        startMs: 6800,
        endMs: 13000,
        words: [
          { text: "Rolling", startMs: 7000, endMs: 8200 },
          { text: "with", startMs: 8200, endMs: 9000 },
          { text: "the", startMs: 9000, endMs: 9800 },
          { text: "frequency", startMs: 9800, endMs: 11400 },
          { text: "tonight", startMs: 11400, endMs: 13000 }
        ]
      },
      {
        startMs: 13200,
        endMs: 20000,
        words: [
          { text: "Keep", startMs: 13400, endMs: 14400 },
          { text: "it", startMs: 14400, endMs: 15200 },
          { text: "wavy", startMs: 15200, endMs: 17600 },
          { text: "through", startMs: 17600, endMs: 18800 },
          { text: "motion", startMs: 18800, endMs: 20000 }
        ]
      },
      {
        startMs: 20200,
        endMs: 27000,
        words: [
          { text: "Never", startMs: 20400, endMs: 21600 },
          { text: "break", startMs: 21600, endMs: 22800 },
          { text: "the", startMs: 22800, endMs: 23600 },
          { text: "kinetic", startMs: 23600, endMs: 25200 },
          { text: "flow", startMs: 25200, endMs: 27000 }
        ]
      }
    ]
  },

  {
    id: 'space-song',
    index: '03',
    title: 'SPACE SONG',
    artist: 'BEACH HOUSE',
    album: 'DEPRESSION CHERRY',
    year: '2015',
    genre: 'DREAM POP',
    durationMs: 320000,
    bpm: 74,
    coverArt: '/assets/demo/art_space_song.png',
    discArt: null,
    thumbnail: null,
    silhouetteMask: '/assets/demo/mask_profile.png',
    hasNegativeStrip: true,
    personality: {
      id: 'VELVET_DREAM',
      name: 'Depression Cherry / Velvet Night',
      accentColor: '#9F1239',
      secondaryColor: '#BE185D',
      ambientGlow: [0.62, 0.07, 0.22],
      backgroundColor: '#060406',
      typographyFont: "'Cormorant Garamond', Georgia, serif",
      asciiDensity: 0.75,
      asciiContrast: 1.4,
      discReflectivity: 0.90,
      waveIntensity: 0.8,
    },
    lines: [
      {
        startMs: 0,
        endMs: 7000,
        words: [
          { text: "It", startMs: 500, endMs: 1200 },
          { text: "was", startMs: 1200, endMs: 2200 },
          { text: "late", startMs: 2200, endMs: 3600 },
          { text: "at", startMs: 3600, endMs: 4800 },
          { text: "night", startMs: 4800, endMs: 7000 }
        ]
      },
      {
        startMs: 7200,
        endMs: 14500,
        words: [
          { text: "You", startMs: 7500, endMs: 8800 },
          { text: "held", startMs: 8800, endMs: 10400 },
          { text: "on", startMs: 10400, endMs: 12000 },
          { text: "tight", startMs: 12000, endMs: 14500 }
        ]
      },
      {
        startMs: 14800,
        endMs: 22000,
        words: [
          { text: "From", startMs: 15000, endMs: 16200 },
          { text: "an", startMs: 16200, endMs: 17200 },
          { text: "empty", startMs: 17200, endMs: 19000 },
          { text: "seat", startMs: 19000, endMs: 22000 }
        ]
      },
      {
        startMs: 22200,
        endMs: 30000,
        words: [
          { text: "Fall", startMs: 22500, endMs: 24200 },
          { text: "back", startMs: 24200, endMs: 26000 },
          { text: "into", startMs: 26000, endMs: 27800 },
          { text: "place", startMs: 27800, endMs: 30000 }
        ]
      }
    ]
  },

  {
    id: 'veridis-quo',
    index: '04',
    title: 'VERIDIS QUO',
    artist: 'DAFT PUNK',
    album: 'DISCOVERY',
    year: '2001',
    genre: 'ELECTRONIC / FRENCH HOUSE',
    durationMs: 345000,
    bpm: 106,
    coverArt: '/assets/demo/art_discovery.png',
    discArt: null,
    thumbnail: null,
    silhouetteMask: '/assets/demo/mask_profile.png',
    hasNegativeStrip: false,
    personality: {
      id: 'ELECTRO_CHROME',
      name: 'Discovery / Prismatic Chrome',
      accentColor: '#0284C7',
      secondaryColor: '#C51E43',
      ambientGlow: [0.01, 0.52, 0.78],
      backgroundColor: '#050608',
      typographyFont: "'Syne', sans-serif",
      asciiDensity: 0.95,
      asciiContrast: 1.7,
      discReflectivity: 1.0,
      waveIntensity: 1.6,
    },
    lines: [
      {
        startMs: 0,
        endMs: 7000,
        words: [
          { text: "Harmonic", startMs: 600, endMs: 2200 },
          { text: "frequencies", startMs: 2200, endMs: 4400 },
          { text: "align", startMs: 4400, endMs: 7000 }
        ]
      },
      {
        startMs: 7200,
        endMs: 14500,
        words: [
          { text: "Across", startMs: 7600, endMs: 9200 },
          { text: "the", startMs: 9200, endMs: 10200 },
          { text: "infinite", startMs: 10200, endMs: 12200 },
          { text: "horizon", startMs: 12200, endMs: 14500 }
        ]
      },
      {
        startMs: 14800,
        endMs: 22000,
        words: [
          { text: "Digital", startMs: 15200, endMs: 17000 },
          { text: "memories", startMs: 17000, endMs: 19400 },
          { text: "remain", startMs: 19400, endMs: 22000 }
        ]
      }
    ]
  },

  {
    id: 'weird-fishes',
    index: '05',
    title: 'WEIRD FISHES / ARPEGGI',
    artist: 'RADIOHEAD',
    album: 'IN RAINBOWS',
    year: '2007',
    genre: 'ART ROCK / AMBIENT',
    durationMs: 318000,
    bpm: 110,
    coverArt: '/assets/demo/art_in_rainbows.png',
    discArt: null,
    thumbnail: null,
    silhouetteMask: '/assets/demo/mask_profile.png',
    hasNegativeStrip: true,
    personality: {
      id: 'ORGANIC_BLOOM',
      name: 'In Rainbows / Spectral Abyss',
      accentColor: '#D97706',
      secondaryColor: '#C51E43',
      ambientGlow: [0.85, 0.47, 0.02],
      backgroundColor: '#060505',
      typographyFont: "'Playfair Display', Georgia, serif",
      asciiDensity: 0.82,
      asciiContrast: 1.5,
      discReflectivity: 0.92,
      waveIntensity: 1.1,
    },
    lines: [
      {
        startMs: 0,
        endMs: 7000,
        words: [
          { text: "In", startMs: 600, endMs: 1400 },
          { text: "the", startMs: 1400, endMs: 2200 },
          { text: "deepest", startMs: 2200, endMs: 4400 },
          { text: "ocean", startMs: 4400, endMs: 7000 }
        ]
      },
      {
        startMs: 7200,
        endMs: 14500,
        words: [
          { text: "The", startMs: 7500, endMs: 8600 },
          { text: "bottom", startMs: 8600, endMs: 10400 },
          { text: "of", startMs: 10400, endMs: 11400 },
          { text: "the", startMs: 11400, endMs: 12400 },
          { text: "sea", startMs: 12400, endMs: 14500 }
        ]
      },
      {
        startMs: 14800,
        endMs: 22000,
        words: [
          { text: "Your", startMs: 15000, endMs: 16400 },
          { text: "eyes,", startMs: 16400, endMs: 18200 },
          { text: "they", startMs: 18200, endMs: 19600 },
          { text: "turn", startMs: 19600, endMs: 22000 }
        ]
      },
      {
        startMs: 22200,
        endMs: 30000,
        words: [
          { text: "Why", startMs: 22500, endMs: 24000 },
          { text: "should", startMs: 24000, endMs: 25600 },
          { text: "I", startMs: 25600, endMs: 26800 },
          { text: "stay", startMs: 26800, endMs: 30000 }
        ]
      }
    ]
  }
];
