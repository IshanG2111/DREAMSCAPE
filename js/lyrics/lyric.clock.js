/* =========================================================================
   LYRIC CLOCK & DRIFT CONTROLLER
   High-precision monotonic time extrapolator with drift reconciliation.
   Implements "word", "line", "demo", and "idle" precision modes.
   ========================================================================= */

window.SongNode = window.SongNode || {};

(function(exports) {
  class LyricClock {
    constructor() {
      //authoritative snapshot anchor
      this.anchorPositionMs = 0;
      this.anchorMonotonicMs = performance.now();
      this.playbackRate = 1.0;
      this.status = 'stopped'; // 'playing', 'paused', 'stopped'
      this.durationMs = 0;

      // Current smoothed time
      this.currentSmoothedMs = 0;
      this.lastFrameTime = performance.now();

      // Precision & lyrics
      this.timingPrecision = 'idle'; // 'word', 'line', 'demo', 'idle'
      this.lines = [];
      this.flattenedWords = [];

      // Active state indices
      this.activeLineIndex = -1;
      this.activeWordIndex = -1;
      this.lastDriftMs = 0;

      // Event listener
      this.onActivePhraseChange = null;
      this.onPrecisionChange = null;
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

      // Check drift against current estimated time
      const estimatedMs = this.getEstimatedMs();
      const drift = Math.abs(newPosMs - estimatedMs);
      this.lastDriftMs = Math.round(newPosMs - estimatedMs);

      if (!wasPlaying && isPlaying) {
        // Resume: reset anchor cleanly
        this.anchorPositionMs = newPosMs;
        this.anchorMonotonicMs = now;
        this.currentSmoothedMs = newPosMs;
      } else if (drift > 500 || Math.abs(newPosMs - this.currentSmoothedMs) > 600) {
        // Seek / major jump: snap immediately
        this.anchorPositionMs = newPosMs;
        this.anchorMonotonicMs = now;
        this.currentSmoothedMs = newPosMs;
        this.recalculateActiveIndices(true);
      } else {
        // Minor drift: smooth correction
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
        if (this.onPrecisionChange) this.onPrecisionChange(this.timingPrecision);
        if (this.onActivePhraseChange) this.onActivePhraseChange([], -1, null);
        return;
      }

      this.lines = lyricData.lines;
      this.timingPrecision = isDemo ? 'demo' : (lyricData.timingPrecision || 'line');

      // Flatten words list
      this.flattenedWords = [];
      for (let lIdx = 0; lIdx < this.lines.length; lIdx++) {
        const line = this.lines[lIdx];
        if (Array.isArray(line.words)) {
          for (let wIdx = 0; wIdx < line.words.length; wIdx++) {
            const w = line.words[wIdx];
            this.flattenedWords.push({
              text: w.text,
              startMs: w.startMs !== undefined ? w.startMs : line.startMs,
              endMs: w.endMs !== undefined ? w.endMs : line.endMs,
              lineIndex: lIdx,
              wordIndexInLine: wIdx,
              hasExactTiming: (w.startMs !== undefined)
            });
          }
        }
      }

      this.activeLineIndex = -1;
      this.activeWordIndex = -1;

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

    // Called on every animation frame (60-120 FPS)
    update(now = performance.now()) {
      const dt = Math.min(0.1, (now - this.lastFrameTime) / 1000);
      this.lastFrameTime = now;

      if (this.status === 'playing') {
        const targetMs = this.getEstimatedMs();
        // Smoothly ease toward target monotonic time
        const diff = targetMs - this.currentSmoothedMs;
        if (Math.abs(diff) > 500) {
          this.currentSmoothedMs = targetMs;
        } else {
          this.currentSmoothedMs += diff * Math.min(1.0, dt * 10.0);
        }
      }

      this.recalculateActiveIndices(false);
      return this.currentSmoothedMs;
    }

    recalculateActiveIndices(force = false) {
      if (this.lines.length === 0) return;

      const currentTime = this.currentSmoothedMs;

      // 1. In 'word' or 'demo' mode: evaluate active word
      if (this.timingPrecision === 'word' || this.timingPrecision === 'demo') {
        let foundWordIdx = -1;

        for (let i = 0; i < this.flattenedWords.length; i++) {
          const w = this.flattenedWords[i];
          if (currentTime >= w.startMs && currentTime < w.endMs) {
            foundWordIdx = i;
            break;
          }
        }

        // If between words, hold the latest active word
        if (foundWordIdx === -1) {
          for (let i = this.flattenedWords.length - 1; i >= 0; i--) {
            if (currentTime >= this.flattenedWords[i].endMs) {
              foundWordIdx = i;
              break;
            }
          }
        }

        if (foundWordIdx !== -1 && (foundWordIdx !== this.activeWordIndex || force)) {
          this.activeWordIndex = foundWordIdx;
          this.activeLineIndex = this.flattenedWords[foundWordIdx].lineIndex;
          this.dispatchPhraseWindow(foundWordIdx);
        }
      }

      // 2. In 'line' mode: advance whole line together without fake word timestamps
      else if (this.timingPrecision === 'line') {
        let foundLineIdx = -1;
        for (let i = 0; i < this.lines.length; i++) {
          const l = this.lines[i];
          if (currentTime >= l.startMs && currentTime < l.endMs) {
            foundLineIdx = i;
            break;
          }
        }

        if (foundLineIdx === -1) {
          for (let i = this.lines.length - 1; i >= 0; i--) {
            if (currentTime >= this.lines[i].endMs) {
              foundLineIdx = i;
              break;
            }
          }
        }

        if (foundLineIdx !== -1 && (foundLineIdx !== this.activeLineIndex || force)) {
          this.activeLineIndex = foundLineIdx;
          this.dispatchLinePhrase(foundLineIdx);
        }
      }
    }

    dispatchPhraseWindow(centerWordIdx) {
      if (!this.onActivePhraseChange) return;

      // Extract phrase window around the active word: [w-2, w-1, w_hero, w+1, w+2]
      const windowWords = [];
      for (let offset = -2; offset <= 2; offset++) {
        const idx = centerWordIdx + offset;
        if (idx >= 0 && idx < this.flattenedWords.length) {
          windowWords.push(this.flattenedWords[idx]);
        } else {
          windowWords.push(null);
        }
      }

      this.onActivePhraseChange(windowWords, 2, this.flattenedWords[centerWordIdx]);
    }

    dispatchLinePhrase(lineIdx) {
      if (!this.onActivePhraseChange) return;

      const curLine = this.lines[lineIdx];
      if (!curLine || !curLine.words) return;

      // In line precision mode, words stay grouped together as connected nodes on the phrase path
      const words = curLine.words.map((w, idx) => ({
        text: w.text,
        startMs: curLine.startMs,
        endMs: curLine.endMs,
        lineIndex: lineIdx,
        wordIndexInLine: idx,
        hasExactTiming: false
      }));

      // Mid-word is active hero of line
      const heroIdx = Math.floor(words.length / 2);
      this.onActivePhraseChange(words, heroIdx, words[heroIdx]);
    }
  }

  exports.LyricClock = LyricClock;
})(window.SongNode);

