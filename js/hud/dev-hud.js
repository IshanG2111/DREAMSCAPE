/* =========================================================================
   DEVELOPER HUD
   Diagnostic telemetry overlay toggled with 'H'.
   Displays real-time SMTC sync stats, timing precision mode, clock drift,
   FPS, and bridge health.
   ========================================================================= */

window.SongNode = window.SongNode || {};

(function(exports) {
  class DevHUD {
    constructor() {
      this.isVisible = false;
      this.fps = 60;
      this.frameCount = 0;
      this.lastFpsUpdate = performance.now();
      this.lastFrameTime = performance.now();
      this.frameDeltaMs = 16.6;

      this.createDOM();
    }

    createDOM() {
      const container = document.createElement('div');
      container.id = 'devHudPanel';
      container.className = 'dev-hud-panel';
      container.style.display = 'none';

      container.innerHTML = `
        <div class="hud-header">
          <span class="hud-title">SONG-NODE TELEMETRY</span>
          <span class="hud-pill" id="hudPrecisionPill">IDLE</span>
        </div>
        <div class="hud-body">
          <div class="hud-row"><span class="hud-k">Source:</span> <span class="hud-v" id="hudSource">None</span></div>
          <div class="hud-row"><span class="hud-k">Status:</span> <span class="hud-v" id="hudStatus">Stopped</span></div>
          <div class="hud-row"><span class="hud-k">Track:</span> <span class="hud-v" id="hudTrack">—</span></div>
          <div class="hud-row"><span class="hud-k">Position:</span> <span class="hud-v" id="hudPosition">00:00 / 00:00</span></div>
          <div class="hud-row"><span class="hud-k">Precision:</span> <span class="hud-v" id="hudPrecision">idle</span></div>
          <div class="hud-row"><span class="hud-k">Active Cue:</span> <span class="hud-v" id="hudCue">—</span></div>
          <div class="hud-row"><span class="hud-k">Clock Drift:</span> <span class="hud-v" id="hudDrift">0 ms</span></div>
          <div class="hud-row"><span class="hud-k">Bridge WS:</span> <span class="hud-v" id="hudBridge">Disconnected</span></div>
          <div class="hud-row"><span class="hud-k">Snapshot Age:</span> <span class="hud-v" id="hudAge">—</span></div>
          <div class="hud-row"><span class="hud-k">Performance:</span> <span class="hud-v" id="hudPerf">60 FPS (16.6ms)</span></div>
          <div class="hud-row"><span class="hud-k">Motion Mode:</span> <span class="hud-v" id="hudMotion">Normal</span></div>
        </div>
        <div class="hud-footer">
          <span>[Space] Demo | [←/→] Cues | [H] HUD | [R] Bridge | [F] Motion</span>
        </div>
      `;

      document.body.appendChild(container);
      this.el = container;

      this.pillEl = document.getElementById('hudPrecisionPill');
      this.sourceEl = document.getElementById('hudSource');
      this.statusEl = document.getElementById('hudStatus');
      this.trackEl = document.getElementById('hudTrack');
      this.posEl = document.getElementById('hudPosition');
      this.precisionEl = document.getElementById('hudPrecision');
      this.cueEl = document.getElementById('hudCue');
      this.driftEl = document.getElementById('hudDrift');
      this.bridgeEl = document.getElementById('hudBridge');
      this.ageEl = document.getElementById('hudAge');
      this.perfEl = document.getElementById('hudPerf');
      this.motionEl = document.getElementById('hudMotion');
    }

    toggle() {
      this.isVisible = !this.isVisible;
      this.el.style.display = this.isVisible ? 'block' : 'none';
      return this.isVisible;
    }

    recordFrame(now = performance.now()) {
      this.frameDeltaMs = now - this.lastFrameTime;
      this.lastFrameTime = now;
      this.frameCount++;

      if (now - this.lastFpsUpdate >= 500) {
        this.fps = Math.round((this.frameCount * 1000) / (now - this.lastFpsUpdate));
        this.frameCount = 0;
        this.lastFpsUpdate = now;
      }
    }

    updateStats(data = {}) {
      if (!this.isVisible) return;

      const formatTime = (ms) => {
        const totalSec = Math.max(0, Math.floor(ms / 1000));
        const m = Math.floor(totalSec / 60);
        const s = totalSec % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      };

      if (data.precision && this.precisionEl) {
        this.precisionEl.textContent = data.precision.toUpperCase();
        this.pillEl.textContent = data.precision.toUpperCase();
        this.pillEl.className = `hud-pill pill-${data.precision}`;
      }

      if (data.source && this.sourceEl) this.sourceEl.textContent = data.source;
      if (data.status && this.statusEl) this.statusEl.textContent = data.status.toUpperCase();

      if (data.track && this.trackEl) {
        this.trackEl.textContent = `${data.track.title || '—'} - ${data.track.artist || ''}`;
      }

      if (data.positionMs !== undefined && this.posEl) {
        this.posEl.textContent = `${formatTime(data.positionMs)} / ${formatTime(data.durationMs || 0)}`;
      }

      if (data.activeWord && this.cueEl) {
        this.cueEl.textContent = `"${data.activeWord.text}" (${formatTime(data.activeWord.startMs)} - ${formatTime(data.activeWord.endMs)})`;
      } else if (data.activeWord === null && this.cueEl) {
        this.cueEl.textContent = "—";
      }

      if (data.driftMs !== undefined && this.driftEl) {
        this.driftEl.textContent = `${data.driftMs >= 0 ? '+' : ''}${data.driftMs} ms`;
        this.driftEl.style.color = Math.abs(data.driftMs) < 150 ? '#66ffaa' : (Math.abs(data.driftMs) < 500 ? '#ffcc00' : '#ff4466');
      }

      if (data.bridgeConnected !== undefined && this.bridgeEl) {
        this.bridgeEl.textContent = data.bridgeConnected ? `Connected (${data.latencyMs || 0}ms)` : 'Disconnected (Retrying)';
        this.bridgeEl.style.color = data.bridgeConnected ? '#66ffaa' : '#ff4466';
      }

      if (data.snapshotAgeSec !== undefined && this.ageEl) {
        this.ageEl.textContent = data.snapshotAgeSec >= 0 ? `${data.snapshotAgeSec}s ago` : 'None';
      }

      if (this.perfEl) {
        this.perfEl.textContent = `${this.fps} FPS (${this.frameDeltaMs.toFixed(1)}ms)`;
      }

      if (data.reducedMotion !== undefined && this.motionEl) {
        this.motionEl.textContent = data.reducedMotion ? "Reduced" : "Full Spring Physics";
      }
    }
  }

  exports.DevHUD = DevHUD;
})(window.SongNode);

