/* =========================================================================
   DREAMSCAPE MASTER ORCHESTRATOR
   Integrates React Bits Aurora, React Bits Constellation Lyric Stage,
   Stereo Audio Engine, Bulletproof Lyric Sync, and Editorial HUD.
   ========================================================================= */

window.SongNode = window.SongNode || {};

(function() {
  // 1. Canvases & Components
  const liquidCanvas = document.getElementById('liquidCanvas');
  const stageCanvas = document.getElementById('stageCanvas');

  const aurora = new window.SongNode.ReactBitsAurora(liquidCanvas);
  const constellation = new window.SongNode.ReactBitsConstellation(stageCanvas);
  const audioEngine = new window.SongNode.AudioEngine();
  const lyricSync = new window.SongNode.LyricSyncEngine();
  const lyricProvider = new window.SongNode.LyricProvider();

  // Host Adapters
  const bridgeAdapter = new window.SongNode.BridgeAdapter();
  const livelyAdapter = new window.SongNode.LivelyAdapter();

  // 2. DOM Elements
  const dateLabel = document.getElementById('dateLabel');
  const clockHours = document.getElementById('clockHours');
  const clockMinutes = document.getElementById('clockMinutes');
  const clockSeconds = document.getElementById('clockSeconds');

  const audioBars = document.getElementById('audioBars');
  const hudAlbum = document.getElementById('hudAlbum');
  const hudArtist = document.getElementById('hudArtist');
  const btnPrev = document.getElementById('btnPrev');
  const btnPlayPause = document.getElementById('btnPlayPause');
  const btnNext = document.getElementById('btnNext');

  const rightNavDots = document.getElementById('rightNavDots');

  const hudTrackTitle = document.getElementById('hudTrackTitle');
  const hudTrackTime = document.getElementById('hudTrackTime');
  const timelineBar = document.getElementById('timelineBar');
  const timelineFill = document.getElementById('timelineFill');
  const timelineBead = document.getElementById('timelineBead');
  const btnLoop = document.getElementById('btnLoop');

  let activeTrack = null;
  let isLooping = true;
  let isScrubbing = false;

  function formatTime(ms) {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  function updatePlayPauseIcon(isPlaying) {
    if (!btnPlayPause) return;
    if (isPlaying) {
      btnPlayPause.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;
      btnPlayPause.title = "Pause (Space)";
    } else {
      btnPlayPause.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
      btnPlayPause.title = "Play (Space)";
    }
  }

  function updateActiveDot(index) {
    if (!rightNavDots) return;
    const dots = rightNavDots.querySelectorAll('.nav-dot');
    dots.forEach((dot, idx) => {
      if (idx === (index % dots.length)) dot.classList.add('active');
      else dot.classList.remove('active');
    });
  }

  // 3. Connect Lyric Sync Engine to Constellation Stage
  lyricSync.onSyncUpdate = ({ lineWords, activeWordIndex, isVocal, currentMs, durationMs }) => {
    // Pass stable line words to constellation: words DO NOT jump slots!
    constellation.setLine(lineWords, activeWordIndex, isVocal);

    // Update timeline HUD
    if (!isScrubbing && durationMs > 0) {
      const pct = Math.min(100, Math.max(0, (currentMs / durationMs) * 100));
      if (timelineFill) timelineFill.style.width = `${pct}%`;
      if (timelineBead) timelineBead.style.left = `${pct}%`;
      if (hudTrackTime) hudTrackTime.textContent = `${formatTime(currentMs)} / ${formatTime(durationMs)}`;
    }
  };

  // 4. Connect Audio Engine Note Triggers to Constellation Shockwaves
  audioEngine.onNote = (type, energy) => {
    constellation.triggerNote(energy);
  };

  // 5. Track Management & Demo Activation
  async function activateDemo(index = 0) {
    const { preset, lyrics } = await lyricProvider.loadDemo(index);

    activeTrack = {
      title: preset.title,
      artist: preset.artist,
      album: preset.album,
      durationMs: preset.durationMs
    };

    if (hudTrackTitle) hudTrackTitle.textContent = preset.title.toUpperCase();
    if (hudArtist) hudArtist.textContent = preset.artist.toUpperCase();
    if (hudAlbum) hudAlbum.textContent = preset.album.toUpperCase();

    lyricSync.setLyrics(lyrics);
    lyricSync.seek(preset.startOffsetMs || 0);
    lyricSync.play();

    audioEngine.startSynth();
    updatePlayPauseIcon(true);
    updateActiveDot(index);
  }

  // 6. Playback Controls
  function togglePlayPause() {
    audioEngine.ensureContext();
    const isPlaying = lyricSync.togglePlay();
    if (isPlaying) {
      audioEngine.startSynth();
      updatePlayPauseIcon(true);
    } else {
      audioEngine.stopSynth();
      updatePlayPauseIcon(false);
    }
  }

  function nextTrack() {
    audioEngine.ensureContext();
    lyricProvider.nextDemo().then(() => {
      activateDemo(lyricProvider.activeDemoIndex);
    });
  }

  function prevTrack() {
    audioEngine.ensureContext();
    if (lyricSync.currentMs - lyricSync.anchorPosMs > 4000) {
      lyricSync.seek(Math.max(0, lyricSync.currentMs - 15000));
    } else {
      lyricProvider.prevDemo().then(() => {
        activateDemo(lyricProvider.activeDemoIndex);
      });
    }
  }

  if (btnPlayPause) btnPlayPause.addEventListener('click', togglePlayPause);
  if (btnNext) btnNext.addEventListener('click', nextTrack);
  if (btnPrev) btnPrev.addEventListener('click', prevTrack);

  if (btnLoop) {
    btnLoop.addEventListener('click', () => {
      isLooping = !isLooping;
      btnLoop.style.opacity = isLooping ? '1.0' : '0.4';
    });
  }

  // Right nav dots click
  if (rightNavDots) {
    rightNavDots.querySelectorAll('.nav-dot').forEach((dot) => {
      dot.addEventListener('click', (e) => {
        e.stopPropagation();
        audioEngine.ensureContext();
        const idx = parseInt(dot.getAttribute('data-index'), 10) || 0;
        activateDemo(idx % 3);
        updateActiveDot(idx);
      });
    });
  }

  // 7. Interactive Timeline Scrubbing
  function seekToClientX(clientX) {
    if (!timelineBar || lyricSync.durationMs <= 0) return;
    const rect = timelineBar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const seekMs = Math.round(ratio * lyricSync.durationMs);

    lyricSync.seek(seekMs);

    const pct = ratio * 100;
    if (timelineFill) timelineFill.style.width = `${pct}%`;
    if (timelineBead) timelineBead.style.left = `${pct}%`;
    if (hudTrackTime) hudTrackTime.textContent = `${formatTime(seekMs)} / ${formatTime(lyricSync.durationMs)}`;
  }

  if (timelineBar) {
    timelineBar.addEventListener('mousedown', (e) => {
      isScrubbing = true;
      audioEngine.ensureContext();
      seekToClientX(e.clientX);
    });
    window.addEventListener('mousemove', (e) => {
      if (isScrubbing) seekToClientX(e.clientX);
    });
    window.addEventListener('mouseup', () => {
      isScrubbing = false;
    });

    timelineBar.addEventListener('touchstart', (e) => {
      isScrubbing = true;
      audioEngine.ensureContext();
      if (e.touches.length > 0) seekToClientX(e.touches[0].clientX);
    }, { passive: true });
    window.addEventListener('touchmove', (e) => {
      if (isScrubbing && e.touches.length > 0) seekToClientX(e.touches[0].clientX);
    }, { passive: true });
    window.addEventListener('touchend', () => {
      isScrubbing = false;
    });
  }

  // 8. Bridge Adapter (Windows SMTC: Apple Music / Spotify)
  bridgeAdapter.onMediaSnapshot = (snapshot) => {
    if (!snapshot) return;
    const track = snapshot.track;
    const playback = snapshot.playback;

    if (track && track.title) {
      activeTrack = track;
      if (hudTrackTitle) hudTrackTitle.textContent = track.title.toUpperCase();
      if (hudArtist) hudArtist.textContent = (track.artist || "").toUpperCase();
      if (hudAlbum) hudAlbum.textContent = (track.album || track.artist || "CURRENT TRACK").toUpperCase();
      lyricSync.durationMs = track.durationMs || lyricSync.durationMs;
    }

    if (playback) {
      if (playback.status === 'playing') {
        lyricSync.play();
        lyricSync.seek(playback.positionMs || 0);
        updatePlayPauseIcon(true);
      } else {
        lyricSync.pause();
        updatePlayPauseIcon(false);
      }
    }
  };

  bridgeAdapter.onLyricsLoaded = (lyricPayload) => {
    if (lyricPayload) {
      lyricSync.setLyrics(lyricPayload);
    }
  };

  // 9. Lively Wallpaper Integration
  livelyAdapter.onTrackChange = (normalizedTrack) => {
    if (!bridgeAdapter.isConnected && normalizedTrack) {
      activeTrack = normalizedTrack.track;
      if (hudTrackTitle) hudTrackTitle.textContent = (activeTrack.title || "").toUpperCase();
      if (hudArtist) hudArtist.textContent = (activeTrack.artist || "").toUpperCase();
      lyricSync.seek(0);
      lyricSync.play();

      lyricProvider.fetchLrclib(activeTrack.title, activeTrack.artist).then((lyrics) => {
        if (lyrics) lyricSync.setLyrics(lyrics);
      });
    }
  };

  livelyAdapter.onAudioData = (audioArray) => {
    // Process external Lively audio array
    if (audioArray && audioArray.length > 0) {
      let b = 0, m = 0, tr = 0;
      for (let i = 0; i < 15; i++) b += audioArray[i] || 0;
      for (let i = 15; i < 50; i++) m += audioArray[i] || 0;
      for (let i = 50; i < 120; i++) tr += audioArray[i] || 0;
      audioEngine.bands.bass = (b / 15) * 2.5;
      audioEngine.bands.mids = (m / 35) * 2.2;
      audioEngine.bands.treble = (tr / 70) * 2.0;
    }
  };

  // 10. Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      togglePlayPause();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      nextTrack();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      prevTrack();
    } else if (e.key === '[' || e.key === ']') {
      e.preventDefault();
      const step = e.key === '[' ? -50 : 50;
      lyricSync.manualOffsetMs += step;
    } else if (e.key === 'f' || e.key === 'F') {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    }
  });

  // 11. Architectural System Clock
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

  // 12. Responsive Resize
  function handleResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    aurora.resize(w, h);
    constellation.resize(w, h);
  }
  window.addEventListener('resize', handleResize);

  // 13. Master Render Loop
  let lastTime = performance.now();
  let clockTimer = 0;

  function renderLoop(currentTime) {
    const dt = Math.min(0.05, Math.max(0.001, (currentTime - lastTime) / 1000));
    lastTime = currentTime;
    const timeSec = currentTime * 0.001;

    // Clock
    clockTimer += dt;
    if (clockTimer >= 1.0) {
      clockTimer = 0;
      updateSystemClock();
    }

    // Audio bands & Note decay
    audioEngine.update(dt);
    const bands = audioEngine.bands;

    // Update 7-Bar Equalizer
    if (audioBars) {
      const bars = audioBars.children;
      const b = bands.bass;
      const m = bands.mids;
      const tr = bands.treble;
      const note = audioEngine.noteEnergy;
      if (bars.length >= 7) {
        bars[0].style.height = `${6 + (b * 0.7 + note * 0.3) * 16}px`;
        bars[1].style.height = `${10 + (b * 0.9 + note * 0.4) * 18}px`;
        bars[2].style.height = `${7 + (m * 0.8 + note * 0.3) * 14}px`;
        bars[3].style.height = `${12 + (m * 1.0 + note * 0.5) * 20}px`;
        bars[4].style.height = `${8 + (tr * 0.8 + note * 0.3) * 16}px`;
        bars[5].style.height = `${11 + (tr * 0.9 + note * 0.4) * 18}px`;
        bars[6].style.height = `${5 + (tr * 0.6 + note * 0.2) * 12}px`;
      }
    }

    // Update Lyric Synchronization Engine
    lyricSync.update(currentTime);

    // Render Layer 0: GPU Aurora Cosmic Silk Shader
    aurora.render(timeSec, bands);

    // Render Layer 1: Constellation & TrueFocus Lyric Stage
    constellation.update(dt, timeSec, bands);
    constellation.render(timeSec, bands);

    requestAnimationFrame(renderLoop);
  }

  // Initialize
  updateSystemClock();
  activateDemo(0);
  requestAnimationFrame(renderLoop);
})();
