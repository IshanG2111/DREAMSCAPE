/* =========================================================================
   APPLICATION ORCHESTRATOR
   Coordinates Media Bridge, Lyric Clock, Camera Rig, Spline Path,
   and Liquid Chrome GLSL Shader into a unified cinematic experience.
   ========================================================================= */

window.SongNode = window.SongNode || {};

(function() {
  // 1. Canvases & Viewport
  const liquidCanvas = document.getElementById('liquidCanvas');
  const stageCanvas = document.getElementById('stageCanvas');

  // 2. Core Scene Subsystems
  const liquidShader = new window.SongNode.LiquidChromeShader(liquidCanvas);
  const wordGraph = new window.SongNode.WordGraph();
  const splinePath = new window.SongNode.SplinePath();
  const cameraRig = new window.SongNode.CameraRig();
  const sceneRenderer = new window.SongNode.SceneRenderer(stageCanvas, wordGraph, splinePath, cameraRig);

  // 3. Audio & Timing
  const audioReact = new window.SongNode.AudioReact();
  const lyricClock = new window.SongNode.LyricClock();
  const lyricProvider = new window.SongNode.LyricProvider();

  // 4. Adapters & Developer Tools
  const bridgeAdapter = new window.SongNode.BridgeAdapter();
  const livelyAdapter = new window.SongNode.LivelyAdapter();
  const devHud = new window.SongNode.DevHUD();

  // 5. DOM HUD Elements
  const dateLabel = document.getElementById('dateLabel');
  const clockHours = document.getElementById('clockHours');
  const clockMinutes = document.getElementById('clockMinutes');
  const clockSeconds = document.getElementById('clockSeconds');
  const hudAlbum = document.getElementById('hudAlbum');
  const hudArtist = document.getElementById('hudArtist');
  const hudTrackTitle = document.getElementById('hudTrackTitle');
  const hudTrackTime = document.getElementById('hudTrackTime');
  const timelineFill = document.getElementById('timelineFill');
  const timelineBead = document.getElementById('timelineBead');
  const audioBars = document.getElementById('audioBars');

  let activeTrack = null;
  let currentActiveWord = null;

  // Format milliseconds to mm:ss
  function formatTime(ms) {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  // 6. Connect Lyric Clock to Word Graph & Camera Rig
  lyricClock.onActivePhraseChange = (windowWords, heroIndex, centerWordData) => {
    currentActiveWord = centerWordData;
    wordGraph.setPhraseWindow(windowWords, heroIndex, centerWordData);
    cameraRig.setTarget(wordGraph.getActiveNode(), wordGraph.getNextNode());
  };

  // 7. Track & HUD Updates
  function updateTrackHUD(track, durationMs, positionMs) {
    if (!track) {
      if (hudTrackTitle) hudTrackTitle.textContent = "IDLE";
      if (hudArtist) hudArtist.textContent = "";
      if (hudAlbum) hudAlbum.textContent = "";
      if (hudTrackTime) hudTrackTime.textContent = "0:00 / 0:00";
      if (timelineFill) timelineFill.style.width = "0%";
      if (timelineBead) timelineBead.style.left = "0%";
      return;
    }

    if (hudTrackTitle) hudTrackTitle.textContent = (track.title || "UNKNOWN").toUpperCase();
    if (hudArtist) hudArtist.textContent = (track.artist || "").toUpperCase();
    if (hudAlbum) hudAlbum.textContent = (track.album || track.artist || "CURRENT TRACK").toUpperCase();

    if (durationMs > 0) {
      const pct = Math.min(100, Math.max(0, (positionMs / durationMs) * 100));
      if (timelineFill) timelineFill.style.width = `${pct}%`;
      if (timelineBead) timelineBead.style.left = `${pct}%`;
      if (hudTrackTime) hudTrackTime.textContent = `${formatTime(positionMs)} / ${formatTime(durationMs)}`;
    } else {
      if (hudTrackTime) hudTrackTime.textContent = `${formatTime(positionMs)}`;
    }
  }

  // 8. Bridge Event Binding
  bridgeAdapter.onMediaSnapshot = (snapshot) => {
    if (!snapshot) return;

    const track = snapshot.track;
    const playback = snapshot.playback;

    // Detect track change
    const isNewTrack = !activeTrack || (track && (track.title !== activeTrack.title || track.artist !== activeTrack.artist));
    if (isNewTrack && track && track.title) {
      activeTrack = track;
      lyricClock.durationMs = track.durationMs || 0;
    }

    lyricClock.setPlaybackSnapshot(playback);
    updateTrackHUD(activeTrack, track?.durationMs || lyricClock.durationMs, playback.positionMs);
  };

  bridgeAdapter.onLyricsLoaded = (lyricPayload) => {
    if (lyricPayload) {
      lyricClock.setLyrics(lyricPayload, false);
    }
  };

  // 9. Lively Wallpaper Integration
  livelyAdapter.onTrackChange = (normalizedTrack) => {
    // If bridge is not connected, use Lively track info
    if (!bridgeAdapter.isConnected && normalizedTrack) {
      activeTrack = normalizedTrack.track;
      updateTrackHUD(activeTrack, 0, 0);

      // Query LRCLIB for lyrics
      lyricProvider.fetchLrclib(activeTrack.title, activeTrack.artist).then((lyrics) => {
        if (lyrics) {
          lyricClock.setLyrics(lyrics, false);
        }
      });
    }
  };

  livelyAdapter.onAudioData = (audioArray) => {
    audioReact.processLivelyAudio(audioArray);
  };

  livelyAdapter.onPauseChange = (isPaused) => {
    if (isPaused) {
      lyricClock.status = 'paused';
    }
  };

  // 10. Demo Mode Management
  async function activateDemo(index = 0) {
    const { preset, lyrics } = await lyricProvider.loadDemo(index);

    activeTrack = {
      title: preset.title,
      artist: preset.artist,
      album: preset.album,
      durationMs: preset.durationMs
    };

    lyricClock.durationMs = preset.durationMs;
    lyricClock.anchorPositionMs = preset.startOffsetMs || 0;
    lyricClock.anchorMonotonicMs = performance.now();
    lyricClock.status = 'playing';

    lyricClock.setLyrics(lyrics, true);
    updateTrackHUD(activeTrack, preset.durationMs, lyricClock.anchorPositionMs);
  }

  // 11. Keyboard Controls
  window.addEventListener('keydown', (e) => {
    const key = e.key;

    // Space: Toggle Demo Mode
    if (key === ' ' || key === 'Spacebar') {
      e.preventDefault();
      if (lyricProvider.isDemoMode) {
        lyricProvider.isDemoMode = false;
        lyricClock.setLyrics(null, false);
        activeTrack = null;
        updateTrackHUD(null, 0, 0);
      } else {
        activateDemo(0);
      }
    }
    // Arrow Right: Next Demo
    else if (key === 'ArrowRight') {
      e.preventDefault();
      lyricProvider.nextDemo().then(({ preset, lyrics }) => {
        activateDemo(lyricProvider.activeDemoIndex);
      });
    }
    // Arrow Left: Previous Demo
    else if (key === 'ArrowLeft') {
      e.preventDefault();
      lyricProvider.prevDemo().then(({ preset, lyrics }) => {
        activateDemo(lyricProvider.activeDemoIndex);
      });
    }
    // H: Toggle Developer HUD
    else if (key === 'h' || key === 'H') {
      devHud.toggle();
    }
    // R: Reconnect Bridge WebSocket
    else if (key === 'r' || key === 'R') {
      bridgeAdapter.reconnectNow();
    }
    // F: Toggle Reduced Motion
    else if (key === 'f' || key === 'F') {
      cameraRig.toggleReducedMotion();
    }
  });

  // 12. Clock HUD Update
  function updateSystemClock() {
    const now = new Date();
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

    if (dateLabel) {
      dateLabel.textContent = `${days[now.getDay()]} ${String(now.getDate()).padStart(2, '0')} ${months[now.getMonth()]}`;
    }

    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');

    if (clockHours && clockHours.textContent !== h) clockHours.textContent = h;
    if (clockMinutes && clockMinutes.textContent !== m) clockMinutes.textContent = m;
    if (clockSeconds && clockSeconds.textContent !== s) clockSeconds.textContent = s;
  }

  // 13. Responsive Resize Handler
  function handleResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    liquidShader.resize(w, h);
    sceneRenderer.resize(w, h);
  }
  window.addEventListener('resize', handleResize);

  // 14. Master Render Animation Loop
  let lastFrameTime = performance.now();
  let clockTimer = 0;

  function renderLoop(currentTime) {
    const dt = Math.min(0.05, Math.max(0.001, (currentTime - lastFrameTime) / 1000));
    lastFrameTime = currentTime;
    const timeSec = currentTime * 0.001;

    // 1. Update Clock Display once per second
    clockTimer += dt;
    if (clockTimer >= 1.0) {
      clockTimer = 0;
      updateSystemClock();
    }

    // 2. Update Audio Reactive Engine
    audioReact.update(dt);
    const audioBands = audioReact.bands;

    // Animate Top-Right Audio Equalizer Bars
    if (audioBars) {
      const bars = audioBars.children;
      if (bars.length >= 5) {
        bars[0].style.height = `${8 + audioBands.bass * 14}px`;
        bars[1].style.height = `${12 + audioBands.mids * 16}px`;
        bars[2].style.height = `${6 + audioBands.treble * 10}px`;
        bars[3].style.height = `${10 + audioBands.bass * 12}px`;
        bars[4].style.height = `${5 + audioBands.mids * 10}px`;
      }
    }

    // 3. Update Lyric Timing Extrapolator
    const currentPositionMs = lyricClock.update(currentTime);

    // If playing in demo mode and reaching end of phrase, loop smoothly
    if (lyricProvider.isDemoMode && lyricClock.status === 'playing') {
      if (currentPositionMs > 173000 && lyricProvider.activeDemoIndex === 0) {
        lyricClock.anchorPositionMs = 164200;
        lyricClock.anchorMonotonicMs = performance.now();
      } else if (currentPositionMs > 93000 && lyricProvider.activeDemoIndex === 1) {
        lyricClock.anchorPositionMs = 81200;
        lyricClock.anchorMonotonicMs = performance.now();
      }
    }

    // 4. Update Physics & Camera Rig
    cameraRig.update(dt);
    wordGraph.update(dt);

    // 5. Update Timeline HUD
    if (activeTrack && lyricClock.durationMs > 0) {
      const pct = Math.min(100, Math.max(0, (currentPositionMs / lyricClock.durationMs) * 100));
      if (timelineFill) timelineFill.style.width = `${pct}%`;
      if (timelineBead) timelineBead.style.left = `${pct}%`;
      if (hudTrackTime) hudTrackTime.textContent = `${formatTime(currentPositionMs)} / ${formatTime(lyricClock.durationMs)}`;
    }

    // 6. Render Layer 0: GPU Molten Mercury Liquid Chrome
    liquidShader.render(timeSec, audioBands);

    // 7. Render Layer 1: Foreground Editorial Canvas Stage
    sceneRenderer.render(dt, timeSec, audioBands);

    // 8. Developer Telemetry HUD
    devHud.recordFrame(currentTime);
    devHud.updateStats({
      precision: lyricClock.timingPrecision,
      source: activeTrack?.source || (lyricProvider.isDemoMode ? 'Demo Script' : (bridgeAdapter.isConnected ? 'Windows SMTC' : 'None')),
      status: lyricClock.status,
      track: activeTrack,
      positionMs: currentPositionMs,
      durationMs: lyricClock.durationMs,
      activeWord: currentActiveWord,
      driftMs: lyricClock.lastDriftMs,
      bridgeConnected: bridgeAdapter.isConnected,
      latencyMs: bridgeAdapter.latencyMs,
      snapshotAgeSec: bridgeAdapter.getLastSnapshotAgeSec(),
      reducedMotion: cameraRig.reducedMotion
    });

    requestAnimationFrame(renderLoop);
  }

  // Initialize System Clock & Start Showcase Demo
  updateSystemClock();
  activateDemo(0);

  // Start Animation Loop
  requestAnimationFrame(renderLoop);
})();
