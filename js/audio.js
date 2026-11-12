/* =========================================================================
   AUDIO ANALYZER MODULE (LIVELY AUDIO FFT + SMOOTH FREQUENCY BANDS)
   ========================================================================= */

window.SongNode = window.SongNode || {};

(function(exports) {
  class AudioEngine {
    constructor() {
      this.bass = 0.2;
      this.mids = 0.2;
      this.treble = 0.2;

      this.targetBass = 0.2;
      this.targetMids = 0.2;
      this.targetTreble = 0.2;

      this.lastAudioTime = 0;
      this.isAudioActive = false;

      this.setupLivelyHook();
    }

    setupLivelyHook() {
      const self = this;
      window.livelyAudio = function(audioArray) {
        if (!audioArray || audioArray.length === 0) return;

        self.lastAudioTime = performance.now();
        self.isAudioActive = true;

        // 1. Low / Bass frequencies (bins 0 to 14)
        let sumBass = 0;
        const bassCount = Math.min(15, audioArray.length);
        for (let i = 0; i < bassCount; i++) sumBass += audioArray[i];
        self.targetBass = (sumBass / bassCount) * 2.8;

        // 2. Vocal / Mid frequencies (bins 15 to 50)
        let sumMids = 0;
        const midCount = Math.min(36, Math.max(1, audioArray.length - 15));
        for (let i = 15; i < 15 + midCount; i++) sumMids += audioArray[i];
        self.targetMids = (sumMids / midCount) * 2.4;

        // 3. High / Treble frequencies (bins 51 to 120)
        let sumTreble = 0;
        const trebleCount = Math.min(70, Math.max(1, audioArray.length - 51));
        for (let i = 51; i < 51 + trebleCount; i++) sumTreble += audioArray[i];
        self.targetTreble = (sumTreble / trebleCount) * 2.2;
      };
    }

    update(frameTick) {
      // Check if real audio has been received recently (within 500ms)
      const now = performance.now();
      if (now - this.lastAudioTime > 800) {
        this.isAudioActive = false;
      }

      if (this.isAudioActive) {
        // Fast attack, smooth decay
        const smoothing = 0.12;
        this.bass += (this.targetBass - this.bass) * smoothing;
        this.mids += (this.targetMids - this.mids) * smoothing;
        this.treble += (this.targetTreble - this.treble) * smoothing;
      } else {
        // Serene, tranquil harmonic breathing for Idle / Default state
        const t = frameTick * 0.02;
        const simBass = Math.sin(t * 1.2) * 0.12 + 0.15;
        const simMids = Math.cos(t * 1.5) * 0.10 + 0.15;
        const simTreble = Math.sin(t * 2.2) * 0.08 + 0.12;

        this.bass += (simBass - this.bass) * 0.05;
        this.mids += (simMids - this.mids) * 0.05;
        this.treble += (simTreble - this.treble) * 0.05;
      }

      return {
        bass: Math.max(0.08, this.bass),
        mids: Math.max(0.08, this.mids),
        treble: Math.max(0.08, this.treble),
        isAudioActive: this.isAudioActive
      };
    }
  }

  exports.AudioEngine = AudioEngine;
})(window.SongNode);

