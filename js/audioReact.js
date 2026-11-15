/* =========================================================================
   AUDIO REACT ENGINE (WEB AUDIO API + SYNTHESIZER + LIVELY / MIC AUDIO)
   Analyzes frequency bands (Sub-bass, Bass, Midrange, Treble) independently
   with real-time FFT, transient note beat detection, and note event emission.
   ========================================================================= */

window.SongNode = window.SongNode || {};

(function(exports) {
  class AudioReact {
    constructor() {
      this.bass = 0.18;
      this.mids = 0.16;
      this.treble = 0.14;

      this.targetBass = 0.18;
      this.targetMids = 0.16;
      this.targetTreble = 0.14;

      this.bands = {
        bass: 0.18,
        mids: 0.16,
        treble: 0.14
      };

      // Transient Beat / Kick / Note Detector
      this.kickEnergy = 0.0;
      this.prevBass = 0.0;
      this.kickScale = 1.0;
      this.noteEnergy = 0.0;
      this.lastNoteTime = 0;

      // Note event callback
      this.onNote = null;

      this.lastAudioTime = 0;
      this.isAudioActive = false;

      // Web Audio API State
      this.audioCtx = null;
      this.analyser = null;
      this.freqData = null;
      this.isSynthPlaying = false;
      this.synthNodes = [];
      this.micStream = null;

      this.initLivelyHooks();
    }

    triggerNote(type = 'note', energy = 0.6, freq = 440) {
      this.lastNoteTime = performance.now();
      this.noteEnergy = Math.min(1.0, this.noteEnergy + energy);
      if (this.onNote) {
        this.onNote(type, energy, freq);
      }
    }

    // Initialize Web Audio API Context
    ensureAudioContext() {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          this.audioCtx = new AudioContextClass();
          this.analyser = this.audioCtx.createAnalyser();
          this.analyser.fftSize = 512;
          this.analyser.smoothingTimeConstant = 0.82;
          this.freqData = new Uint8Array(this.analyser.frequencyBinCount);
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      return this.audioCtx;
    }

    // Rhythmic Currents Synthesizer Emulator (105 BPM Authentic Groove)
    // Emulates the iconic psychedelic drum & chord groove of Currents ("New Person, Same Old Mistakes")
    toggleSynth(enable = true) {
      if (!enable) {
        this.stopSynth();
        return;
      }

      this.ensureAudioContext();
      if (!this.audioCtx) return;
      if (this.isSynthPlaying) return;

      this.isSynthPlaying = true;
      const ctx = this.audioCtx;

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.12, ctx.currentTime);
      masterGain.connect(this.analyser);
      this.analyser.connect(ctx.destination);

      this.synthNodes = [masterGain];

      // Dreamy Juno Pad Chords in Db minor (Tame Impala Currents)
      const chordNotes = [
        [69.30, 138.59, 164.81, 207.65, 277.18], // Db minor
        [61.74, 123.47, 155.56, 185.00, 246.94], // B major
        [51.91, 103.83, 123.47, 155.56, 207.65], // Ab minor
        [46.25, 92.50, 116.54, 138.59, 185.00]   // Gb minor
      ];

      // Oscillators for pad
      const padOscs = [];
      for (let i = 0; i < 5; i++) {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = i === 0 ? 'sine' : 'sawtooth';

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(680, ctx.currentTime);

        g.gain.setValueAtTime(i === 0 ? 0.08 : 0.02, ctx.currentTime);
        osc.connect(filter);
        filter.connect(g);
        g.connect(masterGain);
        osc.start();

        padOscs.push(osc);
        this.synthNodes.push(osc, filter, g);
      }

      // 105 BPM Rhythm Sequencer: Kick, Snare, Hi-Hat, Chord Progression
      const bpm = 105;
      const stepIntervalMs = (60 / bpm / 4) * 1000; // 16th note ~ 142.8ms
      let step = 0;

      const playKick = (t) => {
        try {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.frequency.setValueAtTime(115, t);
          osc.frequency.exponentialRampToValueAtTime(32, t + 0.22);
          g.gain.setValueAtTime(0.38, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
          osc.connect(g);
          g.connect(masterGain);
          osc.start(t);
          osc.stop(t + 0.30);
          this.triggerNote('kick', 0.9, 45);
        } catch (e) {}
      };

      const playSnare = (t) => {
        try {
          const bufferSize = Math.floor(ctx.sampleRate * 0.12);
          const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const output = noiseBuffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;

          const whiteNoise = ctx.createBufferSource();
          whiteNoise.buffer = noiseBuffer;

          const filter = ctx.createBiquadFilter();
          filter.type = 'highpass';
          filter.frequency.setValueAtTime(1100, t);

          const g = ctx.createGain();
          g.gain.setValueAtTime(0.18, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

          whiteNoise.connect(filter);
          filter.connect(g);
          g.connect(masterGain);
          whiteNoise.start(t);
          this.triggerNote('snare', 0.7, 280);
        } catch (e) {}
      };

      const playHat = (t) => {
        try {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(7500, t);
          g.gain.setValueAtTime(0.035, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
          osc.connect(g);
          g.connect(masterGain);
          osc.start(t);
          osc.stop(t + 0.06);
          this.triggerNote('hat', 0.35, 7500);
        } catch (e) {}
      };

      this.synthTimer = setInterval(() => {
        if (!this.isSynthPlaying || !this.audioCtx) return;
        const t = ctx.currentTime;
        const beat16 = step % 16;
        const barIndex = Math.floor(step / 16) % chordNotes.length;

        // Update chord on downbeats
        if (beat16 === 0) {
          const notes = chordNotes[barIndex];
          for (let i = 0; i < 5; i++) {
            padOscs[i].frequency.setTargetAtTime(notes[i], t, 0.18);
          }
          this.triggerNote('chord', 0.75, notes[0]);
        }

        // Drums (105 BPM classic Currents groove)
        if (beat16 === 0 || beat16 === 8) {
          playKick(t); // Kick on beat 1 and 3
        }
        if (beat16 === 4 || beat16 === 12) {
          playSnare(t); // Snare on beat 2 and 4
        }
        if (beat16 % 2 === 0) {
          playHat(t); // 8th note hi-hat
        }

        step++;
      }, stepIntervalMs);
    }

    stopSynth() {
      if (!this.isSynthPlaying) return;
      if (this.synthTimer) {
        clearInterval(this.synthTimer);
        this.synthTimer = null;
      }
      this.synthNodes.forEach(node => {
        try {
          if (node.stop) node.stop();
          if (node.disconnect) node.disconnect();
        } catch (e) {}
      });
      this.synthNodes = [];
      this.isSynthPlaying = false;
    }

    // Toggle Microphone Input
    async toggleMicrophone() {
      this.ensureAudioContext();
      if (!this.audioCtx) return false;

      if (this.micStream) {
        this.micStream.getTracks().forEach(t => t.stop());
        this.micStream = null;
        return false;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.micStream = stream;
        const source = this.audioCtx.createMediaStreamSource(stream);
        source.connect(this.analyser);
        return true;
      } catch (err) {
        console.warn("[AudioReact] Microphone access denied or unavailable:", err);
        return false;
      }
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
      if (deltaBass > 0.42 && rawBass > 0.55) {
        this.kickEnergy = Math.min(1.0, this.kickEnergy + deltaBass * 1.5);
        this.kickScale = 1.08;
        this.triggerNote('kick', 0.85, 55);
      }
      this.prevBass = rawBass;

      // 2. Vocal / Mid Energy (bins 15 to 50)
      let sumMids = 0;
      const midCount = Math.min(36, Math.max(1, audioArray.length - 15));
      for (let i = 15; i < 15 + midCount; i++) sumMids += audioArray[i];
      const rawMids = (sumMids / midCount) * 2.5;
      this.targetMids = rawMids;

      // 3. Highs / Treble (bins 51 to 120)
      let sumTreble = 0;
      const trebleCount = Math.min(70, Math.max(1, audioArray.length - 51));
      for (let i = 51; i < 51 + trebleCount; i++) sumTreble += audioArray[i];
      const rawTreble = (sumTreble / trebleCount) * 2.2;
      this.targetTreble = rawTreble;
    }

    initLivelyHooks() {
      const self = this;
      window.livelyAudioListener = (arr) => self.processLivelyAudio(arr);
      window.livelyAudio = (arr) => self.processLivelyAudio(arr);
    }

    update(dt) {
      const now = performance.now();

      // Note impulse decay
      this.noteEnergy *= Math.exp(-6.0 * dt);

      // Read Web Audio Analyser if active
      if (this.analyser && this.freqData) {
        this.analyser.getByteFrequencyData(this.freqData);

        let sumBass = 0;
        for (let i = 1; i <= 8; i++) sumBass += this.freqData[i];
        const rawBass = (sumBass / 8 / 255.0) * 1.6;

        let sumMids = 0;
        for (let i = 9; i <= 60; i++) sumMids += this.freqData[i];
        const rawMids = (sumMids / 52 / 255.0) * 1.4;

        let sumTreble = 0;
        for (let i = 61; i <= 180; i++) sumTreble += this.freqData[i];
        const rawTreble = (sumTreble / 120 / 255.0) * 1.3;

        if (rawBass > 0.05 || rawMids > 0.05) {
          this.lastAudioTime = now;
          this.isAudioActive = true;
          this.targetBass = rawBass;
          this.targetMids = rawMids;
          this.targetTreble = rawTreble;

          // Transient kick detection
          const deltaBass = rawBass - this.prevBass;
          if (deltaBass > 0.35 && rawBass > 0.5) {
            this.triggerNote('kick', 0.8, 50);
          }
          this.prevBass = rawBass;
        }
      }

      if (now - this.lastAudioTime > 800) {
        this.isAudioActive = false;
      }

      if (this.isAudioActive) {
        const ease = 1.0 - Math.exp(-12.0 * dt);
        this.bass += (this.targetBass - this.bass) * ease;
        this.mids += (this.targetMids - this.mids) * ease;
        this.treble += (this.targetTreble - this.treble) * ease;
      } else {
        // Authentic 105 BPM rhythmic emulation for visual pulsation before audio start
        const bpm = 105;
        const beatSec = 60 / bpm; // ~0.5714s
        const songSec = (now * 0.001);
        const beatPhase = (songSec % beatSec) / beatSec; // 0.0 to 1.0
        const barPhase = Math.floor(songSec / beatSec) % 4; // 0, 1, 2, 3

        const isKickBeat = (barPhase === 0 || barPhase === 2);
        const isSnareBeat = (barPhase === 1 || barPhase === 3);

        const kickEnvelope = isKickBeat ? Math.max(0, 1.0 - beatPhase * 3.5) : 0;
        const snareEnvelope = isSnareBeat ? Math.max(0, 1.0 - beatPhase * 3.8) : 0;
        const hatEnvelope = Math.max(0, 1.0 - ((songSec * 2) % 1.0) * 4.0);

        if (kickEnvelope > 0.7 && this.prevKickEnv <= 0.7) {
          this.kickEnergy = Math.min(1.0, this.kickEnergy + 0.6);
          this.kickScale = 1.06;
          this.triggerNote('kick', 0.65, 50);
        }
        this.prevKickEnv = kickEnvelope;

        // Base breathing + rhythmic surge
        const idleBass = 0.16 + (kickEnvelope * 0.42);
        const idleMids = 0.14 + (snareEnvelope * 0.35);
        const idleTreble = 0.12 + (hatEnvelope * 0.22);

        const ease = 1.0 - Math.exp(-9.0 * dt);
        this.bass += (idleBass - this.bass) * ease;
        this.mids += (idleMids - this.mids) * ease;
        this.treble += (idleTreble - this.treble) * ease;
      }

      this.kickScale += (1.0 - this.kickScale) * (1.0 - Math.exp(-8.0 * dt));

      this.bands.bass = Math.max(0, Math.min(1.0, this.bass));
      this.bands.mids = Math.max(0, Math.min(1.0, this.mids));
      this.bands.treble = Math.max(0, Math.min(1.0, this.treble));
    }
  }

  exports.AudioReact = AudioReact;
})(window.SongNode);
