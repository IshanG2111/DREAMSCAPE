/* =========================================================================
   LYRIC CLOCK & SYNCHRONIZER (INSTRUMENTAL SILENCE & VOCAL DETECTION)
   Accurately detects vocal presence so words ONLY appear when vocals are
   actually sung. When music is instrumental, words fade out cleanly.
   ========================================================================= */

window.SongNode = window.SongNode || {};

(function(exports) {
  class LyricClock {
    constructor() {
      // Authoritative playback anchor
      this.anchorPositionMs = 0;
      this.anchorMonotonicMs = performance.now();
      this.playbackRate = 1.0;
      this.status = 'stopped'; // 'playing', 'paused', 'stopped'
      this.durationMs = 0;

      // Current smoothed time
      this.currentSmoothedMs = 0;
      this.lastFrameTime = performance.now();

      // Precision & lyrics
      this.timingPrecision = 'idle';
      this.lines = [];
      this.flattenedWords = [];

      // Active state indices
      this.activeLineIndex = -1;
      this.activeWordIndex = -1;
      this.isVocalActive = false;
      this.lastDriftMs = 0;

      // Manual sync delay/offset in milliseconds (positive = delay lyrics, negative = advance lyrics)
      let storedOffset = 0;
      try {
        const val = localStorage.getItem('dreamscape_lyric_delay_ms');
        if (val !== null) storedOffset = parseInt(val, 10) || 0;
      } catch (e) {}
      this.manualOffsetMs = storedOffset;

      // Event listeners
      this.onActivePhraseChange = null;
      this.onPrecisionChange = null;
      this.onOffsetChange = null;
    }

    setOffset(offsetMs) {
      this.manualOffsetMs = Math.round(offsetMs);
      try {
        localStorage.setItem('dreamscape_lyric_delay_ms', String(this.manualOffsetMs));
      } catch (e) {}
      if (this.onOffsetChange) this.onOffsetChange(this.manualOffsetMs);
      this.recalculateActiveIndices(true);
      return this.manualOffsetMs;
    }

    nudgeOffset(deltaMs) {
      return this.setOffset(this.manualOffsetMs + deltaMs);
    }

    // Tap-To-Sync: Instantly aligns the active word to the current playback position
    tapToSync() {
      if (this.flattenedWords.length === 0) return this.manualOffsetMs;
      const now = this.currentSmoothedMs;
      let targetWord = null;

      if (this.activeWordIndex >= 0 && this.activeWordIndex < this.flattenedWords.length) {
        targetWord = this.flattenedWords[this.activeWordIndex];
      } else {
        let minDiff = Infinity;
        for (const w of this.flattenedWords) {
          const diff = Math.abs(now - w.startMs);
          if (diff < minDiff) {
            minDiff = diff;
            targetWord = w;
          }
        }
      }

      if (targetWord) {
        const computedOffset = Math.round(now - targetWord.startMs);
        const clampedOffset = Math.max(-10000, Math.min(10000, computedOffset));
        this.setOffset(clampedOffset);
        return clampedOffset;
      }
      return this.manualOffsetMs;
    }

    setPlaybackSnapshot(snapshot) {
      if (!snapshot) return;

      const newStatus = snapshot.status || 'stopped';
      const newPosMs = snapshot.positionMs || 0;
      const newRate = snapshot.playbackRate || 1.0;
      const now = performance.now();

      const wasPlaying = (this.status === 'playing');
      const isPlaying = (newStatus === 'playing');

      this.status = newStatus;
      this.playbackRate = newRate;

      const estimatedMs = this.getEstimatedMs();
      const drift = Math.abs(newPosMs - estimatedMs);
      this.lastDriftMs = Math.round(newPosMs - estimatedMs);

      if (!wasPlaying && isPlaying) {
        this.anchorPositionMs = newPosMs;
        this.anchorMonotonicMs = now;
        this.currentSmoothedMs = newPosMs;
        this.recalculateActiveIndices(true);
      } else if (drift > 500 || Math.abs(newPosMs - this.currentSmoothedMs) > 600) {
        this.anchorPositionMs = newPosMs;
        this.anchorMonotonicMs = now;
        this.currentSmoothedMs = newPosMs;
        this.recalculateActiveIndices(true);
      } else {
        this.anchorPositionMs = newPosMs;
        this.anchorMonotonicMs = now;
      }
    }

    setLyrics(lyricData, isDemo = false) {
      if (!lyricData || !Array.isArray(lyricData.lines) || lyricData.lines.length === 0) {
        this.lines = [];
        this.flattenedWords = [];
        this.timingPrecision = isDemo ? 'demo' : 'idle';
        this.activeLineIndex = -1;
        this.activeWordIndex = -1;
        this.isVocalActive = false;
        if (this.onPrecisionChange) this.onPrecisionChange(this.timingPrecision);
        if (this.onActivePhraseChange) this.onActivePhraseChange([], -1, null, false);
        return;
      }

      this.lines = lyricData.lines;
      this.timingPrecision = isDemo ? 'demo' : (lyricData.timingPrecision || 'word');

      // Top-level JSON offset in milliseconds if specified in the lyric file
      const fileOffsetMs = (lyricData && typeof lyricData.offsetMs === 'number') ? lyricData.offsetMs : 0;

      // Flatten words and interpolate precise word timestamps for line-mode
      this.flattenedWords = [];

      for (let lIdx = 0; lIdx < this.lines.length; lIdx++) {
        const line = this.lines[lIdx];
        if (!Array.isArray(line.words) || line.words.length === 0) continue;

        const lineDuration = Math.max(1200, (line.endMs || line.startMs + 4000) - line.startMs);
        const wordCount = line.words.length;
        const uniformWordDuration = lineDuration / wordCount;

        for (let wIdx = 0; wIdx < line.words.length; wIdx++) {
          const w = line.words[wIdx];
          const hasExact = (w.startMs !== undefined && w.endMs !== undefined);

          const wStart = (hasExact ? w.startMs : Math.round(line.startMs + wIdx * uniformWordDuration)) + fileOffsetMs;
          const wEnd = (hasExact ? w.endMs : Math.round(line.startMs + (wIdx + 1) * uniformWordDuration)) + fileOffsetMs;

          this.flattenedWords.push({
            text: w.text || '',
            startMs: wStart,
            endMs: wEnd,
            lineIndex: lIdx,
            wordIndexInLine: wIdx,
            hasExactTiming: hasExact
          });
        }
      }

      this.flattenedWords.sort((a, b) => a.startMs - b.startMs);

      for (let i = 0; i < this.flattenedWords.length - 1; i++) {
        const cur = this.flattenedWords[i];
        const next = this.flattenedWords[i + 1];
        if (cur.lineIndex === next.lineIndex && cur.endMs > next.startMs) {
          cur.endMs = next.startMs;
        }
      }

      this.activeLineIndex = -1;
      this.activeWordIndex = -1;
      this.isVocalActive = false;

      if (this.onPrecisionChange) {
        this.onPrecisionChange(this.timingPrecision);
      }

      this.recalculateActiveIndices(true);
    }

    getEstimatedMs() {
      if (this.status !== 'playing') {
        return this.anchorPositionMs;
      }
      const elapsedSec = (performance.now() - this.anchorMonotonicMs) / 1000.0;
      let est = this.anchorPositionMs + (elapsedSec * 1000 * this.playbackRate);
      if (this.durationMs > 0) {
        est = Math.min(this.durationMs, est);
      }
      return Math.max(0, est);
    }

    update(now = performance.now()) {
      const dt = Math.min(0.1, (now - this.lastFrameTime) / 1000);
      this.lastFrameTime = now;

      if (this.status === 'playing') {
        const targetMs = this.getEstimatedMs();
        const diff = targetMs - this.currentSmoothedMs;
        if (Math.abs(diff) > 500) {
          this.currentSmoothedMs = targetMs;
        } else {
          this.currentSmoothedMs += diff * Math.min(1.0, dt * 12.0);
        }
      }

      this.recalculateActiveIndices(false);
      return this.currentSmoothedMs;
    }

    recalculateActiveIndices(force = false) {
      if (this.flattenedWords.length === 0) {
        if (this.isVocalActive) {
          this.isVocalActive = false;
          if (this.onActivePhraseChange) this.onActivePhraseChange([], -1, null, false);
        }
        return;
      }

      // currentTime calibrated by user's manual delay/offset
      // Positive manualOffsetMs delays lyrics (makes them appear later)
      // Negative manualOffsetMs advances lyrics (makes them appear earlier)
      const currentTime = this.currentSmoothedMs - this.manualOffsetMs;
      let foundWordIdx = -1;
      let isVocal = false;

      // 1. Direct hit inside word interval
      for (let i = 0; i < this.flattenedWords.length; i++) {
        const w = this.flattenedWords[i];
        if (currentTime >= w.startMs && currentTime < w.endMs) {
          foundWordIdx = i;
          isVocal = true;
          break;
        }
      }

      // 2. Natural pause between words within the same line (hold current word up to 1.2s)
      if (foundWordIdx === -1) {
        for (let i = 0; i < this.flattenedWords.length - 1; i++) {
          const cur = this.flattenedWords[i];
          const next = this.flattenedWords[i + 1];
          if (cur.lineIndex === next.lineIndex && currentTime >= cur.endMs && currentTime < next.startMs) {
            if (next.startMs - cur.endMs < 1400) {
              foundWordIdx = i;
              isVocal = true;
              break;
            }
          }
        }
      }

      // 3. Gentle lead-in before an upcoming line starts (0.6s lead-in for smooth emergence)
      if (foundWordIdx === -1) {
        for (let i = 0; i < this.flattenedWords.length; i++) {
          const w = this.flattenedWords[i];
          if (currentTime >= w.startMs - 600 && currentTime < w.startMs) {
            foundWordIdx = i;
            isVocal = true;
            break;
          }
        }
      }

      // 4. Linger fade-out after line ends (up to 1.0s after final word of line)
      if (foundWordIdx === -1) {
        for (let i = this.flattenedWords.length - 1; i >= 0; i--) {
          const w = this.flattenedWords[i];
          if (currentTime >= w.endMs && currentTime < w.endMs + 1000) {
            foundWordIdx = i;
            isVocal = true;
            break;
          }
        }
      }

      // If outside all vocal intervals, this is an INSTRUMENTAL section!
      if (!isVocal) {
        foundWordIdx = -1;
      }

      if (foundWordIdx !== this.activeWordIndex || isVocal !== this.isVocalActive || force) {
        this.activeWordIndex = foundWordIdx;
        this.isVocalActive = isVocal;

        if (isVocal && foundWordIdx !== -1) {
          this.activeLineIndex = this.flattenedWords[foundWordIdx].lineIndex;
          this.dispatchPhraseWindow(foundWordIdx, true);
        } else {
          this.activeLineIndex = -1;
          this.dispatchPhraseWindow(-1, false);
        }
      }
    }

    dispatchPhraseWindow(centerWordIdx, isVocalActive) {
      if (!this.onActivePhraseChange) return;

      if (!isVocalActive || centerWordIdx < 0) {
        this.onActivePhraseChange([], -1, null, false);
        return;
      }

      // Extract balanced 5-word window around the active word: [w-2, w-1, w_hero, w+1, w+2]
      const windowWords = [];
      for (let offset = -2; offset <= 2; offset++) {
        const idx = centerWordIdx + offset;
        if (idx >= 0 && idx < this.flattenedWords.length) {
          windowWords.push(this.flattenedWords[idx]);
        } else {
          windowWords.push(null);
        }
      }

      this.onActivePhraseChange(windowWords, 2, this.flattenedWords[centerWordIdx], true);
    }
  }

  exports.LyricClock = LyricClock;
})(window.SongNode);
