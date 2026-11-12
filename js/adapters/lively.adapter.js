/* =========================================================================
   LIVELY WALLPAPER ADAPTER
   Binds native Lively Wallpaper global hooks:
   - livelyCurrentTrack(data) for SMTC track metadata
   - livelyAudioListener(audioArray) for 128-band visual reactivity
   ========================================================================= */

window.SongNode = window.SongNode || {};

(function(exports) {
  class LivelyAdapter {
    constructor() {
      this.isLivelyHost = false;
      this.onTrackChange = null;
      this.onAudioData = null;
      this.onPauseChange = null;

      this.initHooks();
    }

    initHooks() {
      const self = this;

      // Lively Track Metadata Hook
      window.livelyCurrentTrack = function(data) {
        self.isLivelyHost = true;
        if (!data) {
          if (self.onTrackChange) self.onTrackChange(null);
          return;
        }

        const normalized = window.SongNode.MediaNormalizer?.normalizeLivelyTrack(data);
        if (self.onTrackChange && normalized) {
          self.onTrackChange(normalized);
        }
      };

      // Lively 128-Band Audio Reactivity Hook
      window.livelyAudioListener = function(audioArray) {
        self.isLivelyHost = true;
        if (self.onAudioData && Array.isArray(audioArray)) {
          self.onAudioData(audioArray);
        }
      };

      // Lively Wallpaper Engine Pause/Resume hook
      window.livelyPropertyListener = function(name, val) {
        if (name === "isPaused" && self.onPauseChange) {
          self.onPauseChange(Boolean(val));
        }
      };

      // Page visibility change for pause detection
      document.addEventListener("visibilitychange", () => {
        if (self.onPauseChange) {
          self.onPauseChange(document.hidden);
        }
      });
    }
  }

  exports.LivelyAdapter = LivelyAdapter;
})(window.SongNode);

