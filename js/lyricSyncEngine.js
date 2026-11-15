/* =========================================================================
   LYRIC SYNCHRONIZATION ENGINE v3
   - Always guarantees valid words with clean integer millisecond timestamps.
   - Smooth continuous opacity and line-level envelopes every frame.
   - Intelligent anticipation: before line 0 starts or during pauses, displays
     the upcoming constellation in soft starlight so the screen is never blank.
   - Fallback resilience: handles line-level, word-level, and instrumental tracks.
   ========================================================================= */

window.SongNode = window.SongNode || {};

(function(exports) {
  class LyricSyncEngine {
    constructor() {
      this.lines = [];
      this.status = 'paused';
      this.durationMs = 363000;

      this.anchorPosMs = 0;
      this.anchorMonoMs = performance.now();
      this.currentMs = 0;
      this.manualOffsetMs = 0;

      this.activeLineIndex = 0;
      this.activeWordIndex = 0;
      this.isVocal = false;

      // Continuous per-frame event listener
      this.onSyncUpdate = null;
    }

    setLyrics(lyricsPayload) {
      if (!lyricsPayload) return;
      const rawLines = Array.isArray(lyricsPayload.lines) ? lyricsPayload.lines : [];
      if (lyricsPayload.durationMs && lyricsPayload.durationMs > 0) {
        this.durationMs = Number(lyricsPayload.durationMs);
      }

      this.lines = [];

      for (let i = 0; i < rawLines.length; i++) {
        const raw = rawLines[i];
        if (!raw) continue;

        let words = Array.isArray(raw.words) ? raw.words : [];
        if (words.length === 0) {
          const txt = raw.text || '';
          words = txt.split(/\s+/).filter(Boolean).map(t => ({ text: t }));
        }
        if (words.length === 0) continue;

        const lStart = typeof raw.startMs === 'number' && !isNaN(raw.startMs) ? raw.startMs : 0;
        let lEnd = typeof raw.endMs === 'number' && !isNaN(raw.endMs) ? raw.endMs : 0;
        if (lEnd <= lStart) {
          if (i < rawLines.length - 1 && typeof rawLines[i + 1].startMs === 'number' && rawLines[i + 1].startMs > lStart) {
            lEnd = rawLines[i + 1].startMs;
          } else {
            lEnd = lStart + Math.max(2400, words.length * 500);
          }
        }

        const wCount = words.length;
        const wStep = (lEnd - lStart) / Math.max(1, wCount);
        const cleanWords = [];

        for (let w = 0; w < wCount; w++) {
          const wordObj = words[w];
          const wText = (typeof wordObj === 'string' ? wordObj : (wordObj.text || '')).trim();
          if (!wText) continue;

          let wStart = (typeof wordObj.startMs === 'number' && !isNaN(wordObj.startMs))
            ? wordObj.startMs
            : Math.round(lStart + w * wStep);
          let wEnd = (typeof wordObj.endMs === 'number' && !isNaN(wordObj.endMs))
            ? wordObj.endMs
            : Math.round(lStart + (w + 1) * wStep);

          cleanWords.push({
            text: wText,
            startMs: wStart,
            endMs: wEnd
          });
        }

        if (cleanWords.length > 0) {
          this.lines.push({
            startMs: lStart,
            endMs: lEnd,
            words: cleanWords
          });
        }
      }

      // Sort chronologically
      this.lines.sort((a, b) => a.startMs - b.startMs);

      // Re-link adjacent endMs to next line's startMs if needed
      for (let i = 0; i < this.lines.length - 1; i++) {
        if (this.lines[i].endMs > this.lines[i + 1].startMs) {
          this.lines[i].endMs = this.lines[i + 1].startMs;
        }
      }

      this.update(performance.now());
    }

    seek(targetMs) {
      this.anchorPosMs = Math.max(0, Math.min(this.durationMs, targetMs));
      this.anchorMonoMs = performance.now();
      this.currentMs = this.anchorPosMs;
      this.update(performance.now());
    }

    play() {
      if (this.status === 'playing') return;
      this.anchorPosMs = this.currentMs;
      this.anchorMonoMs = performance.now();
      this.status = 'playing';
    }

    pause() {
      if (this.status === 'paused') return;
      this.anchorPosMs = this.currentMs;
      this.status = 'paused';
    }

    togglePlay() {
      if (this.status === 'playing') this.pause();
      else this.play();
      return this.status === 'playing';
    }

    update(now = performance.now()) {
      if (this.status === 'playing') {
        const elapsed = now - this.anchorMonoMs;
        this.currentMs = this.anchorPosMs + elapsed;

        if (this.currentMs > this.durationMs && this.durationMs > 0) {
          // Loop
          this.anchorPosMs = (this.lines.length > 0) ? Math.max(0, this.lines[0].startMs - 1200) : 0;
          this.anchorMonoMs = now;
          this.currentMs = this.anchorPosMs;
        }
      }

      const t = this.currentMs - this.manualOffsetMs;
      const totalLines = this.lines.length;

      let lineIdx = -1;
      let wordIdx = -1;
      let isVocal = false;
      let lineOpacity = 1.0;

      const LEAD_IN = 800; // Constellation starts materializing 800ms before phrase
      const LINGER = 900;  // Constellation lingers 900ms after phrase before dissolving

      if (totalLines > 0) {
        // 1. Direct hit or lead-in/linger inside a line
        for (let i = 0; i < totalLines; i++) {
          const line = this.lines[i];
          if (t >= line.startMs - LEAD_IN && t <= line.endMs + LINGER) {
            lineIdx = i;
            isVocal = (t >= line.startMs && t <= line.endMs);
            break;
          }
        }

        // 2. Before first line starts (song intro, e.g. at 0:10):
        // Show line 0 previewed in the stars with clear, elegant celestial starlight!
        if (lineIdx === -1 && t < this.lines[0].startMs) {
          lineIdx = 0;
          isVocal = false;
          // Soft breathing starlight anticipatory glow (always clearly visible, never blank)
          const timeToStart = this.lines[0].startMs - t;
          if (timeToStart <= 3000) {
            lineOpacity = Math.max(0.55, Math.min(0.90, 0.55 + ((3000 - timeToStart) / 3000) * 0.35));
          } else {
            lineOpacity = 0.58 + Math.sin(now * 0.002) * 0.08;
          }
        }

        // 3. Between two lines during an instrumental interlude:
        // Hold previous line fading out, then anticipate upcoming line gracefully
        if (lineIdx === -1) {
          for (let i = 0; i < totalLines - 1; i++) {
            if (t > this.lines[i].endMs && t < this.lines[i + 1].startMs) {
              const gap = this.lines[i + 1].startMs - this.lines[i].endMs;
              const progressInGap = (t - this.lines[i].endMs) / Math.max(1, gap);
              if (progressInGap < 0.45) {
                lineIdx = i; // Show previous line gently dissolving
                lineOpacity = Math.max(0.35, 1.0 - progressInGap * 1.5);
              } else {
                lineIdx = i + 1; // Anticipate next line forming
                lineOpacity = Math.max(0.45, 0.45 + (progressInGap - 0.45) * 1.0);
              }
              isVocal = false;
              break;
            }
          }
        }

        // 4. Past the end of the last line
        if (lineIdx === -1 && t > this.lines[totalLines - 1].endMs) {
          lineIdx = totalLines - 1;
          isVocal = false;
          lineOpacity = Math.max(0.30, 0.65 - (t - this.lines[totalLines - 1].endMs) / 4000);
        }
      }

      // Default fallback if no match: show first line gracefully
      if (lineIdx === -1 && totalLines > 0) {
        lineIdx = 0;
        lineOpacity = 0.60;
      }

      const activeLine = (lineIdx >= 0 && this.lines[lineIdx]) ? this.lines[lineIdx] : null;
      const words = activeLine ? activeLine.words : [];
      const wordOpacities = [];

      if (activeLine && words.length > 0) {
        // Calculate line envelope if within normal active interval
        if (isVocal || (t >= activeLine.startMs - LEAD_IN && t <= activeLine.endMs + LINGER)) {
          if (t < activeLine.startMs) {
            const f = Math.max(0, Math.min(1, (t - (activeLine.startMs - LEAD_IN)) / LEAD_IN));
            lineOpacity = Math.max(0.45, f * f * (3 - 2 * f));
          } else if (t > activeLine.endMs) {
            const f = Math.max(0, Math.min(1, (t - activeLine.endMs) / LINGER));
            lineOpacity = Math.max(0.30, 1.0 - (f * f * (3 - 2 * f)) * 0.70);
          } else {
            lineOpacity = 1.0;
          }
        }

        // Find active word
        for (let w = 0; w < words.length; w++) {
          if (t >= words[w].startMs && t < words[w].endMs) {
            wordIdx = w;
            break;
          }
        }

        if (wordIdx === -1) {
          if (t < words[0].startMs) {
            wordIdx = 0;
          } else if (t >= words[words.length - 1].endMs) {
            wordIdx = words.length - 1;
          } else {
            for (let w = 0; w < words.length - 1; w++) {
              if (t >= words[w].endMs && t < words[w + 1].startMs) {
                wordIdx = w;
                break;
              }
            }
          }
        }

        // Compute per-word precise opacity (always legible and clearly visible)
        for (let w = 0; w < words.length; w++) {
          const word = words[w];
          const wStart = word.startMs;
          const wEnd = word.endMs;
          let op = 0.52;

          if (t < wStart) {
            // Upcoming word: crisp celestial starlight, ramps up gently as activation nears
            const dist = wStart - t;
            if (dist < 800) {
              const f = 1.0 - (dist / 800);
              op = 0.50 + f * 0.35;
            } else {
              op = 0.48;
            }
          } else if (t >= wStart && t < wEnd) {
            // Active word: radiant hero bloom
            const wDur = Math.max(1, wEnd - wStart);
            const wProg = (t - wStart) / wDur;
            op = 0.95 + Math.sin(wProg * Math.PI) * 0.05;
          } else {
            // Completed word: soft lingering lilac starlight
            const dist = t - wEnd;
            if (dist < 1000) {
              op = 0.85 - (dist / 1000) * 0.15;
            } else {
              op = 0.70;
            }
          }

          if (isNaN(op) || !isFinite(op)) op = 0.70;
          wordOpacities.push(Math.max(0.35, Math.min(1.0, op * lineOpacity)));
        }
      }

      this.activeLineIndex = lineIdx;
      this.activeWordIndex = wordIdx;
      this.isVocal = isVocal;

      if (this.onSyncUpdate) {
        this.onSyncUpdate({
          lineWords: words,
          activeWordIndex: wordIdx >= 0 ? wordIdx : 0,
          wordOpacities: wordOpacities,
          lineOpacity: Math.max(0.05, Math.min(1.0, lineOpacity)),
          isVocal: isVocal,
          lineIndex: lineIdx >= 0 ? lineIdx : 0,
          currentMs: this.currentMs,
          durationMs: this.durationMs,
          songTimeMs: t
        });
      }

      return this.currentMs;
    }
  }

  exports.LyricSyncEngine = LyricSyncEngine;
})(window.SongNode);
