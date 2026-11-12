/* =========================================================================
   LYRIC DIRECTOR MODULE (LRC HEURISTIC GAP ANALYZER & TIMELINE DIRECTOR)
   ========================================================================= */

window.SongNode = window.SongNode || {};

(function(exports) {
  // Built-in showcase presets
  const DEMO_PRESETS = [
    {
      title: "Let It Happen",
      artist: "Tame Impala",
      sentences: [
        ["Let", "it", "happen.", "babe", "see"],
        ["it's", "gonna", "feel", "so", "good"],
        ["just", "let", "it", "happen", "now"]
      ]
    },
    {
      title: "The Cure",
      artist: "Olivia Rodrigo",
      sentences: [
        ["I", "got", "toxins", "in", "blood"],
        ["you", "seem", "pretty", "sad", "girl"]
      ]
    },
    {
      title: "Resurrection",
      artist: "PPK",
      sentences: [] // Instrumental track
    }
  ];

  function cleanTitle(str) {
    if (!str) return "";
    return str
      .replace(/\(.*?(remaster|deluxe|version|feat|ft|explicit|edition|mix|live|mono|stereo|bonus|audio).*\)/gi, '')
      .replace(/\[.*?(remaster|deluxe|version|feat|ft|explicit|edition|mix|live|mono|stereo|bonus|audio).*\]/gi, '')
      .replace(/-\s*(remastered|deluxe|single|live|edit).*/gi, '')
      .trim();
  }

  function parseLrc(lrcText) {
    if (!lrcText) return [];
    const lines = [];
    const regex = /\[(\d{2}):(\d{2}(?:\.\d+)?)\](.*)/;
    const rawLines = lrcText.split('\n');

    for (const raw of rawLines) {
      const match = regex.exec(raw.trim());
      if (match) {
        const mins = parseInt(match[1], 10);
        const secs = parseFloat(match[2]);
        const text = match[3].trim();
        lines.push({
          time: mins * 60 + secs,
          text: text
        });
      }
    }
    lines.sort((a, b) => a.time - b.time);
    return lines;
  }

  class LyricDirector {
    constructor(constellation) {
      this.constellation = constellation;

      this.state = 'IDLE'; // 'IDLE' | 'PLAYING' | 'PAUSED'
      this.isDemoMode = false;
      this.currentTrack = null;
      this.hasLyrics = false;
      this.lrcLines = [];
      this.currentPosition = 0;
      this.duration = 0;

      // Heuristic Mode Detection
      this.activeLineIdx = -1;

      // Demo sequence pacing (2.8s per word step)
      this.demoPresetIdx = 0;
      this.demoHeroSlot = 2; // Center "happen."
      this.demoWordAdvanceTimer = 0;

      // Callbacks
      this.onTrackChange = null;

      this.initWebSocket();
      this.initLivelyMedia();
    }

    initWebSocket() {
      const self = this;
      const connect = () => {
        try {
          const ws = new WebSocket('ws://127.0.0.1:8765');
          ws.onopen = () => console.log('[LyricDirector] Connected to SMTC Bridge.');
          ws.onmessage = (e) => {
            try {
              const msg = JSON.parse(e.data);
              self.handleBridgeMessage(msg);
            } catch (err) {}
          };
          ws.onclose = () => setTimeout(connect, 3000);
          ws.onerror = () => { try { ws.close(); } catch (err) {} };
        } catch (e) {
          setTimeout(connect, 4000);
        }
      };
      connect();
    }

    handleBridgeMessage(msg) {
      if (!msg) return;
      if (msg.type === 'INIT' || msg.type === 'TRACK_CHANGE') {
        const data = msg.data;
        if (data && data.title) {
          this.isDemoMode = false;
          this.setTrack({
            title: data.title,
            artist: data.artist,
            album: data.album,
            duration: data.duration || 300,
            isPlaying: data.isPlaying,
            position: data.position || 0,
            rawLyrics: data.lyrics
          });
        }
      } else if (msg.type === 'TIMELINE_SYNC') {
        const data = msg.data;
        if (data) {
          this.currentPosition = data.position;
          if (data.duration) this.duration = data.duration;
          this.state = data.isPlaying ? 'PLAYING' : 'PAUSED';
        }
      }
    }

    initLivelyMedia() {
      const self = this;
      window.livelyCurrentTrack = function(track) {
        if (!track) return;
        const title = track.Title || track.title || "";
        const artist = track.Artist || track.artist || "";
        const album = track.Album || track.album || "";

        if (title) {
          self.isDemoMode = false;
          self.fetchAndSetTrack(title, artist, album);
        }
      };
    }

    async fetchAndSetTrack(title, artist, album, duration = 300) {
      this.currentTrack = { title, artist, album, duration };
      this.currentPosition = 0;
      this.duration = duration;
      this.state = 'PLAYING';

      // Fetch LRCLIB
      const cleanT = cleanTitle(title);
      const cleanA = cleanTitle(artist);
      try {
        const url = `https://lrclib.net/api/get?track_name=${encodeURIComponent(cleanT)}&artist_name=${encodeURIComponent(cleanA)}`;
        const resp = await fetch(url);
        if (resp.ok) {
          const json = await resp.json();
          const lrc = json.syncedLyrics || json.plainLyrics || "";
          if (lrc) {
            this.lrcLines = parseLrc(lrc);
            this.hasLyrics = this.lrcLines.length > 0;
          }
        }
      } catch (err) {}

      if (this.onTrackChange) {
        this.onTrackChange(this.currentTrack, this.hasLyrics);
      }

      if (!this.hasLyrics && this.constellation) {
        this.constellation.showTrackHero(title, artist);
      }
    }

    setTrack(trackData) {
      this.currentTrack = trackData;
      this.duration = trackData.duration || 300;
      this.currentPosition = trackData.position || 0;
      this.state = trackData.isPlaying ? 'PLAYING' : 'PAUSED';

      if (Array.isArray(trackData.rawLyrics) && trackData.rawLyrics.length > 0) {
        this.lrcLines = trackData.rawLyrics;
        this.hasLyrics = true;
      } else {
        this.fetchAndSetTrack(trackData.title, trackData.artist, trackData.album, this.duration);
      }

      if (this.onTrackChange) {
        this.onTrackChange(this.currentTrack, this.hasLyrics);
      }
    }

    // Demo Mode: Calm, luxurious 2.8s per word step
    startDemo(presetIdx = 0) {
      this.demoPresetIdx = presetIdx % DEMO_PRESETS.length;
      const preset = DEMO_PRESETS[this.demoPresetIdx];
      this.isDemoMode = true;
      this.currentTrack = {
        title: preset.title,
        artist: preset.artist,
        duration: 300
      };

      this.demoHeroSlot = 2; // Center "happen."
      this.demoWordAdvanceTimer = 0;
      this.hasLyrics = (preset.sentences && preset.sentences.length > 0);
      this.state = 'PLAYING';

      if (this.onTrackChange) {
        this.onTrackChange(this.currentTrack, this.hasLyrics);
      }

      if (this.hasLyrics && this.constellation) {
        this.constellation.setWords(preset.sentences[0], 2);
      } else if (this.constellation) {
        this.constellation.showTrackHero(preset.title, preset.artist);
      }
    }

    stopDemo() {
      this.isDemoMode = false;
      this.currentTrack = null;
      this.hasLyrics = false;
      this.state = 'IDLE';
      if (this.constellation) {
        this.constellation.showIdleChronos("01:10");
      }
    }

    toggleDemo() {
      if (this.isDemoMode) {
        this.stopDemo();
      } else {
        this.startDemo(0);
      }
    }

    // Master timeline update
    update(dt) {
      if (this.state !== 'PLAYING') return;

      if (this.isDemoMode) {
        const preset = DEMO_PRESETS[this.demoPresetIdx];
        if (!preset.sentences || preset.sentences.length === 0) return;

        this.demoWordAdvanceTimer += dt;
        // 2.8 seconds per word step for readable tempo
        if (this.demoWordAdvanceTimer >= 2.8) {
          this.demoWordAdvanceTimer = 0;
          this.demoHeroSlot = (this.demoHeroSlot + 1) % 5;
          if (this.constellation) {
            this.constellation.setHeroSlot(this.demoHeroSlot, 0.9);
          }
        }
      } else if (this.hasLyrics && this.lrcLines.length > 0) {
        this.currentPosition += dt;
        this.syncLiveLrcLyrics();
      }
    }

    syncLiveLrcLyrics() {
      const pos = this.currentPosition;
      let lineIdx = -1;

      for (let i = 0; i < this.lrcLines.length; i++) {
        if (pos >= this.lrcLines[i].time) {
          lineIdx = i;
        } else {
          break;
        }
      }

      if (lineIdx !== -1 && lineIdx !== this.activeLineIdx) {
        this.activeLineIdx = lineIdx;
        const lineText = this.lrcLines[lineIdx].text.trim();
        const tokens = lineText.split(/\s+/).filter(w => w.length > 0);

        if (this.constellation) {
          const displayWords = [
            tokens[0] || "",
            tokens[1] || "",
            tokens[2] || (tokens[0] ? tokens[0] : "♪"),
            tokens[3] || "",
            tokens[4] || ""
          ];
          this.constellation.setWords(displayWords, 2);
        }
      }
    }
  }

  exports.LyricDirector = LyricDirector;
})(window.SongNode);
