/* =========================================================================
   AUDIO REACT ENGINE (LIVELY AUDIO LISTENER + KICK TRANSIENT DETECTOR)
   ========================================================================= */

window.SongNode = window.SongNode || {};

(function(exports) {
  class AudioReact {
    constructor() {
      this.bass = 0.2;
      this.mids = 0.2;
      this.treble = 0.2;

      this.targetBass = 0.2;
      this.targetMids = 0.2;
      this.targetTreble = 0.2;

      this.bands = {
        bass: 0.2,
        mids: 0.2,
        treble: 0.2
      };

      // Transient Beat / Kick Detector
      this.kickEnergy = 0.0;
      this.prevBass = 0.0;
      this.kickScale = 1.0;

      this.lastAudioTime = 0;
      this.isAudioActive = false;

      this.initLivelyHooks();
    }

    processLivelyAudio(audioArray) {
      if (!audioArray || audioArray.length === 0) return;

      this.lastAudioTime = performance.now();
      this.isAudioActive = true;

      // 1. Low / Bass Frequencies (bins 0 to 14)
      let sumBass = 0;
      const bassCount = Math.min(15, audioArray.length);
      for (let i = 0; i < bassCount; i++) sumBass += audioArray[i];
      const rawBass = (sumBass / bassCount) * 2.8;
      this.targetBass = rawBass;

      // Transient Kick Detection
      const deltaBass = rawBass - this.prevBass;
      if (deltaBass > 0.45 && rawBass > 0.6) {
        this.kickEnergy = Math.min(1.0, this.kickEnergy + deltaBass * 1.5);
        this.kickScale = 1.08;
      }
      this.prevBass = rawBass;

      // 2. Vocal / Mid Energy (bins 15 to 50)
      let sumMids = 0;
      const midCount = Math.min(36, Math.max(1, audioArray.length - 15));
      for (let i = 15; i < 15 + midCount; i++) sumMids += audioArray[i];
      this.targetMids = (sumMids / midCount) * 2.5;

      // 3. Highs / Treble (bins 51 to 120)
      let sumTreble = 0;
      const trebleCount = Math.min(70, Math.max(1, audioArray.length - 51));
      for (let i = 51; i < 51 + trebleCount; i++) sumTreble += audioArray[i];
      this.targetTreble = (sumTreble / trebleCount) * 2.2;
    }

    initLivelyHooks() {
      const self = this;
      window.livelyAudioListener = (arr) => self.processLivelyAudio(arr);
      window.livelyAudio = (arr) => self.processLivelyAudio(arr);
    }

    update(dt) {
      const now = performance.now();
      if (now - this.lastAudioTime > 800) {
        this.isAudioActive = false;
      }

      if (this.isAudioActive) {
        const ease = 1.0 - Math.exp(-12.0 * dt);
        this.bass += (this.targetBass - this.bass) * ease;
        this.mids += (this.targetMids - this.mids) * ease;
        this.treble += (this.targetTreble - this.treble) * ease;
      } else {
        // Subtle ambient breathing in idle/demo
        const t = now * 0.0015;
        const idleBass = Math.sin(t * 1.2) * 0.08 + 0.14;
        const idleMids = Math.cos(t * 1.5) * 0.06 + 0.12;
        const idleTreble = Math.sin(t * 2.0) * 0.05 + 0.10;

        const ease = 1.0 - Math.exp(-3.0 * dt);
        this.bass += (idleBass - this.bass) * ease;
        this.mids += (idleMids - this.mids) * ease;
        this.treble += (idleTreble - this.treble) * ease;
      }

      this.kickScale += (1.0 - this.kickScale) * (1.0 - Math.exp(-8.0 * dt));

      this.bands = {
        bass: Math.max(0.06, this.bass),
        mids: Math.max(0.06, this.mids),
        treble: Math.max(0.06, this.treble),
        kickScale: this.kickScale,
        isAudioActive: this.isAudioActive
      };

      return this.bands;
    }
  }

  exports.AudioReact = AudioReact;
})(window.SongNode);
