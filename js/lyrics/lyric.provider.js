/* =========================================================================
   LYRIC PROVIDER (OFFLINE FIRST + LIVELY + BRIDGE + LRCLIB)
   Loads and manages synchronized word-level lyrics across sources.
   Includes embedded demo lyrics for 100% offline, file:// protocol resilience.
   ========================================================================= */

window.SongNode = window.SongNode || {};

(function(exports) {
  // Built-in Demo tracks embedded for 100% offline showcase
  const DEMO_PRESETS = [
    {
      title: "New Person, Same Old Mistakes",
      artist: "Tame Impala",
      album: "Currents",
      durationMs: 363000,
      startOffsetMs: 164200, // Starts at beginning of the constellation phrase "All it's hard to you"
      palettePreset: "currents",
      artwork: "https://upload.wikimedia.org/wikipedia/en/9/9b/Tame_Impala_-_Currents.png",
      path: "lyrics/demo/new-person-same-old-mistakes.json"
    },
    {
      title: "Let It Happen",
      artist: "Tame Impala",
      album: "Currents",
      durationMs: 467000,
      startOffsetMs: 81200, // Cues right at "Let it happen, babe see"
      palettePreset: "currents",
      artwork: "https://upload.wikimedia.org/wikipedia/en/9/9b/Tame_Impala_-_Currents.png",
      path: "lyrics/demo/let-it-happen.json"
    },
    {
      title: "Space Song",
      artist: "Beach House",
      album: "Depression Cherry",
      durationMs: 320000,
      startOffsetMs: 44000, // Cues right at "It was all written on the wall"
      palettePreset: "depression-cherry",
      artwork: "https://upload.wikimedia.org/wikipedia/en/9/91/Beach_House_-_Depression_Cherry.png",
      path: "lyrics/demo/space-song.json"
    }
  ];

  // Embedded Full Demo Lyrics to guarantee instant loading even under strict file:// security
  const EMBEDDED_DEMOS = [
    // 0: New Person, Same Old Mistakes
    {
      version: 1,
      type: "lyrics.loaded",
      timingPrecision: "word",
      title: "New Person, Same Old Mistakes",
      artist: "Tame Impala",
      album: "Currents",
      durationMs: 363000,
      lines: [
        {
          startMs: 14000, endMs: 28000,
          words: [
            { text: "I", startMs: 14000, endMs: 15500 },
            { text: "can", startMs: 15500, endMs: 17000 },
            { text: "just", startMs: 17000, endMs: 18500 },
            { text: "hear", startMs: 18500, endMs: 20000 },
            { text: "them", startMs: 20000, endMs: 22000 },
            { text: "now", startMs: 22000, endMs: 28000 }
          ]
        },
        {
          startMs: 29000, endMs: 42000,
          words: [
            { text: "How", startMs: 29000, endMs: 31000 },
            { text: "could", startMs: 31000, endMs: 33000 },
            { text: "you", startMs: 33000, endMs: 35000 },
            { text: "let", startMs: 35000, endMs: 37000 },
            { text: "us", startMs: 37000, endMs: 39000 },
            { text: "down", startMs: 39000, endMs: 42000 }
          ]
        },
        {
          startMs: 160000, endMs: 164000,
          words: [
            { text: "Feel", startMs: 160000, endMs: 160800 },
            { text: "like", startMs: 160800, endMs: 161400 },
            { text: "a", startMs: 161400, endMs: 161800 },
            { text: "brand", startMs: 161800, endMs: 162600 },
            { text: "new", startMs: 162600, endMs: 163200 },
            { text: "person", startMs: 163200, endMs: 164000 }
          ]
        },
        {
          startMs: 164200, endMs: 172000,
          words: [
            { text: "All", startMs: 164200, endMs: 165600 },
            { text: "it's", startMs: 165600, endMs: 167000 },
            { text: "hard", startMs: 167000, endMs: 168400 },
            { text: "to", startMs: 168400, endMs: 169600 },
            { text: "you", startMs: 169600, endMs: 172000 }
          ]
        },
        {
          startMs: 172400, endMs: 178000,
          words: [
            { text: "Finally", startMs: 172400, endMs: 173900 },
            { text: "taking", startMs: 173900, endMs: 175300 },
            { text: "flight", startMs: 175300, endMs: 178000 }
          ]
        },
        {
          startMs: 178200, endMs: 184500,
          words: [
            { text: "I", startMs: 178200, endMs: 179200 },
            { text: "know", startMs: 179200, endMs: 180400 },
            { text: "it's", startMs: 180400, endMs: 181200 },
            { text: "hard", startMs: 181200, endMs: 182300 },
            { text: "to", startMs: 182300, endMs: 182900 },
            { text: "digest", "startMs": 182900, endMs: 184500 }
          ]
        },
        {
          startMs: 185000, endMs: 191000,
          words: [
            { text: "A", startMs: 185000, endMs: 185600 },
            { text: "new", startMs: 185600, endMs: 186400 },
            { text: "person,", "startMs": 186400, endMs: 187800 },
            { text: "same", "startMs": 187800, endMs: 189000 },
            { text: "old", "startMs": 189000, endMs: 189800 },
            { text: "mistakes", "startMs": 189800, endMs: 191000 }
          ]
        },
        {
          startMs: 192000, endMs: 204000,
          words: [
            { text: "I", startMs: 192000, endMs: 194000 },
            { text: "can", startMs: 194000, endMs: 196000 },
            { text: "feel", "startMs": 196000, endMs: 198000 },
            { text: "it", "startMs": 198000, endMs: 200000 },
            { text: "coming", "startMs": 200000, endMs: 204000 }
          ]
        },
        {
          startMs: 205000, endMs: 220000,
          words: [
            { text: "Going", startMs: 205000, endMs: 208000 },
            { text: "round", startMs: 208000, endMs: 211000 },
            { text: "in", startMs: 211000, endMs: 214000 },
            { text: "circles", "startMs": 214000, endMs: 220000 }
          ]
        }
      ]
    },
    // 1: Let It Happen
    {
      version: 1,
      type: "lyrics.loaded",
      timingPrecision: "word",
      title: "Let It Happen",
      artist: "Tame Impala",
      album: "Currents",
      durationMs: 467000,
      lines: [
        {
          startMs: 74000, endMs: 78000,
          words: [
            { text: "It's", startMs: 74000, endMs: 74500 },
            { text: "always", startMs: 74500, endMs: 75200 },
            { text: "around", startMs: 75200, endMs: 75900 },
            { text: "me,", startMs: 75900, endMs: 76500 },
            { text: "all", startMs: 76500, endMs: 77100 },
            { text: "this", startMs: 77100, endMs: 77500 },
            { text: "noise", startMs: 77500, endMs: 78000 }
          ]
        },
        {
          startMs: 78200, endMs: 81000,
          words: [
            { text: "Nothing", startMs: 78200, endMs: 78800 },
            { text: "seems", startMs: 78800, endMs: 79400 },
            { text: "as", startMs: 79400, endMs: 79700 },
            { text: "big", startMs: 79700, endMs: 80200 },
            { text: "as", startMs: 80200, endMs: 80500 },
            { text: "the", startMs: 80500, endMs: 80700 },
            { text: "'cause", startMs: 80700, endMs: 81000 }
          ]
        },
        {
          startMs: 81200, endMs: 85500,
          words: [
            { text: "Let", startMs: 81200, endMs: 81800 },
            { text: "it", startMs: 81800, endMs: 82200 },
            { text: "happen,", "startMs": 82200, endMs: 83400 },
            { text: "babe", startMs: 83400, endMs: 84300 },
            { text: "see", startMs: 84300, endMs: 85500 }
          ]
        },
        {
          startMs: 85800, endMs: 88200,
          words: [
            { text: "It's", startMs: 85800, endMs: 86200 },
            { text: "gonna", startMs: 86200, endMs: 86700 },
            { text: "feel", startMs: 86700, endMs: 87300 },
            { text: "so", startMs: 87300, endMs: 87700 },
            { text: "good", startMs: 87700, endMs: 88200 }
          ]
        },
        {
          startMs: 88500, endMs: 92000,
          words: [
            { text: "Just", startMs: 88500, endMs: 89000 },
            { text: "let", startMs: 89000, endMs: 89500 },
            { text: "it", startMs: 89500, endMs: 89900 },
            { text: "happen,", "startMs": 89900, endMs: 90800 },
            { text: "let", startMs: 90800, endMs: 91300 },
            { text: "it", startMs: 91300, endMs: 91600 },
            { text: "happen", startMs: 91600, endMs: 92000 }
          ]
        }
      ]
    },
    // 2: Space Song
    {
      version: 1,
      type: "lyrics.loaded",
      timingPrecision: "word",
      title: "Space Song",
      artist: "Beach House",
      album: "Depression Cherry",
      durationMs: 320000,
      lines: [
        {
          startMs: 44000, endMs: 52000,
          words: [
            { text: "It", startMs: 44000, endMs: 45000 },
            { text: "was", startMs: 45000, endMs: 46000 },
            { text: "all", startMs: 46000, endMs: 47200 },
            { text: "written", startMs: 47200, endMs: 48500 },
            { text: "on", startMs: 48500, endMs: 49800 },
            { text: "the", startMs: 49800, endMs: 50800 },
            { text: "wall", startMs: 50800, endMs: 52000 }
          ]
        },
        {
          startMs: 52500, endMs: 62000,
          words: [
            { text: "Tender", startMs: 52500, endMs: 54200 },
            { text: "is", startMs: 54200, endMs: 55400 },
            { text: "the", startMs: 55400, endMs: 56600 },
            { text: "night", startMs: 56600, endMs: 58200 },
            { text: "for", startMs: 58200, endMs: 59500 },
            { text: "a", startMs: 59500, endMs: 60500 },
            { text: "broken", startMs: 60500, endMs: 61200 },
            { text: "heart", startMs: 61200, endMs: 62000 }
          ]
        },
        {
          startMs: 62500, endMs: 72000,
          words: [
            { text: "Fall", startMs: 62500, endMs: 64000 },
            { text: "back", startMs: 64000, endMs: 65500 },
            { text: "into", startMs: 65500, endMs: 67000 },
            { text: "place", startMs: 67000, endMs: 72000 }
          ]
        }
      ]
    }
  ];

  class LyricProvider {
    constructor() {
      this.currentTrackKey = "";
      this.currentLyrics = null;
      this.activeDemoIndex = 0;
      this.isDemoMode = false;
      this.cachedDemoData = {};
    }

    async loadDemo(index = 0) {
      this.isDemoMode = true;
      this.activeDemoIndex = ((index % DEMO_PRESETS.length) + DEMO_PRESETS.length) % DEMO_PRESETS.length;
      const preset = DEMO_PRESETS[this.activeDemoIndex];

      // Instant return from embedded data (zero network / file:// latency)
      const embedded = EMBEDDED_DEMOS[this.activeDemoIndex];

      try {
        const resp = await fetch(preset.path);
        if (resp.ok) {
          const json = await resp.json();
          this.cachedDemoData[preset.path] = json;
          return { preset, lyrics: json };
        }
      } catch (e) {
        // Expected under local file:/// without HTTP server
      }

      return { preset, lyrics: embedded };
    }

    nextDemo() {
      return this.loadDemo(this.activeDemoIndex + 1);
    }

    prevDemo() {
      return this.loadDemo(this.activeDemoIndex - 1);
    }

    setFromBridge(lyricPayload) {
      this.isDemoMode = false;
      this.currentLyrics = lyricPayload;
      return lyricPayload;
    }

    async fetchLrclib(title, artist) {
      if (!title) return null;
      try {
        const q = `${artist || ''} ${title}`.trim();
        const url = `https://lrclib.net/api/search?q=${encodeURIComponent(q)}`;
        const resp = await fetch(url);
        if (resp.ok) {
          const results = await resp.json();
          for (const item of results) {
            if (item.syncedLyrics) {
              const parser = new window.SongNode.LyricParser();
              return parser.parse(item.syncedLyrics);
            }
          }
        }
      } catch (e) {
        console.warn("[LyricProvider] LRCLIB fetch error:", e);
      }
      return null;
    }
  }

  exports.LyricProvider = LyricProvider;
})(window.SongNode);
