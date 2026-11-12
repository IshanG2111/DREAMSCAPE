/* =========================================================================
   LYRIC PARSER
   Parses Enhanced LRC (word-timed), Standard LRC (line-timed), and JSON cue sheets.
   Strictly distinguishes between "word" and "line" timing precision.
   Never fabricates word timestamps from character count!
   ========================================================================= */

window.SongNode = window.SongNode || {};

(function(exports) {
  function parseTimestampToMs(minStr, secStr) {
    const mins = parseInt(minStr, 10);
    const secs = parseFloat(secStr);
    return Math.round((mins * 60 + secs) * 1000);
  }

  class LyricParser {
    static parse(raw) {
      if (!raw) {
        return {
          timingPrecision: 'none',
          lines: []
        };
      }

      // 1. If already a parsed JSON cue sheet object
      if (typeof raw === 'object' && Array.isArray(raw.lines)) {
        return {
          trackKey: raw.trackKey || '',
          timingPrecision: raw.timingPrecision || (raw.lines[0]?.words?.[0]?.startMs !== undefined ? 'word' : 'line'),
          lines: raw.lines
        };
      }

      // If JSON string
      if (typeof raw === 'string' && (raw.trim().startsWith('{') || raw.trim().startsWith('['))) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed.lines)) {
            return {
              trackKey: parsed.trackKey || '',
              timingPrecision: parsed.timingPrecision || 'word',
              lines: parsed.lines
            };
          }
        } catch (e) {}
      }

      // 2. Parse LRC text
      return LyricParser.parseLrcText(String(raw));
    }

    static parseLrcText(lrcText) {
      const lineRegex = /^\[(\d{2}):(\d{2}(?:\.\d+)?)\](.*)/;
      const wordTagRegex = /<(\d{2}):(\d{2}(?:\.\d+)?)>([^<]+)/g;

      const lines = [];
      let hasWordTags = false;

      const rawLines = lrcText.split('\n');
      for (const line of rawLines) {
        const match = lineRegex.exec(line.trim());
        if (!match) continue;

        const startMs = parseTimestampToMs(match[1], match[2]);
        const rest = match[3].trim();
        if (!rest) continue;

        // Check for word tags
        wordTagRegex.lastIndex = 0;
        const wordMatches = [...rest.matchAll(wordTagRegex)];

        if (wordMatches.length > 0) {
          hasWordTags = true;
          const words = [];
          for (const wm of wordMatches) {
            const wStart = parseTimestampToMs(wm[1], wm[2]);
            const wText = wm[3].trim();
            if (wText) {
              words.push({
                text: wText,
                startMs: wStart,
                endMs: wStart + 400
              });
            }
          }
          // Chain endMs
          for (let i = 0; i < words.length - 1; i++) {
            words[i].endMs = words[i + 1].startMs;
          }

          lines.push({
            startMs: startMs,
            endMs: startMs + 4000,
            words: words
          });
        } else {
          // Standard line-level text
          const plain = rest.replace(/<[^>]+>/g, '').trim();
          if (plain) {
            const tokens = plain.split(/\s+/).filter(t => t.length > 0);
            lines.push({
              startMs: startMs,
              endMs: startMs + 4000,
              words: tokens.map(t => ({ text: t }))
            });
          }
        }
      }

      lines.sort((a, b) => a.startMs - b.startMs);

      // Reconcile line endMs
      for (let i = 0; i < lines.length - 1; i++) {
        lines[i].endMs = lines[i + 1].startMs;
        if (hasWordTags && lines[i].words.length > 0) {
          const lastWord = lines[i].words[lines[i].words.length - 1];
          if (lastWord.endMs) {
            lastWord.endMs = Math.min(lines[i].endMs, lastWord.endMs + 300);
          }
        }
      }

      const precision = hasWordTags ? 'word' : (lines.length > 0 ? 'line' : 'none');
      return {
        timingPrecision: precision,
        lines: lines
      };
    }
  }

  exports.LyricParser = LyricParser;
})(window.SongNode);

