/* =========================================================================
   AUDIO ENGINE (WEB AUDIO API + STEREO SOUNDSCAPE SYNTHESIZER)
   Generates rich, authentic psychedelic soundscapes with Web Audio API,
   real-time FFT frequency analysis, and rhythmic note impulses.
   ========================================================================= */

window.SongNode = window.SongNode || {};

(function(exports) {
  class AudioEngine {
    constructor() {
      this.ctx = null;
      this.analyser = null;
      this.freqData = null;

      this.isPlaying = false;
      this.isMuted = false;

      this.bands = { bass: 0.18, mids: 0.16, treble: 0.14 };
      this.noteEnergy = 0.0;
      this.onNote = null; // (type, energy) => {}

      this.synthTimer = null;
      this.synthNodes = [];
    }

    ensureContext() {
      if (!this.ctx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          this.ctx = new AudioContextClass();
          this.analyser = this.ctx.createAnalyser();
          this.analyser.fftSize = 256;
          this.analyser.smoothingTimeConstant = 0.8;
          this.freqData = new Uint8Array(this.analyser.frequencyBinCount);
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return this.ctx;
    }

    triggerNote(type = 'note', energy = 0.6) {
      this.noteEnergy = Math.min(1.0, this.noteEnergy + energy);
      if (this.onNote) this.onNote(type, energy);
    }

    startSynth() {
      this.ensureContext();
      if (!this.ctx || this.isPlaying) return;
      this.isPlaying = true;

      const ctx = this.ctx;
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.14, ctx.currentTime);
      masterGain.connect(this.analyser);
      this.analyser.connect(ctx.destination);
      this.synthNodes.push(masterGain);

      // Juno Pad Chords in Db minor (Tame Impala Currents)
      const chords = [
        [69.30, 138.59, 164.81, 207.65, 277.18], // Db minor
        [61.74, 123.47, 155.56, 185.00, 246.94], // B major
        [51.91, 103.83, 123.47, 155.56, 207.65], // Ab minor
        [46.25, 92.50, 116.54, 138.59, 185.00]   // Gb minor
      ];

      const padOscs = [];
      for (let i = 0; i < 5; i++) {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = i === 0 ? 'sine' : 'sawtooth';

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(750, ctx.currentTime);

        g.gain.setValueAtTime(i === 0 ? 0.08 : 0.025, ctx.currentTime);
        osc.connect(filter);
        filter.connect(g);
        g.connect(masterGain);
        osc.start();

        padOscs.push(osc);
        this.synthNodes.push(osc, filter, g);
      }

      // 105 BPM Drum & Chord Sequencer
      const bpm = 105;
      const stepMs = (60 / bpm / 4) * 1000;
      let step = 0;

      const playKick = (t) => {
        try {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.frequency.setValueAtTime(125, t);
          osc.frequency.exponentialRampToValueAtTime(32, t + 0.22);
          g.gain.setValueAtTime(0.38, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
          osc.connect(g);
          g.connect(masterGain);
          osc.start(t);
          osc.stop(t + 0.30);
          this.triggerNote('kick', 0.9);
        } catch (e) {}
      };

      const playSnare = (t) => {
        try {
          const bufSize = Math.floor(ctx.sampleRate * 0.12);
          const noiseBuf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
          const out = noiseBuf.getChannelData(0);
          for (let i = 0; i < bufSize; i++) out[i] = Math.random() * 2 - 1;

          const whiteNoise = ctx.createBufferSource();
          whiteNoise.buffer = noiseBuf;

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
          this.triggerNote('snare', 0.7);
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
          this.triggerNote('hat', 0.35);
        } catch (e) {}
      };

      this.synthTimer = setInterval(() => {
        if (!this.isPlaying || !this.ctx) return;
        const t = ctx.currentTime;
        const beat16 = step % 16;
        const barIdx = Math.floor(step / 16) % chords.length;

        if (beat16 === 0) {
          const notes = chords[barIdx];
          for (let i = 0; i < 5; i++) {
            padOscs[i].frequency.setTargetAtTime(notes[i], t, 0.18);
          }
          this.triggerNote('chord', 0.75);
        }

        if (beat16 === 0 || beat16 === 8) playKick(t);
        if (beat16 === 4 || beat16 === 12) playSnare(t);
        if (beat16 % 2 === 0) playHat(t);

        step++;
      }, stepMs);
    }

    stopSynth() {
      if (!this.isPlaying) return;
      this.isPlaying = false;
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
    }

    update(dt) {
      this.noteEnergy *= Math.exp(-6.0 * dt);

      if (this.analyser && this.freqData && this.isPlaying) {
        this.analyser.getByteFrequencyData(this.freqData);

        let sBass = 0;
        for (let i = 1; i <= 6; i++) sBass += this.freqData[i];
        const rawBass = (sBass / 6 / 255.0) * 1.5;

        let sMids = 0;
        for (let i = 7; i <= 35; i++) sMids += this.freqData[i];
        const rawMids = (sMids / 29 / 255.0) * 1.4;

        let sTreble = 0;
        for (let i = 36; i <= 100; i++) sTreble += this.freqData[i];
        const rawTreble = (sTreble / 65 / 255.0) * 1.3;

        const ease = 1.0 - Math.exp(-12.0 * dt);
        this.bands.bass += (rawBass - this.bands.bass) * ease;
        this.bands.mids += (rawMids - this.bands.mids) * ease;
        this.bands.treble += (rawTreble - this.bands.treble) * ease;
      } else {
        // Idle ambient rhythmic breathing
        const now = performance.now() * 0.001;
        const b = 0.16 + Math.sin(now * 3.5) * 0.06;
        const m = 0.14 + Math.cos(now * 2.8) * 0.05;
        const tr = 0.12 + Math.sin(now * 4.2) * 0.04;
        this.bands.bass += (b - this.bands.bass) * 0.1;
        this.bands.mids += (m - this.bands.mids) * 0.1;
        this.bands.treble += (tr - this.bands.treble) * 0.1;
      }
    }
  }

  exports.AudioEngine = AudioEngine;
})(window.SongNode);

