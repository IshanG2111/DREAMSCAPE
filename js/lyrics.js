/* =========================================================================
   LYRIC MANAGER MODULE (LRCLIB SYNC, SMTC / LIVELY HOOKS, MEASURED PACING)
   ========================================================================= */

window.SongNode = window.SongNode || {};

(function(exports) {
  // Built-in presets for demonstration & offline showcase
  const DEMO_PRESETS = [
    {
      title: "Let It Happen",
      artist: "Tame Impala",
      sentences: [
        { words: ["Let", "it", "happen.", "babe", "see"], heroIdx: 2 },
        { words: ["it's", "gonna", "feel", "so", "good"], heroIdx: 2 },
        { words: ["just", "let", "it", "happen", "now"], heroIdx: 3 }
      ]
    },
    {
      title: "The Cure",
      artist: "Olivia Rodrigo",
      sentences: [
        { words: ["I", "got", "toxins", "in", "blood"], heroIdx: 2 },
        { words: ["you", "seem", "pretty", "sad", "girl"], heroIdx: 2 }
      ]
    },
    {
      title: "Resurrection",
      artist: "PPK",
      sentences: [] // Instrumental track! Demonstrates song without lyrics mode!
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
        if (text) {
          lines.push({
            time: mins * 60 + secs,
            text: text
          });
        }
      }
    }
    lines.sort((a, b) => a.time - b.time);
    return lines;
  }

  class LyricManager {
    constructor() {
      this.state = 'IDLE'; // 'IDLE' | 'PLAYING' | 'PAUSED'
      this.isDemoMode = false;
      this.currentTrack = null;
      this.hasLyrics = false;
      this.lrcLines = [];
      this.currentPosition = 0;
      this.duration = 0;

      // Demo sequence pacing controller (2.6s per word for calm, readable luxury pacing)
      this.demoPresetIdx = 0;
      this.demoSentenceIdx = 0;
      this.demoHeroSlot = 2; // Starts centered on "happen."!
      this.demoStepTimer = 0;

      // Event Callbacks
      this.onTrackChange = null;       // (track, hasLyrics)
      this.onStateChange = null;       // (state)
      this.onSentenceChange = null;    // (wordsArray, heroSlot)
      this.onHeroAdvance = null;       // (heroSlot)

      this.ws = null;
      this.wsConnected = false;

      this.initWebSocket();
      this.initLivelyMedia();
    }

    initWebSocket() {
      const self = this;
      const connect = () => {
        try {
          const ws = new WebSocket('ws://127.0.0.1:8765');
          self.ws = ws;

          ws.onopen = () => {
            self.wsConnected = true;
            console.log('[SongNode] Connected to Python SMTC Bridge.');
          };

          ws.onmessage = (event) => {
            try {
              const msg = JSON.parse(event.data);
              self.handleBridgeMessage(msg);
            } catch (err) {
              console.warn('[SongNode] WS Parse error:', err);
            }
          };

          ws.onclose = () => {
            self.wsConnected = false;
            self.ws = null;
            setTimeout(connect, 3000);
          };

          ws.onerror = () => {
            try { ws.close(); } catch (e) {}
          };
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
          this.syncPosition(data.position, data.duration, data.isPlaying);
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

    async fetchLyricsFromLrclib(title, artist, album, duration) {
      const cleanT = cleanTitle(title);
      const cleanA = cleanTitle(artist);

      try {
        let url = `https://lrclib.net/api/get?track_name=${encodeURIComponent(cleanT)}&artist_name=${encodeURIComponent(cleanA)}`;
        if (duration) url += `&duration=${Math.round(duration)}`;
        let resp = await fetch(url);

        if (resp.ok) {
          const json = await resp.json();
          if (json.syncedLyrics) return json.syncedLyrics;
          if (json.plainLyrics) return json.plainLyrics;
        }

        const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(cleanA + ' ' + cleanT)}`;
        resp = await fetch(searchUrl);
        if (resp.ok) {
          const list = await resp.json();
          if (Array.isArray(list) && list.length > 0) {
            const best = list.find(item => item.syncedLyrics) || list[0];
            return best.syncedLyrics || best.plainLyrics || null;
          }
        }
      } catch (err) {
        console.warn('[SongNode] LRCLIB Fetch error:', err);
      }
      return null;
    }

    async fetchAndSetTrack(title, artist, album, duration = 300) {
      this.currentTrack = { title, artist, album, duration };
      this.currentPosition = 0;
      this.duration = duration;

      this.setState('PLAYING');

      const lrcString = await this.fetchLyricsFromLrclib(title, artist, album, duration);
      if (lrcString && lrcString.trim().length > 0) {
        this.lrcLines = parseLrc(lrcString);
        this.hasLyrics = this.lrcLines.length > 0;
      } else {
        this.lrcLines = [];
        this.hasLyrics = false;
      }

      if (this.onTrackChange) {
        this.onTrackChange(this.currentTrack, this.hasLyrics);
      }
    }

    setTrack(trackData) {
      const titleChanged = !this.currentTrack || this.currentTrack.title !== trackData.title;

      this.currentTrack = {
        title: trackData.title,
        artist: trackData.artist,
        album: trackData.album,
        duration: trackData.duration || 300
      };
      this.duration = this.currentTrack.duration;
      this.currentPosition = trackData.position || 0;

      if (trackData.isPlaying) {
        this.setState('PLAYING');
      } else {
        this.setState('PAUSED');
      }

      if (Array.isArray(trackData.rawLyrics) && trackData.rawLyrics.length > 0) {
        this.lrcLines = trackData.rawLyrics;
        this.hasLyrics = true;
        if (this.onTrackChange) {
          this.onTrackChange(this.currentTrack, this.hasLyrics);
        }
      } else if (titleChanged) {
        this.fetchAndSetTrack(trackData.title, trackData.artist, trackData.album, this.duration);
      }
    }

    syncPosition(pos, dur, isPlaying) {
      if (typeof pos === 'number' && !isNaN(pos)) {
        this.currentPosition = pos;
      }
      if (dur && dur > 0) this.duration = dur;

      if (isPlaying !== undefined) {
        if (isPlaying && this.state !== 'PLAYING') this.setState('PLAYING');
        if (!isPlaying && this.state === 'PLAYING') this.setState('PAUSED');
      }
    }

    setState(newState) {
      if (this.state === newState) return;
      this.state = newState;
      console.log('[SongNode] State transition ->', newState);
      if (this.onStateChange) {
        this.onStateChange(newState);
      }
    }

    // Demo Mode: Runs at a calm, luxurious 2.6s per word
    startDemo(presetIdx = 0) {
      this.demoPresetIdx = presetIdx % DEMO_PRESETS.length;
      const preset = DEMO_PRESETS[this.demoPresetIdx];
      this.isDemoMode = true;
      this.currentTrack = {
        title: preset.title,
        artist: preset.artist,
        duration: 300
      };

      this.demoSentenceIdx = 0;
      this.demoHeroSlot = 2; // Exact center "happen."
      this.demoStepTimer = 0;
      this.hasLyrics = (preset.sentences && preset.sentences.length > 0);

      this.setState('PLAYING');

      if (this.onTrackChange) {
        this.onTrackChange(this.currentTrack, this.hasLyrics);
      }

      if (this.hasLyrics) {
        const sentence = preset.sentences[0];
        if (this.onSentenceChange) {
          this.onSentenceChange(sentence.words, sentence.heroIdx);
        }
      }
    }

    stopDemo() {
      this.isDemoMode = false;
      this.currentTrack = null;
      this.hasLyrics = false;
      this.setState('IDLE');
    }

    toggleDemo() {
      if (this.isDemoMode) {
        this.stopDemo();
      } else {
        this.startDemo(0);
      }
    }

    // Master update loop
    update(dt) {
      if (this.state !== 'PLAYING') return;

      if (this.isDemoMode) {
        const preset = DEMO_PRESETS[this.demoPresetIdx];
        if (!preset.sentences || preset.sentences.length === 0) return;

        this.demoStepTimer += dt;
        // 2.6 seconds per step for calm, readable pace!
        if (this.demoStepTimer >= 2.6) {
          this.demoStepTimer = 0;

          // Advance hero slot along the sentence (0 -> 1 -> 2 -> 3 -> 4)
          this.demoHeroSlot = (this.demoHeroSlot + 1) % 5;

          if (this.onHeroAdvance) {
            this.onHeroAdvance(this.demoHeroSlot);
          }
        }
      } else if (this.hasLyrics && this.lrcLines.length > 0) {
        this.currentPosition += dt;
        this.syncLiveLrcLyrics();
      }
    }

    syncLiveLrcLyrics() {
      const pos = this.currentPosition;
      let activeLineIdx = -1;

      for (let i = 0; i < this.lrcLines.length; i++) {
        if (pos >= this.lrcLines[i].time) {
          activeLineIdx = i;
        } else {
          break;
        }
      }

      if (activeLineIdx !== -1 && activeLineIdx !== this.lastActiveLine) {
        this.lastActiveLine = activeLineIdx;
        const lineText = this.lrcLines[activeLineIdx].text;
        const rawTokens = lineText.split(/\s+/).filter(w => w.length > 0);

        // Pad or slice to 5 words
        const displayWords = [];
        for (let i = 0; i < 5; i++) {
          displayWords.push(rawTokens[i] || "");
        }

        if (this.onSentenceChange) {
          this.onSentenceChange(displayWords, 2);
        }
      }
    }
  }

  exports.LyricManager = LyricManager;
})(window.SongNode);
