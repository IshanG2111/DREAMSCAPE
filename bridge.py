#!/usr/bin/env python3
"""
=============================================================================
SONG-NODE: WINDOWS SMTC & LYRIC MEDIA BRIDGE
=============================================================================
Communicates between Windows Media Sessions (Apple Music, Spotify, iTunes)
and the Song-Node Wallpaper Frontend via a versioned JSON WebSocket contract.

Normalised Event Contract (v1):
- "media.snapshot": Track metadata, playback state, and extrapolated position
- "lyrics.loaded": Synced lyric lines & words with explicit timingPrecision
=============================================================================
"""

import sys
import os
import json
import re
import time
import asyncio
import logging
import argparse
from pathlib import Path
from datetime import datetime, timezone
import urllib.parse
import requests
import websockets

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S"
)
logger = logging.getLogger("SongNodeBridge")

# Check for Windows SDK (WinRT)
HAS_WINSDK = False
try:
    from winsdk.windows.media.control import (
        GlobalSystemMediaTransportControlsSessionManager as MediaManager,
        GlobalSystemMediaTransportControlsSessionPlaybackStatus as PlaybackStatus
    )
    HAS_WINSDK = True
except ImportError:
    logger.warning("winsdk module not found. Run: pip install winsdk")
    logger.warning("Operating in fallback simulation mode until winsdk is installed.")

# Active WebSocket connections
CONNECTED_CLIENTS = set()

# Base directories
BASE_DIR = Path(__file__).resolve().parent
LYRICS_CUSTOM_DIR = BASE_DIR / "lyrics" / "custom"
LYRICS_DEMO_DIR = BASE_DIR / "lyrics" / "demo"

# In-memory lyrics cache: { normalised_key: lyric_payload }
LYRICS_CACHE = {}


def normalise_str(s: str) -> str:
    """Normalises text for consistent matching: lowercases, removes punctuation, collapses whitespace."""
    if not s:
        return ""
    cleaned = re.sub(r'[^\w\s]', '', s.lower())
    return re.sub(r'\s+', ' ', cleaned).strip()


def clean_track_title(title: str) -> str:
    """Strips noisy suffixes from track titles for cleaner lyric database matches."""
    cleaned = re.sub(r'\(.*?(remaster|deluxe|version|feat|ft|explicit|edition|mix|live|mono|stereo|bonus|audio).*\)', '', title, flags=re.IGNORECASE)
    cleaned = re.sub(r'\[.*?(remaster|deluxe|version|feat|ft|explicit|edition|mix|live|mono|stereo|bonus|audio).*\]', '', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'-\s*(remastered|deluxe|single|live|edit).*', '', cleaned, flags=re.IGNORECASE)
    return cleaned.strip()


def parse_timestamp_ms(min_str: str, sec_str: str) -> int:
    """Converts mm:ss.xx to integer milliseconds."""
    mins = int(min_str)
    secs = float(sec_str)
    return int(round((mins * 60 + secs) * 1000))


def parse_enhanced_or_standard_lrc(lrc_text: str):
    """
    Parses LRC text. Detects whether word-timed tags <mm:ss.xx> are present.
    Returns: (timingPrecision, lines_array)
    """
    if not lrc_text:
        return "none", []

    line_regex = re.compile(r'^\[(\d{2}):(\d{2}(?:\.\d+)?)\](.*)')
    word_tag_regex = re.compile(r'<(\d{2}):(\d{2}(?:\.\d+)?)>([^<]+)')

    raw_lines = []
    has_any_word_tags = False

    for raw in lrc_text.splitlines():
        match = line_regex.match(raw.strip())
        if match:
            start_ms = parse_timestamp_ms(match.group(1), match.group(2))
            rest = match.group(3).strip()

            # Check for word-level tags: <mm:ss.xx>word
            word_matches = list(word_tag_regex.finditer(rest))
            if word_matches:
                has_any_word_tags = True
                words = []
                for wm in word_matches:
                    w_start = parse_timestamp_ms(wm.group(1), wm.group(2))
                    w_text = wm.group(3).strip()
                    if w_text:
                        words.append({
                            "text": w_text,
                            "startMs": w_start,
                            "endMs": w_start + 400
                        })
                # Close word timings
                for i in range(len(words) - 1):
                    words[i]["endMs"] = words[i + 1]["startMs"]

                raw_lines.append({
                    "startMs": start_ms,
                    "endMs": start_ms + 4000,
                    "words": words
                })
            else:
                # Standard line-level text
                plain_text = re.sub(r'<[^>]+>', '', rest).strip()
                if plain_text:
                    tokens = plain_text.split()
                    raw_lines.append({
                        "startMs": start_ms,
                        "endMs": start_ms + 4000,
                        "words": [{"text": t} for t in tokens]
                    })

    raw_lines.sort(key=lambda x: x["startMs"])

    # Calculate endMs from next line and distribute word timestamps
    for i in range(len(raw_lines)):
        curr_line = raw_lines[i]
        if i < len(raw_lines) - 1:
            curr_line["endMs"] = raw_lines[i + 1]["startMs"]
        else:
            curr_line["endMs"] = curr_line["startMs"] + 4500

        words = curr_line.get("words", [])
        if words:
            l_start = curr_line["startMs"]
            l_end = max(l_start + 1000, curr_line["endMs"])
            w_step = (l_end - l_start) / len(words)
            for w_idx, w in enumerate(words):
                if "startMs" not in w:
                    w["startMs"] = int(round(l_start + w_idx * w_step))
                    w["endMs"] = int(round(l_start + (w_idx + 1) * w_step))

        if has_any_word_tags and words and "endMs" in words[-1]:
            words[-1]["endMs"] = min(curr_line["endMs"], words[-1]["endMs"] + 300)

    precision = "word" if has_any_word_tags else ("line" if raw_lines else "none")
    return precision, raw_lines


def load_local_cue_file(title: str, artist: str):
    """Checks lyrics/custom and lyrics/demo for local JSON or LRC cue files."""
    norm_query = normalise_str(f"{artist} {title}")
    dirs_to_check = [LYRICS_CUSTOM_DIR, LYRICS_DEMO_DIR]

    for d in dirs_to_check:
        if not d.exists():
            continue
        for file in d.iterdir():
            if file.suffix.lower() == ".json":
                try:
                    with open(file, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        track_key = data.get("trackKey") or normalise_str(f"{data.get('artist', '')} {data.get('title', '')}")
                        if track_key and (track_key in norm_query or norm_query in track_key):
                            logger.info(f"Loaded local JSON cue sheet: {file.name}")
                            return data
                except Exception as e:
                    logger.debug(f"Error reading {file}: {e}")

            elif file.suffix.lower() == ".lrc":
                file_stem_norm = normalise_str(file.stem)
                if file_stem_norm in norm_query or norm_query in file_stem_norm:
                    try:
                        with open(file, "r", encoding="utf-8") as f:
                            text = f.read()
                            precision, lines = parse_enhanced_or_standard_lrc(text)
                            if lines:
                                logger.info(f"Loaded local LRC cue file: {file.name} (precision={precision})")
                                return {
                                    "version": 1,
                                    "type": "lyrics.loaded",
                                    "trackKey": norm_query,
                                    "timingPrecision": precision,
                                    "lines": lines
                                }
                    except Exception as e:
                        logger.debug(f"Error reading {file}: {e}")

    return None


def fetch_lrclib_lyrics(title: str, artist: str, duration_sec: float):
    """Fetches synced lyrics from LRCLIB with robust fallback queries and valid browser headers."""
    clean_title = clean_track_title(title)
    clean_artist = re.sub(r'[\.\,\-]$', '', (artist or '').strip()).strip()
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "application/json"
    }

    # 1. Direct match endpoint
    for art in [clean_artist, artist]:
        if not art:
            continue
        get_url = f"https://lrclib.net/api/get?artist_name={urllib.parse.quote(art)}&track_name={urllib.parse.quote(clean_title)}"
        if duration_sec > 10:
            get_url += f"&duration={int(duration_sec)}"
        try:
            r = requests.get(get_url, headers=headers, timeout=4.5)
            if r.status_code == 200:
                data = r.json()
                if data.get("syncedLyrics"):
                    precision, lines = parse_enhanced_or_standard_lrc(data["syncedLyrics"])
                    if lines:
                        logger.info(f"LRCLIB direct match successful for '{art}' - '{clean_title}' ({len(lines)} lines)")
                        return {
                            "version": 1,
                            "type": "lyrics.loaded",
                            "trackKey": normalise_str(f"{artist} {title}"),
                            "timingPrecision": precision,
                            "durationMs": int(duration_sec * 1000) if duration_sec else 0,
                            "lines": lines
                        }
        except Exception as e:
            logger.debug(f"Direct LRCLIB query error: {e}")

    # 2. Search endpoint with fallback query combinations
    search_queries = []
    if clean_artist and clean_title:
        search_queries.append(f"{clean_artist} {clean_title}")
    if artist and artist != clean_artist:
        search_queries.append(f"{artist} {clean_title}")
    if clean_title:
        search_queries.append(clean_title)

    for query in search_queries:
        try:
            search_url = f"https://lrclib.net/api/search?q={urllib.parse.quote(query)}"
            r = requests.get(search_url, headers=headers, timeout=5.0)
            if r.status_code == 200:
                results = r.json()
                synced_items = [item for item in results if item.get("syncedLyrics")]
                if synced_items:
                    # Pick candidate closest in duration if duration is available
                    if duration_sec > 10:
                        best = min(synced_items, key=lambda x: abs((x.get("duration") or 0) - duration_sec))
                    else:
                        best = synced_items[0]

                    precision, lines = parse_enhanced_or_standard_lrc(best["syncedLyrics"])
                    if lines:
                        logger.info(f"LRCLIB search match successful for query '{query}' -> '{best.get('trackName')}' by '{best.get('artistName')}' ({len(lines)} lines)")
                        return {
                            "version": 1,
                            "type": "lyrics.loaded",
                            "trackKey": normalise_str(f"{artist} {title}"),
                            "timingPrecision": precision,
                            "durationMs": int(duration_sec * 1000) if duration_sec else 0,
                            "lines": lines
                        }
        except Exception as e:
            logger.debug(f"Search LRCLIB query error for '{query}': {e}")

    return None


async def get_lyrics_for_track(title: str, artist: str, duration_sec: float):
    """Loads lyrics according to priority: 1) local cue/lrc, 2) LRCLIB, 3) none."""
    cache_key = normalise_str(f"{artist} {title}")
    if cache_key in LYRICS_CACHE:
        return LYRICS_CACHE[cache_key]

    # 1. Local override
    local_data = load_local_cue_file(title, artist)
    if local_data:
        LYRICS_CACHE[cache_key] = local_data
        return local_data

    # 2. Remote LRCLIB fetch
    logger.info(f"Querying LRCLIB for: '{artist}' - '{title}'...")
    res = await asyncio.to_thread(fetch_lrclib_lyrics, title, artist, duration_sec)
    if res:
        logger.info(f"Retrieved lyrics from LRCLIB: {len(res['lines'])} lines (precision={res['timingPrecision']})")
        LYRICS_CACHE[cache_key] = res
        return res

    # 3. No lyrics available
    logger.info(f"No timed lyrics available for: '{artist}' - '{title}'")
    empty_payload = {
        "version": 1,
        "type": "lyrics.loaded",
        "trackKey": cache_key,
        "timingPrecision": "none",
        "lines": []
    }
    LYRICS_CACHE[cache_key] = empty_payload
    return empty_payload


# =============================================================================
# WINDOWS SMTC SESSION MANAGER
# =============================================================================
_smtc_consecutive_failures = 0

async def get_active_media_session():
    """Queries Windows SMTC and prioritizes Apple Music, iTunes, or Spotify."""
    global _smtc_consecutive_failures

    if not HAS_WINSDK:
        return None

    # After 3 consecutive WinRT failures, stop retrying and fall through to demo
    if _smtc_consecutive_failures >= 3:
        return None

    try:
        manager = await asyncio.wait_for(MediaManager.request_async(), timeout=0.8)
        sessions = manager.get_sessions()
        _smtc_consecutive_failures = 0  # reset on success
        if not sessions:
            return None

        # Prioritize Apple Music / Spotify
        for s in sessions:
            app_id = (s.source_app_user_model_id or "").lower()
            if any(k in app_id for k in ["applemusic", "itunes", "spotify"]):
                return s

        # Current session
        current = manager.get_current_session()
        if current:
            return current

        return sessions[0]
    except (OSError, asyncio.TimeoutError, Exception) as e:
        _smtc_consecutive_failures += 1
        if _smtc_consecutive_failures >= 3:
            logger.warning(
                f"WinRT MediaManager failed {_smtc_consecutive_failures} times consecutively "
                f"({e}). Falling through to demo/showcase mode."
            )
        else:
            logger.debug(f"SMTC Session query error ({_smtc_consecutive_failures}/3): {e}")
        return None


async def fetch_artwork_async(artist: str, title: str, album: str = ""):
    """Queries iTunes Search API asynchronously for official high-resolution album cover and album name."""
    try:
        clean_title = clean_track_title(title)
        query = f"{artist} {clean_title} {album}".strip()
        url = f"https://itunes.apple.com/search?term={urllib.parse.quote(query)}&entity=song&limit=1"
        def _get():
            return requests.get(url, timeout=3.5)
        resp = await asyncio.to_thread(_get)
        if resp.status_code == 200:
            data = resp.json()
            if data.get("resultCount", 0) > 0:
                res0 = data["results"][0]
                artwork_url = res0.get("artworkUrl100", "")
                if artwork_url:
                    artwork_url = artwork_url.replace("100x100bb.jpg", "600x600bb.jpg")
                album_name = res0.get("collectionName", "")
                return artwork_url, album_name
    except Exception as e:
        logger.debug(f"iTunes artwork fetch error: {e}")
    return "", ""


def extract_palette_from_artwork(artwork_data):
    """Extracts dominant vibrant palette from image base64 or URL using PIL."""
    if not artwork_data:
        return None
    try:
        from PIL import Image
        import io
        import base64

        raw_bytes = None
        if artwork_data.startswith("data:image"):
            b64_part = artwork_data.split(",", 1)[1]
            raw_bytes = base64.b64decode(b64_part)
        elif artwork_data.startswith("http://") or artwork_data.startswith("https://"):
            resp = requests.get(artwork_data, timeout=3.0)
            if resp.status_code == 200:
                raw_bytes = resp.content

        if not raw_bytes:
            return None

        img = Image.open(io.BytesIO(raw_bytes)).convert("RGB")
        img.thumbnail((48, 48))
        width, height = img.size
        pixels = [img.getpixel((x, y)) for y in range(height) for x in range(width)]

        candidates = []
        for r, g, b in pixels:
            max_c = max(r, g, b)
            min_c = min(r, g, b)
            delta = max_c - min_c
            lum = (max_c + min_c) / 2.0
            if lum < 22 or lum > 238:
                continue
            sat = delta / max_c if max_c > 0 else 0
            if sat > 0.18:
                score = (sat ** 1.4) * (1.0 - abs(lum - 128) / 130.0)
                candidates.append((score, r, g, b))

        if candidates:
            candidates.sort(key=lambda x: x[0], reverse=True)
            top = candidates[0]
            pr, pg, pb = top[1], top[2], top[3]

            sr, sg, sb = int(pr * 0.55), int(pg * 0.55), int(pb * 0.55)
            for item in candidates[1:]:
                dist = abs(item[1] - pr) + abs(item[2] - pg) + abs(item[3] - pb)
                if dist > 70:
                    sr, sg, sb = item[1], item[2], item[3]
                    break

            return {
                "primary": [pr, pg, pb],
                "secondary": [sr, sg, sb],
                "primaryHex": f"#{pr:02x}{pg:02x}{pb:02x}",
                "secondaryHex": f"#{sr:02x}{sg:02x}{sb:02x}"
            }
    except Exception as e:
        logger.debug(f"Color extraction error: {e}")
    return None


async def inspect_smtc():
    """Reads properties from the current media session."""
    session = await get_active_media_session()
    if not session:
        return None

    try:
        media_props = await asyncio.wait_for(session.try_get_media_properties_async(), timeout=0.8)
        playback_info = session.get_playback_info()
        timeline = session.get_timeline_properties()

        title = media_props.title or ""
        artist = media_props.artist or ""
        album = media_props.album_title or ""
        source_app = session.source_app_user_model_id or "Apple Music"

        artwork_data = ""
        if media_props.thumbnail:
            try:
                stream = await asyncio.wait_for(media_props.thumbnail.open_read_async(), timeout=1.0)
                from winsdk.windows.storage.streams import DataReader
                reader = DataReader(stream)
                await reader.load_async(stream.size)
                buffer = bytearray(stream.size)
                reader.read_bytes(buffer)
                import base64
                artwork_data = "data:image/jpeg;base64," + base64.b64encode(buffer).decode("ascii")
            except Exception:
                artwork_data = ""

        status_code = playback_info.playback_status if playback_info else 0
        is_playing = (status_code == 4 or status_code == PlaybackStatus.PLAYING)

        position_ms = 0
        duration_ms = 0
        playback_rate = 1.0

        if timeline:
            position_ms = int(timeline.position.total_seconds() * 1000)
            duration_ms = int(timeline.end_time.total_seconds() * 1000)

            # Reconcile with elapsed time since last SMTC update tick
            if is_playing and timeline.last_updated_time:
                last_update = timeline.last_updated_time
                now_utc = datetime.now(timezone.utc)
                if last_update.tzinfo is None:
                    last_update = last_update.replace(tzinfo=timezone.utc)
                delta_sec = (now_utc - last_update).total_seconds()
                if 0 <= delta_sec < 10:
                    position_ms += int(delta_sec * 1000)

        return {
            "title": title,
            "artist": artist,
            "album": album,
            "artwork": artwork_data,
            "sourceApp": source_app,
            "status": "playing" if is_playing else "paused",
            "positionMs": position_ms,
            "durationMs": duration_ms,
            "playbackRate": playback_rate
        }
    except Exception as e:
        logger.debug(f"Error inspecting media session: {e}")
        return None


# =============================================================================
# BROADCAST & PROTOCOL DISPATCH
# =============================================================================
async def broadcast(message_dict):
    """Sends JSON payload to all connected wallpaper clients."""
    if not CONNECTED_CLIENTS:
        return
    payload = json.dumps(message_dict)
    dead_clients = set()
    for ws in list(CONNECTED_CLIENTS):
        try:
            await ws.send(payload)
        except websockets.exceptions.ConnectionClosed:
            dead_clients.add(ws)
    for ws in dead_clients:
        CONNECTED_CLIENTS.discard(ws)


# Authoritative state tracker
class BridgeState:
    def __init__(self):
        self.track_id = ""
        self.title = ""
        self.artist = ""
        self.album = ""
        self.artwork = ""
        self.colors = None
        self.source_app = ""
        self.duration_ms = 0
        self.anchor_position_ms = 0
        self.anchor_monotonic_ms = int(time.monotonic() * 1000)
        self.status = "stopped"
        self.playback_rate = 1.0
        self.lyrics_loaded = False
        self.last_published_pos_ms = -1

    def get_current_position_ms(self):
        if self.status != "playing":
            return self.anchor_position_ms
        elapsed = int(time.monotonic() * 1000) - self.anchor_monotonic_ms
        est = self.anchor_position_ms + int(elapsed * self.playback_rate)
        if self.duration_ms > 0:
            est = min(self.duration_ms, est)
        return max(0, est)

    def make_snapshot(self):
        return {
            "version": 1,
            "type": "media.snapshot",
            "track": {
                "id": f"{self.artist}:{self.title}",
                "title": self.title,
                "artist": self.artist,
                "album": self.album,
                "artwork": self.artwork,
                "colors": self.colors,
                "durationMs": self.duration_ms,
                "source": self.source_app
            },
            "playback": {
                "status": self.status,
                "positionMs": self.get_current_position_ms(),
                "playbackRate": self.playback_rate,
                "capturedAtMonotonicMs": int(time.monotonic() * 1000)
            }
        }


state = BridgeState()


async def ws_handler(websocket):
    CONNECTED_CLIENTS.add(websocket)
    remote = websocket.remote_address[0] if websocket.remote_address else "local"
    logger.info(f"Wallpaper client connected from {remote}. Active clients: {len(CONNECTED_CLIENTS)}")

    try:
        # Send current media snapshot
        await websocket.send(json.dumps(state.make_snapshot()))

        # If lyrics are cached for current track, send lyrics immediately
        if state.title and state.artist:
            lyrics = await get_lyrics_for_track(state.title, state.artist, state.duration_ms / 1000.0)
            if lyrics:
                await websocket.send(json.dumps(lyrics))

        async for msg in websocket:
            try:
                cmd = json.loads(msg)
                action = cmd.get("action") or cmd.get("type")
                if action == "PING":
                    await websocket.send(json.dumps({"type": "PONG", "time": int(time.monotonic() * 1000)}))
                elif action == "REQUEST_SNAPSHOT":
                    await websocket.send(json.dumps(state.make_snapshot()))
            except Exception:
                pass
    except websockets.exceptions.ConnectionClosed:
        pass
    finally:
        CONNECTED_CLIENTS.discard(websocket)
        logger.info(f"Wallpaper client disconnected. Remaining: {len(CONNECTED_CLIENTS)}")


# =============================================================================
# MEDIA MONITORING LOOP
# =============================================================================
async def media_sync_loop():
    logger.info("Starting media sync loop (reconciliation interval: 250ms)...")
    simulated_pos_ms = 160000

    while True:
        await asyncio.sleep(0.25)

        media = await inspect_smtc()

        if media and media.get("title"):
            title = media["title"]
            artist = media["artist"]
            album = media["album"]
            source = media["sourceApp"]
            status = media["status"]
            pos_ms = media["positionMs"]
            dur_ms = media["durationMs"]
            rate = media["playbackRate"]

            track_changed = (title != state.title or artist != state.artist)
            status_changed = (status != state.status)
            pos_drift = abs(pos_ms - state.get_current_position_ms())

            if track_changed:
                logger.info(f"Now Playing: {artist} - {title} ({source})")
                state.title = title
                state.artist = artist
                state.album = album
                state.source_app = source
                state.duration_ms = dur_ms
                state.status = status
                state.playback_rate = rate
                state.anchor_position_ms = pos_ms
                state.anchor_monotonic_ms = int(time.monotonic() * 1000)

                # Resolve high-res album artwork & official album name if missing
                artwork = media.get("artwork", "")
                if artist and title:
                    fetched_art, fetched_album = await fetch_artwork_async(artist, title, album)
                    if not artwork and fetched_art:
                        artwork = fetched_art
                    if not album and fetched_album:
                        state.album = fetched_album
                state.artwork = artwork or ""
                state.colors = extract_palette_from_artwork(state.artwork)

                # Clear old lyrics and broadcast snapshot with artwork & palette
                await broadcast(state.make_snapshot())

                # Fetch and broadcast new lyrics
                lyrics = await get_lyrics_for_track(title, artist, dur_ms / 1000.0)
                await broadcast(lyrics)

            elif status_changed or pos_drift > 600:
                # Seek, pause, or resume
                state.status = status
                state.anchor_position_ms = pos_ms
                state.anchor_monotonic_ms = int(time.monotonic() * 1000)
                state.playback_rate = rate
                if dur_ms > 0:
                    state.duration_ms = dur_ms

                await broadcast(state.make_snapshot())
            else:
                # Periodic position update if changed by > 500ms
                curr_pos = state.get_current_position_ms()
                if abs(curr_pos - state.last_published_pos_ms) >= 500:
                    state.last_published_pos_ms = curr_pos
                    await broadcast(state.make_snapshot())

        else:
            # When no external Windows media player is active, provide the showcase demo track
            if not state.title:
                state.title = "New Person, Same Old Mistakes"
                state.artist = "Tame Impala"
                state.album = "Currents"
                state.source_app = "Showcase Demo"
                state.duration_ms = 363000
                state.status = "playing"
                state.anchor_position_ms = 164200
                state.anchor_monotonic_ms = int(time.monotonic() * 1000)

                await broadcast(state.make_snapshot())
                lyrics = await get_lyrics_for_track(state.title, state.artist, 363.0)
                await broadcast(lyrics)

            curr = state.get_current_position_ms()
            if curr > 185000:
                # Loop the showcase constellation phrase
                state.anchor_position_ms = 164200
                state.anchor_monotonic_ms = int(time.monotonic() * 1000)
                await broadcast(state.make_snapshot())
            elif abs(curr - state.last_published_pos_ms) >= 500:
                state.last_published_pos_ms = curr
                await broadcast(state.make_snapshot())


# =============================================================================
# ENTRY POINT
# =============================================================================
async def main():
    parser = argparse.ArgumentParser(description="Song-Node Windows SMTC Media Bridge")
    parser.add_argument("--port", type=int, default=8765, help="WebSocket port (default: 8765)")
    parser.add_argument("--host", type=str, default="127.0.0.1", help="Host address (default: 127.0.0.1)")
    args = parser.parse_args()

    logger.info("=" * 65)
    logger.info("       SONG-NODE • WINDOWS SMTC MEDIA & LYRICS BRIDGE        ")
    logger.info("=" * 65)
    logger.info(f"WebSocket Address: ws://{args.host}:{args.port}")
    logger.info(f"Windows SDK Provider: {'ACTIVE (Native WinRT)' if HAS_WINSDK else 'SIMULATED (pip install winsdk)'}")
    logger.info("Ready for Lively Wallpaper / Web Client...")
    logger.info("=" * 65)

    async with websockets.serve(ws_handler, args.host, args.port):
        await media_sync_loop()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("\nShutting down Song-Node bridge server.")
