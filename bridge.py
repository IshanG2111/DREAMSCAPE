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

    # Calculate endMs from next line
    for i in range(len(raw_lines) - 1):
        raw_lines[i]["endMs"] = raw_lines[i + 1]["startMs"]
        # If words in word-mode, ensure last word's endMs <= line endMs
        if has_any_word_tags and raw_lines[i]["words"]:
            if "endMs" in raw_lines[i]["words"][-1]:
                raw_lines[i]["words"][-1]["endMs"] = min(raw_lines[i]["endMs"], raw_lines[i]["words"][-1]["endMs"] + 300)

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
    """Fetches synced lyrics from LRCLIB."""
    clean_title = clean_track_title(title)
    headers = {"User-Agent": "SongNodeWallpaper/2.0 (github.com/Song-node)"}

    # Direct match endpoint
    get_url = f"https://lrclib.net/api/get?artist_name={urllib.parse.quote(artist)}&track_name={urllib.parse.quote(clean_title)}"
    if duration_sec > 10:
        get_url += f"&duration={int(duration_sec)}"

    try:
        r = requests.get(get_url, headers=headers, timeout=4.0)
        if r.status_code == 200:
            data = r.json()
            if data.get("syncedLyrics"):
                precision, lines = parse_enhanced_or_standard_lrc(data["syncedLyrics"])
                if lines:
                    return {
                        "version": 1,
                        "type": "lyrics.loaded",
                        "trackKey": normalise_str(f"{artist} {title}"),
                        "timingPrecision": precision,
                        "lines": lines
                    }
    except Exception as e:
        logger.debug(f"Direct LRCLIB query error: {e}")

    # Fallback search endpoint
    try:
        search_query = f"{artist} {clean_title}"
        search_url = f"https://lrclib.net/api/search?q={urllib.parse.quote(search_query)}"
        r = requests.get(search_url, headers=headers, timeout=4.0)
        if r.status_code == 200:
            results = r.json()
            for item in results:
                if item.get("syncedLyrics"):
                    precision, lines = parse_enhanced_or_standard_lrc(item["syncedLyrics"])
                    if lines:
                        return {
                            "version": 1,
                            "type": "lyrics.loaded",
                            "trackKey": normalise_str(f"{artist} {title}"),
                            "timingPrecision": precision,
                            "lines": lines
                        }
    except Exception as e:
        logger.debug(f"Search LRCLIB query error: {e}")

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
async def get_active_media_session():
    """Queries Windows SMTC and prioritizes Apple Music, iTunes, or Spotify."""
    if not HAS_WINSDK:
        return None

    try:
        manager = await MediaManager.request_async()
        sessions = manager.get_sessions()
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
    except Exception as e:
        logger.debug(f"SMTC Session query error: {e}")
        return None


async def inspect_smtc():
    """Reads properties from the current media session."""
    session = await get_active_media_session()
    if not session:
        return None

    try:
        media_props = await session.try_get_media_properties_async()
        playback_info = session.get_playback_info()
        timeline = session.get_timeline_properties()

        title = media_props.title or ""
        artist = media_props.artist or ""
        album = media_props.album_title or ""
        source_app = session.source_app_user_model_id or "Apple Music"

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

                # Clear old lyrics and broadcast snapshot
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
            if HAS_WINSDK:
                # Active session was closed or stopped
                if state.status != "stopped":
                    logger.info("Media playback session closed. Entering idle state.")
                    state.status = "stopped"
                    state.title = ""
                    state.artist = ""
                    await broadcast(state.make_snapshot())
                    # Clear lyrics
                    await broadcast({
                        "version": 1,
                        "type": "lyrics.loaded",
                        "trackKey": "",
                        "timingPrecision": "none",
                        "lines": []
                    })
            else:
                # Fallback Simulation when WinSDK is not present
                if not state.title:
                    state.title = "New Person, Same Old Mistakes"
                    state.artist = "Tame Impala"
                    state.album = "Currents"
                    state.source_app = "Demo Simulation"
                    state.duration_ms = 363000
                    state.status = "playing"
                    state.anchor_position_ms = 160000
                    state.anchor_monotonic_ms = int(time.monotonic() * 1000)

                    await broadcast(state.make_snapshot())
                    lyrics = await get_lyrics_for_track(state.title, state.artist, 363.0)
                    await broadcast(lyrics)

                curr = state.get_current_position_ms()
                if curr > 192000:
                    # Loop the showcase section
                    state.anchor_position_ms = 160000
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
