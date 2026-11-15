import zipfile
from pathlib import Path

files_to_pack = [
    "index.html",
    "LivelyInfo.json",
    "css/style.css",
    "js/app.js",
    "js/audio.js",
    "js/audioEngine.js",
    "js/audioReact.js",
    "js/cinematicRenderer.js",
    "js/colorExtractor.js",
    "js/constellation.js",
    "js/gsapLyricEngine.js",
    "js/liquidChrome.js",
    "js/lyricDirector.js",
    "js/lyrics.js",
    "js/lyricSyncEngine.js",
    "js/lyricTimeController.js",
    "js/nodePool.js",
    "js/renderer.js",
    "js/adapters/bridge.adapter.js",
    "js/adapters/lively.adapter.js",
    "js/components/react-bits.js",
    "js/hud/dev-hud.js",
    "js/lyrics/lyric.clock.js",
    "js/lyrics/lyric.parser.js",
    "js/lyrics/lyric.provider.js",
    "js/media/album-art.js",
    "js/media/media.normalizer.js",
    "js/media/track.matcher.js",
    "js/scene/bubbles.js",
    "js/scene/camera-rig.js",
    "js/scene/constellation-engine.js",
    "js/scene/liquid-chrome.shader.js",
    "js/scene/scene-renderer.js",
    "js/scene/spline-path.js",
    "js/scene/word-graph.js",
    "lyrics/demo/let-it-happen.json",
    "lyrics/demo/new-person-same-old-mistakes.json",
    "lyrics/demo/space-song.json",
]

def make_zip(out_path):
    with zipfile.ZipFile(out_path, 'w', compression=zipfile.ZIP_DEFLATED) as z:
        for f in files_to_pack:
            p = Path(f)
            if p.exists():
                z.write(p, arcname=f)
    print(f"Created {out_path}")

make_zip("Dreamscape.zip")
make_zip("Dreamscape.lively")
