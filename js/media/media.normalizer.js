/* =========================================================================
   MEDIA NORMALIZER
   Normalizes source payloads (SMTC Bridge, Lively Wallpaper, Demo)
   into a single versioned contract.
   ========================================================================= */

window.SongNode = window.SongNode || {};

(function(exports) {
  class MediaNormalizer {
    static normalizeBridgeSnapshot(data) {
      if (!data) return null;

      // Already v1 contract?
      if (data.version === 1 && data.type === 'media.snapshot') {
        return {
          track: {
            id: data.track?.id || '',
            title: data.track?.title || '',
            artist: data.track?.artist || '',
            album: data.track?.album || '',
            durationMs: Number(data.track?.durationMs) || 0,
            source: data.track?.source || 'Bridge'
          },
          playback: {
            status: data.playback?.status || 'stopped',
            positionMs: Number(data.playback?.positionMs) || 0,
            playbackRate: Number(data.playback?.playbackRate) || 1.0,
            capturedAtMonotonicMs: Number(data.playback?.capturedAtMonotonicMs) || performance.now()
          }
        };
      }

      // Legacy bridge payload fallback
      const trackData = data.data || data;
      const title = trackData.title || '';
      const artist = trackData.artist || '';
      const isPlaying = Boolean(trackData.isPlaying);

      return {
        track: {
          id: `${artist}:${title}`,
          title: title,
          artist: artist,
          album: trackData.album || '',
          durationMs: (trackData.duration || 0) * 1000,
          source: trackData.sourceApp || 'Bridge'
        },
        playback: {
          status: isPlaying ? 'playing' : (title ? 'paused' : 'stopped'),
          positionMs: (trackData.position || 0) * 1000,
          playbackRate: 1.0,
          capturedAtMonotonicMs: performance.now()
        }
      };
    }

    static normalizeLivelyTrack(livelyData) {
      if (!livelyData) return null;
      const title = livelyData.Title || livelyData.title || '';
      const artist = livelyData.Artist || livelyData.artist || '';
      const album = livelyData.Album || livelyData.album || '';

      return {
        track: {
          id: `${artist}:${title}`,
          title: title,
          artist: artist,
          album: album,
          durationMs: 0,
          source: 'Lively'
        },
        playback: {
          status: title ? 'playing' : 'stopped',
          positionMs: 0,
          playbackRate: 1.0,
          capturedAtMonotonicMs: performance.now()
        }
      };
    }
  }

  exports.MediaNormalizer = MediaNormalizer;
})(window.SongNode);

