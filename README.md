# DREAMSCAPE • Cinematic Liquid-Chrome Lyric Wallpaper

A cinematic, audio-aware lyric wallpaper for Windows. Built around one visual idea: **every word is a node on a living path, and the camera travels with the currently active word.**

Designed for **Lively Wallpaper** and **Wallpaper Engine**, featuring a host adapter boundary so different hosts consume the same normalized visual renderer.

![Liquid Chrome Visual Direction](https://user-images.githubusercontent.com/placeholder/song-node-concept.png)

> **Design Direction:** Liquid-chrome editorial. A dark reflective mercury surface frames a quiet lyric stage; one rose-lit spline connects individual word nodes; one active word dominates; the camera follows it with intent. No space-visualizer clutter or fake player controls.

---

## 1. Product Goals & Non-Goals

### Core Goals
1. **Real-time Track & Lyrics Display**: Syncs real-time song lyrics from Apple Music for Windows, Spotify, iTunes, or any Windows SMTC media session.
2. **Organic Node Spline**: Each word is a distinct node on one continuous Catmull–Rom curve.
3. **Typographic Hierarchy**: The active word is optically dominant in ivory Didone italic with restrained ruby bloom, while past and upcoming words recede into depth.
4. **Spring-Damped Camera**: Follows the active node with critically damped spring physics and anticipation look-ahead toward the next node.
5. **Restrained Quiet Stage**: Molten mercury background frames the scene while keeping the central stage dark and clear for high editorial contrast.
6. **Honest Synchronization**: Strictly distinguishes between word-level sync (`word`) and line-level sync (`line`). Never fabricates pseudo-word timing from character counts.

### Non-Goals
- Full music player or media playback UI.
- Competing spline systems, large orbital rings, or constant particle storms.
- Fake "precise" word timestamps inferred from character count.
- Cluttered HUD panels over the artwork.

---

## 2. Visual Architecture — Liquid Chrome Edition

### Palette

| Color | CSS Variable | Hex Code | Role |
|---|---|---|---|
| Ink | `--ink` | `#050407` | Canvas base & deep obsidian shadows |
| Cherry | `--cherry` | `#160710` | Crevices and dark liquid metal reflections |
| Plum | `--plum` | `#321027` | Secondary specular bounce & midtones |
| Chrome | `--chrome` | `#d9d5df` | Pearl-silver specular fold crests |
| Chrome Shadow | `--chrome-shadow` | `#39313d` | Metallic fold depth |
| Ruby | `--ruby` | `#f12d78` | Active node radiant bloom & filament halo |
| Rose | `--rose` | `#ff8ab8` | Filament mid-glow & lens flare glints |
| Ivory | `--ivory` | `#f7eef3` | Active word Didone typography & core light |
| Muted | `--muted` | `#927f8b` | Supporting text, clock seconds & metadata |

### Composition & Typography
- **Background Layer (WebGL GLSL Shader)**: Domain-warped procedural liquid metal with finite-difference surface normals, softbox specular highlights, and a dark center stage mask.
- **Foreground Stage (Canvas 2D)**: Subpixel-rendered Catmull–Rom spline, radiant ruby blooms, Didone typography (`Cormorant Garamond`, `Playfair Display`), and subtle reticle crosshairs.
- **Clock**: Architectural Didone italic clock in the top-left with tabular seconds and wide-tracked date.
- **Track Identity & Timeline**: Top-right audio equalizer with artist/album, and bottom-left progress bar with elapsed/total duration.

---

## 3. Synchronisation & Runtime Architecture

```text
┌──────────────────────────────┐
│       Media Applications     │
│ Apple Music / Spotify / etc. │
└──────────────┬───────────────┘
               │ Windows Media Session (WinRT GSMTC)
               ▼
┌──────────────────────────────┐
│       Media Bridge           │
│ Python / winsdk / Monotonic  │
│ track + state + position     │
└──────────────┬───────────────┘
               │ WebSocket IPC (ws://127.0.0.1:8765)
               ▼
┌──────────────────────────────┐       ┌──────────────────────────┐
│       Media Adapter          │◄──────│       Lyric Provider     │
│ Normalize & Validate         │       │ Enhanced LRC / Cue Sheet │
└──────────────┬───────────────┘       └──────────────────────────┘
               │
               ▼
┌──────────────────────────────┐
│     Lyric Time Controller    │
│  active line / active word   │
│  seek + pause + drift repair │
└──────────────┬───────────────┘
               │ render state
               ▼
┌──────────────────────────────┐
│      Scene / Camera Engine   │
│  word nodes + spline + spring│
└──────────────┬───────────────┘
               ▼
┌──────────────────────────────┐
│        Canvas / WebGL        │
│ liquid chrome + type + bloom │
└──────────────────────────────┘
```

### Precision Modes

| Mode | Available Data | Visual Behavior |
|---|---|---|
| `word` | Word-level timestamps (Enhanced LRC or JSON cue sheet) | Active word advances at its explicit cue time |
| `line` | Line-level timestamps (Standard LRC) | Whole line advances together; word nodes remain connected without fake timestamps |
| `demo` | Scripted showcase timeline | Fully animated reference phrases ("New Person, Same Old Mistakes", "Let It Happen") |
| `idle` | No active playback / no lyrics | Ambient liquid chrome background with metadata; no stale lyrics |

---

## 4. Keyboard Controls

| Key | Action |
|---|---|
| `Space` | Toggle Demo Mode (Showcase reference phrase) |
| `ArrowRight` / `ArrowLeft` | Cycle through demo track presets |
| `H` | Toggle Developer Telemetry HUD (hidden by default) |
| `R` | Reconnect to local Media Bridge WebSocket |
| `F` | Toggle Reduced Motion Mode (locks camera & suppresses intense blooms) |

### Developer HUD Telemetry
Press **`H`** at any time to inspect:
- Active media source and session state
- Current track title, artist, and album
- Extrapolated timeline position vs. duration
- Timing precision mode (`word`, `line`, `demo`, `idle`)
- Active word cue timestamp & bounds
- Real-time clock drift (ms)
- Bridge connection status, heartbeat latency, and snapshot age
- Render FPS and frame delta time

---

## 5. Quick Start & Setup

### Running in Lively Wallpaper
1. Open **Lively Wallpaper**.
2. Drag and drop the `Song-node` folder into Lively Wallpaper (or choose "Add Wallpaper" and select `index.html`).
3. Set as active wallpaper. The wallpaper starts in offline showcase mode immediately.

### Connecting Live Apple Music / Spotify
1. Double-click `run_bridge.bat` (or run `python bridge.py`).
2. Play any track in Apple Music or Spotify on Windows.
3. The wallpaper automatically connects via WebSocket (`ws://127.0.0.1:8765`), synchronizes track progress, loads lyrics, and follows the singer in real-time.

---

## 6. Directory Structure

```text
song-node/
├─ index.html                     # Entry point (Lively / Web)
├─ LivelyInfo.json                # Lively Wallpaper manifest
├─ bridge.py                      # Windows SMTC & LRCLIB companion bridge
├─ run_bridge.bat                 # One-click bridge launcher
├─ requirements.txt               # Bridge dependencies (winsdk, websockets, requests)
├─ css/
│  └─ style.css                   # Liquid chrome editorial stylesheet
├─ js/
│  ├─ app.js                      # Application orchestrator
│  ├─ audioReact.js               # Audio reactivity & transient analyzer
│  ├─ adapters/
│  │  ├─ bridge.adapter.js        # WebSocket client for bridge
│  │  └─ lively.adapter.js        # Lively hooks (livelyCurrentTrack, livelyAudioListener)
│  ├─ media/
│  │  ├─ track.matcher.js         # String normalization & track key generator
│  │  └─ media.normalizer.js      # Normalized event contract v1 parser
│  ├─ lyrics/
│  │  ├─ lyric.parser.js          # Enhanced LRC & cue sheet parser
│  │  ├─ lyric.clock.js           # Sub-millisecond extrapolator & drift compensator
│  │  └─ lyric.provider.js        # Demo & LRCLIB lyric provider
│  ├─ scene/
│  │  ├─ liquid-chrome.shader.js  # GPU WebGL liquid mercury background
│  │  ├─ spline-path.js           # Single Catmull–Rom rose filament
│  │  ├─ camera-rig.js            # Spring-damped camera with look-ahead
│  │  ├─ word-graph.js            # Word nodes & phrase layout
│  │  └─ scene-renderer.js        # Canvas 2D editorial renderer
│  └─ hud/
│     └─ dev-hud.js               # Telemetry diagnostic overlay
└─ lyrics/
   ├─ demo/                       # Offline showcase cue sheets
   │  ├─ new-person-same-old-mistakes.json
   │  └─ let-it-happen.json
   └─ custom/                     # User custom cue sheets & LRC files
```

---

## 7. Design Philosophy

> **"The word is the event. The node is the anchor. The path is the memory. The camera is the point of view. Everything else should stay quiet."**
