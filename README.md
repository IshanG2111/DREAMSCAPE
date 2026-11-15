# DREAMSCAPE — THE LIVING ALBUM
## Cinematic Album Player × Generative ASCII Typography × Audio-Reactive Lyric Wallpaper

> A production-quality, minimal editorial audiovisual artwork for Windows.

DREAMSCAPE unites physical optical media, generative ASCII art, kinetic editorial typography, and synchronized music playback into one cohesive 16:9 widescreen composition.

---

## 1. Composition Architecture

```
+---------------------------------------------------------------------------------------------------+
|  [SUN 15 NOV]                                                                         [WAVY]     |
|  05:09 25                                                         KARAN AUJLA · JAY TRAK  • [01] |
|                                                                                             [02] |
|                                             ...:irsXA253hMHGS#9B&@                          [03] |
|      +-------------------------+          .::;;;irsXA253hMHGS#9B&@                          [04]▶|
|      |  [PHYSICAL 3D CD]       |         :::;;;irsXA253hMHGS#9B&@                           [05] |
|      |   TRANSPARENT CASING    |        :::;;irsXA253hMHGS#9B&@                             [06] |
|      |   CORNER STANDOFFS      |                                                                 |
|      |   INTERNAL LASER SLED   |        and it's                                                 |
|      |   ROTATING OPTICAL DISC |                coming on                                        |
|      |   ALBUM ART IMPRINTED   |                   ───────                                       |
|      +-------------------------+                                                                 |
|                                                                                                  |
|  [■] LET IT HAPPEN         ||||l|!|||      ~~~~~~~~~~~~(Fluid Audio-Reactive Ribbons)~~~~~~~~~~~ |
|      TAME IMPALA                                                                                 |
|  3:02  ──────────●────────────  7:47                                             ALBUM / CURRENTS |
|                                                                                       YEAR / 2015 |
|                                                                          GENRE / PSYCHEDELIC ROCK |
+---------------------------------------------------------------------------------------------------+
```

- **LEFT REGION (~40%) — THE ALBUM OBJECT**:
  - Transparent square acrylic casing with realistic thickness, refraction, bevel edge reflections, and corner standoffs.
  - Visible internal mechanical details: laser guide rods, optical pickup carriage with miniature red laser diode emitter, and edge lighting.
  - Centrally mounted optical CD disc with album artwork imprinted circular on the disc surface, inner clamp hub, center spindle aperture, and screen-printed surface typography.
  - Smooth continuous rotation during playback with physical inertia deceleration on pause, rotating anisotropic rainbow reflection sheen, and interactive 3D mouse parallax tilt.

- **RIGHT REGION (~60%) — GENERATIVE ASCII ARTWORK & KINETIC TYPOGRAPHY**:
  - High-performance luminance-mapped ASCII engine utilizing character ramp: ` .,:;irsXA253hMHGS#9B&@`.
  - Organic profile silhouette and fluid contours evolving continuously with audio bass and frequency flux.
  - Audio-reactive undulating particle wave ribbons at the base of the silhouette.
  - Floating photographic negative strip accent and orbital elliptical graphic curve.
  - High-contrast display serif typography (*Cormorant Garamond* / *Playfair Display*):
    - **Active Word**: Massive typographic scale, luminous halation glow, and smooth vocal progress light sweep.
    - **Previous Words**: Smaller scale, reduced opacity context.
    - **Upcoming Words**: Delicate trailing line / underline rule.

- **EDITORIAL INTERFACE**:
  - Top-Left: Architectural date and high-contrast display serif clock with seconds superscript.
  - Top-Right: Track title, artist attribution, pulsating crimson playing dot, and interactive tracklist indices (`[ 01 ]` to `[ 06 ]`).
  - Bottom-Left: Mini square album thumbnail, title, artist, real-time mini equalizer spectrum bars, and a scrubbable hairline progress rail with glowing circular handle bead.
  - Bottom-Right: Stacked metadata (`ALBUM / ...`, `YEAR / ...`, `GENRE / ...`) and precision registration crosshairs (`+`).

---

## 2. Keyboard Controls & Shortcuts

| Key | Action |
|---|---|
| **Space** | Play / Pause (disc smoothly starts / decelerates with physical inertia) |
| **Arrow Left** | Seek backward 5 seconds |
| **Arrow Right** | Seek forward 5 seconds |
| **1 – 5** | Instantly switch between the 5 curated showcase demo tracks |
| **D** | Cycle to next demo track |
| **H** | Toggle Developer HUD (FPS, bridge status, audio spectrum bars, active word diagnostics) |
| **M** | Toggle Reduced Motion / Low Power Mode |

---

## 3. Offline Showcase Demo Tracks

Immediately available out of the box with zero setup required:
1. **[ 01 ] Tame Impala — Let It Happen** (*Currents*, 2015, Psychedelic Rock) — Matches reference composition with crimson fluid artwork, profile silhouette, and the hero lyric *"and it's coming on"*.
2. **[ 02 ] Karan Aujla · Jay Trak — Wavy** (*Four You*, 2023, Contemporary Hip-Hop) — Sleek dark metallic chrome with punchy transient beat response.
3. **[ 03 ] Beach House — Space Song** (*Depression Cherry*, 2015, Dream Pop) — Deep velvet crimson, soft focus, and ethereal float.
4. **[ 04 ] Daft Punk — Veridis Quo** (*Discovery*, 2001, Electronic) — Prismatic iridescent sheen and harmonic resonance.
5. **[ 05 ] Radiohead — Weird Fishes / Arpeggi** (*In Rainbows*, 2007, Art Rock) — Multi-chromatic organic strands and spectral bloom.

---

## 4. Live Windows Media & Host Integration

### Windows SMTC Bridge (Apple Music, Spotify, Chrome, etc.)
Connects to active Windows media sessions via WinRT and streams synced lyrics from LRCLIB over WebSocket:
```bash
# Run the Python bridge
python bridge.py
# Or double-click
run_bridge.bat
```
When playing, DREAMSCAPE automatically transitions to the live song, maps its album artwork onto the rotating optical disc, and synchronizes real-time lyrics down to the active word.

### Lively Wallpaper & Wallpaper Engine
- **Lively Wallpaper**: Import `Dreamscape.lively` or load `dist/index.html`. DREAMSCAPE natively listens to `window.livelyCurrentTrack` and `window.livelyAudioListener` for direct host media and audio reactivity.
- **Standalone Browser**: Run `pnpm run dev` or open `dist/index.html`.

---

## 5. Development & Build

```bash
# Install dependencies
pnpm install

# Start development server
pnpm run dev

# Build self-contained singlefile production bundle
pnpm run build
```
The production bundle is compiled into `dist/index.html` with zero external runtime dependencies.
