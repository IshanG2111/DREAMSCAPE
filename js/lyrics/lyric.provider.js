/* =========================================================================
   LYRIC PROVIDER
   Loads and manages lyrics across sources: Local Demos, Bridge WebSocket,
   and fallback LRCLIB.
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
      startOffsetMs: 164200, // Cues right at "I know that you want it"
      path: "lyrics/demo/new-person-same-old-mistakes.json"
    },
    {
      title: "Let It Happen",
      artist: "Tame Impala",
      album: "Currents",
      durationMs: 467000,
      startOffsetMs: 81200, // Cues right at "Let it happen, babe see"
      path: "lyrics/demo/let-it-happen.json"
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
      this.activeDemoIndex = index % DEMO_PRESETS.length;
      const preset = DEMO_PRESETS[this.activeDemoIndex];

      if (this.cachedDemoData[preset.path]) {
        return {
          preset,
          lyrics: this.cachedDemoData[preset.path]
        };
      }

      try {
        const resp = await fetch(preset.path);
        if (resp.ok) {
          const json = await resp.json();
          this.cachedDemoData[preset.path] = json;
          return { preset, lyrics: json };
        }
      } catch (e) {
        console.warn("[LyricProvider] Could not fetch demo file, using fallback object:", e);
      }

      // Hardcoded fallback if fetch fails (e.g. strict local file:// sandbox in some webviews)
      const fallbackData = {
        version: 1,
        type: "lyrics.loaded",
        timingPrecision: "word",
        lines: [
          {
            startMs: 164200,
            endMs: 172000,
            words: [
              { text: "I", startMs: 164200, endMs: 165400 },
              { text: "know", startMs: 165400, endMs: 166700 },
              { text: "that", startMs: 166700, endMs: 168300 },
              { text: "you", startMs: 168300, endMs: 169600 },
              { text: "want", startMs: 169600, endMs: 170900 },
              { text: "it", startMs: 170900, endMs: 172000 }
            ]
          }
        ]
      };
      return { preset, lyrics: fallbackData };
    }

    nextDemo() {
      return this.loadDemo(this.activeDemoIndex + 1);
    }

    prevDemo() {
      const idx = (this.activeDemoIndex - 1 + DEMO_PRESETS.length) % DEMO_PRESETS.length;
      return this.loadDemo(idx);
    }

    setFromBridge(lyricPayload) {
      this.isDemoMode = false;
      this.currentLyrics = lyricPayload;
      return lyricPayload;
    }

    async fetchLrclib(title, artist) {
      if (!title) return null;
      try {
        const cleanT = (window.SongNode.TrackMatcher?.cleanTitle(title) || title);
        const url = `https://lrclib.net/api/get?track_name=${encodeURIComponent(cleanT)}&artist_name=${encodeURIComponent(artist || '')}`;
        const resp = await fetch(url);
        if (resp.ok) {
          const json = await resp.json();
          const lrc = json.syncedLyrics || json.plainLyrics;
          if (lrc) {
            return window.SongNode.LyricParser.parseLrcText(lrc);
          }
        }
      } catch (e) {
        console.debug("[LyricProvider] LRCLIB fetch failed:", e);
      }
      return null;
    }
  }

  exports.LyricProvider = LyricProvider;
})(window.SongNode);

