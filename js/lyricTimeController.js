/* =========================================================================
   LYRIC TIME CONTROLLER (SMTC TIME EXTRAPOLATION + PSEUDO-WORD LINE SPLITTER)
   ========================================================================= */

window.SongNode = window.SongNode || {};

(function(exports) {
  // Demo showcase tracks for immediate offline preview
  const DEMO_TRACKS = [
    {
      title: "Let It Happen",
      artist: "Tame Impala",
      duration: 467,
      lrc: `[01:14.00]It's always around me, all this noise
[01:18.50]Nothing seems as big as the 'cause
[01:21.20]Let it happen, babe see
[01:25.80]It's gonna feel so good
[01:28.50]Just let it happen
[01:31.20]Let it happen`
    },
    {
      title: "The Cure",
      artist: "Olivia Rodrigo",
      duration: 297,
      lrc: `[00:15.20]I got toxins in my bloodstream
[00:19.40]You seem pretty sad for a girl so in love
[00:24.00]Why can't you come time antidote
[00:29.50]I thought this would be the cure`
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

  function parseLrcLines(lrcText) {
    if (!lrcText) return [];
    const lines = [];
    const regex = /\[(\d{2}):(\d{2}(?:\.\d+)?)\](.*)/;
    for (const raw of lrcText.split('\n')) {
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

  class LyricTimeController {
    constructor() {
      // 1. Precise Frontend Timing Extrapolator
      this.currentAudioTime = 0.0;
      this.lastSyncPerformanceTime = performance.now();
      this.isPlaying = false;
      this.duration = 300.0;

      // 2. Parsed Pseudo-Word Timeline
      this.words = [];
      this.activeWordIndex = -1;

      // Track Identity
      this.currentTrack = null;
      this.hasLyrics = false;
      this.isDemoMode = false;

      // Callbacks
      this.onTrackChange = null;
      this.onFocalWindowChange = null;

      // Bridge WebSocket
      this.ws = null;
      this.initWebSocket();
      this.initLivelyHook();
    }

    // 1. HIGH-PRECISION TIME DELTA EXTRAPOLATION
    getExactTime() {
      if (!this.isPlaying) return this.currentAudioTime;
      const elapsedSeconds = (performance.now() - this.lastSyncPerformanceTime) / 1000;
      return this.currentAudioTime + Math.max(0, elapsedSeconds);
    }

    // Handle SMTC audio position sync packet
    syncTime(audioTime, duration, isPlaying) {
      if (typeof audioTime === 'number' && !isNaN(audioTime)) {
        const currentExact = this.getExactTime();
        const diff = Math.abs(currentExact - audioTime);

        // If drift is minor (< 0.5s), ease smoothly; if seek occurred (> 0.5s), snap immediately
        if (diff > 0.5) {
          this.currentAudioTime = audioTime;
        } else {
          this.currentAudioTime += (audioTime - currentExact) * 0.4;
        }
      }

      this.lastSyncPerformanceTime = performance.now();
      if (duration && duration > 0) this.duration = duration;
      if (isPlaying !== undefined) this.isPlaying = isPlaying;
    }

    // 2. PSEUDO-WORD SYNCING (LINE SPLITTING BASED ON PROPORTIONAL WEIGHT)
    tokenizeLrcToPseudoWords(lrcLines, totalDuration) {
      if (!lrcLines || lrcLines.length === 0) return [];

      const wordTokens = [];

      for (let i = 0; i < lrcLines.length; i++) {
        const curLine = lrcLines[i];
        const nextLine = lrcLines[i + 1];
        const lineStart = curLine.time;

        // Calculate line duration
        let lineDur = nextLine ? (nextLine.time - lineStart) : 4.5;
        if (lineDur <= 0 || lineDur > 8.0) {
          lineDur = Math.min(5.5, Math.max(2.2, curLine.text.length * 0.14));
        }

        // Split line into words
        const rawTokens = curLine.text.split(/\s+/).filter(w => w.length > 0);
        if (rawTokens.length === 0) continue;

        // Calculate total character weight
        const totalWeight = rawTokens.reduce((sum, token) => sum + Math.max(2, token.length), 0);
        let accumulatedTime = lineStart;

        for (let j = 0; j < rawTokens.length; j++) {
          const token = rawTokens[j];
          const tokenWeight = Math.max(2, token.length) / totalWeight;
          const tokenDur = Math.max(0.24, lineDur * tokenWeight);

          wordTokens.push({
            word: token,
            startTime: accumulatedTime,
            endTime: accumulatedTime + tokenDur,
            lineIndex: i,
            wordIndexInLine: j
          });

          accumulatedTime += tokenDur;
        }
      }

      wordTokens.sort((a, b) => a.startTime - b.startTime);
      return wordTokens;
    }

    // 3. WEBSOCKET LISTENER FOR SMTC BRIDGE
    initWebSocket() {
      const self = this;
      const connect = () => {
        try {
          const ws = new WebSocket('ws://127.0.0.1:8765');
          self.ws = ws;

          ws.onopen = () => console.log('[LyricTimeController] Connected to SMTC Bridge.');
          ws.onmessage = (event) => {
            try {
              const msg = JSON.parse(event.data);
              self.handleBridgeMessage(msg);
            } catch (err) {}
          };
          ws.onclose = () => {
            self.ws = null;
            setTimeout(connect, 3000);
          };
          ws.onerror = () => { try { ws.close(); } catch (e) {} };
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
          this.loadTrack({
            title: data.title,
            artist: data.artist,
            album: data.album,
            duration: data.duration || 300,
            position: data.position || 0,
            isPlaying: data.isPlaying,
            rawLyrics: data.lyrics
          });
        }
      } else if (msg.type === 'TIMELINE_SYNC') {
        const data = msg.data;
        if (data) {
          this.syncTime(data.position, data.duration, data.isPlaying);
        }
      } else if (msg.type === 'PLAYBACK_STOPPED') {
        this.isPlaying = false;
        this.currentTrack = null;
        if (this.onTrackChange) {
          this.onTrackChange(null, false);
        }
      }
    }

    initLivelyHook() {
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
      this.currentAudioTime = 0;
      this.lastSyncPerformanceTime = performance.now();
      this.isPlaying = true;
      this.duration = duration;

      // Query LRCLIB
      const cleanT = cleanTitle(title);
      const cleanA = cleanTitle(artist);
      let lrcText = null;

      try {
        const url = `https://lrclib.net/api/get?track_name=${encodeURIComponent(cleanT)}&artist_name=${encodeURIComponent(cleanA)}`;
        const resp = await fetch(url);
        if (resp.ok) {
          const json = await resp.json();
          lrcText = json.syncedLyrics || json.plainLyrics || null;
        }
      } catch (e) {}

      if (lrcText) {
        const lines = parseLrcLines(lrcText);
        this.words = this.tokenizeLrcToPseudoWords(lines, duration);
        this.hasLyrics = this.words.length > 0;
      } else {
        this.words = [];
        this.hasLyrics = false;
      }

      this.activeWordIndex = -1;

      if (this.onTrackChange) {
        this.onTrackChange(this.currentTrack, this.hasLyrics);
      }
    }

    loadTrack(trackData) {
      this.currentTrack = trackData;
      this.duration = trackData.duration || 300;
      this.currentAudioTime = trackData.position || 0;
      this.lastSyncPerformanceTime = performance.now();
      this.isPlaying = Boolean(trackData.isPlaying);

      if (Array.isArray(trackData.rawLyrics) && trackData.rawLyrics.length > 0) {
        this.words = this.tokenizeLrcToPseudoWords(trackData.rawLyrics, this.duration);
        this.hasLyrics = this.words.length > 0;
      } else {
        this.fetchAndSetTrack(trackData.title, trackData.artist, trackData.album, this.duration);
      }

      if (this.onTrackChange) {
        this.onTrackChange(this.currentTrack, this.hasLyrics);
      }
    }

    // Demo Mode: Seamless showcase featuring "Let it happen. babe see"
    startDemo(presetIdx = 0) {
      const preset = DEMO_TRACKS[presetIdx % DEMO_TRACKS.length];
      this.isDemoMode = true;
      this.currentTrack = {
        title: preset.title,
        artist: preset.artist,
        duration: preset.duration
      };
      this.duration = preset.duration;
      this.currentAudioTime = 80.0; // Start at ~1:20 right at "Let it happen, babe see"
      this.lastSyncPerformanceTime = performance.now();
      this.isPlaying = true;

      const lines = parseLrcLines(preset.lrc);
      this.words = this.tokenizeLrcToPseudoWords(lines, this.duration);
      this.hasLyrics = this.words.length > 0;
      this.activeWordIndex = -1;

      if (this.onTrackChange) {
        this.onTrackChange(this.currentTrack, this.hasLyrics);
      }
    }

    stopDemo() {
      this.isDemoMode = false;
      this.currentTrack = null;
      this.hasLyrics = false;
      this.isPlaying = false;
      this.words = [];
      this.activeWordIndex = -1;
    }

    toggleDemo() {
      if (this.isDemoMode) {
        this.stopDemo();
      } else {
        this.startDemo(0);
      }
    }

    // 4. PER-FRAME UPDATE: EXTRACT ACTIVE 5-WORD FOCAL WINDOW
    update(dt) {
      if (this.isDemoMode && this.isPlaying) {
        // Slow virtual clock for calm, readable pacing
        this.currentAudioTime += dt * 0.75;
        if (this.currentAudioTime > 92.0) {
          this.currentAudioTime = 80.5; // Loop the iconic verse
        }
      }

      if (!this.hasLyrics || this.words.length === 0) return;

      const exactTime = this.getExactTime();
      let foundIdx = -1;

      for (let i = 0; i < this.words.length; i++) {
        const w = this.words[i];
        if (exactTime >= w.startTime && exactTime < w.endTime) {
          foundIdx = i;
          break;
        }
      }

      // If between words or in instrumental pause, hold the nearest word
      if (foundIdx === -1) {
        for (let i = this.words.length - 1; i >= 0; i--) {
          if (exactTime >= this.words[i].endTime) {
            foundIdx = i;
            break;
          }
        }
      }

      if (foundIdx !== -1 && foundIdx !== this.activeWordIndex) {
        this.activeWordIndex = foundIdx;
        this.dispatchFocalWindow(foundIdx);
      }
    }

    dispatchFocalWindow(centerIdx) {
      if (!this.onFocalWindowChange) return;

      // Extract 5 active words: [FAR_PAST, PREV, HERO, NEXT, FAR_NEXT]
      const windowWords = [];
      for (let offset = -2; offset <= 2; offset++) {
        const targetIdx = centerIdx + offset;
        if (targetIdx >= 0 && targetIdx < this.words.length) {
          windowWords.push(this.words[targetIdx].word);
        } else {
          windowWords.push("");
        }
      }

      this.onFocalWindowChange({
        words: windowWords,
        heroIndex: centerIdx,
        heroWord: windowWords[2]
      });
    }
  }

  exports.LyricTimeController = LyricTimeController;
})(window.SongNode);

