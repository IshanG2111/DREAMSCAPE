import { useState, useEffect, useRef } from 'react';

export function useMediaBridge(url = 'ws://127.0.0.1:8765') {
  const [connectionStatus, setConnectionStatus] = useState('connecting'); // 'connected' | 'connecting' | 'offline'
  const [track, setTrack] = useState({
    title: 'WAITING FOR MEDIA',
    artist: 'PLAY A SONG ON WINDOWS',
    album: '',
    artwork: null,
    durationMs: 0,
    sourceApp: 'Windows SMTC',
  });
  const [playback, setPlayback] = useState({
    status: 'paused',
    positionMs: 0,
    playbackRate: 1.0,
  });
  const [lyrics, setLyrics] = useState(null);
  const [latencyMs, setLatencyMs] = useState(0);

  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const lastPingRef = useRef(0);
  const isUnmountedRef = useRef(false);

  useEffect(() => {
    isUnmountedRef.current = false;

    function connect() {
      if (isUnmountedRef.current) return;
      if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
        return;
      }

      try {
        const ws = new WebSocket(url);
        wsRef.current = ws;
        setConnectionStatus('connecting');

        ws.onopen = () => {
          if (isUnmountedRef.current) return;
          setConnectionStatus('connected');
          lastPingRef.current = performance.now();
          // Request snapshot immediately upon connection
          ws.send(JSON.stringify({ action: 'REQUEST_SNAPSHOT' }));
          ws.send(JSON.stringify({ action: 'PING' }));
        };

        ws.onmessage = (event) => {
          if (isUnmountedRef.current) return;
          try {
            const msg = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
            if (!msg || typeof msg !== 'object') return;

            const msgType = msg.type || msg.event;
            const trackObj = msg.track || msg.payload?.track;
            const playbackObj = msg.playback || msg.payload?.playback;
            const linesObj = msg.lines || msg.payload?.lines;

            if (msgType === 'media.snapshot') {
              if (trackObj && trackObj.title) {
                setTrack((prev) => ({
                  ...prev,
                  title: (trackObj.title || prev.title).toUpperCase(),
                  artist: (trackObj.artist || prev.artist).toUpperCase(),
                  album: (trackObj.album || '').toUpperCase(),
                  artwork: trackObj.artwork || null,
                  durationMs: Number(trackObj.durationMs) || 0,
                  sourceApp: trackObj.source || trackObj.sourceApp || 'Windows SMTC',
                }));
              }
              if (playbackObj) {
                setPlayback({
                  status: playbackObj.status || 'paused',
                  positionMs: typeof playbackObj.positionMs === 'number' ? playbackObj.positionMs : 0,
                  playbackRate: playbackObj.playbackRate || 1.0,
                });
              }
            } else if (msgType === 'lyrics.loaded') {
              if (linesObj && linesObj.length > 0) {
                setLyrics({
                  ...msg,
                  lines: linesObj,
                });
              }
            } else if (msgType === 'PONG' || msg.action === 'PONG') {
              setLatencyMs(Math.round(performance.now() - lastPingRef.current));
            }
          } catch (e) {
            console.warn('[Bridge] Parse error:', e);
          }
        };

        ws.onclose = () => {
          if (isUnmountedRef.current) return;
          setConnectionStatus('offline');
          wsRef.current = null;
          if (!reconnectTimeoutRef.current) {
            reconnectTimeoutRef.current = setTimeout(() => {
              reconnectTimeoutRef.current = null;
              connect();
            }, 2500);
          }
        };

        ws.onerror = () => {
          // Triggers onclose
        };
      } catch (e) {
        setConnectionStatus('offline');
        if (!reconnectTimeoutRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectTimeoutRef.current = null;
            connect();
          }, 3000);
        }
      }
    }

    connect();

    // Heartbeat ping every 3s
    const pingInterval = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        lastPingRef.current = performance.now();
        wsRef.current.send(JSON.stringify({ action: 'PING' }));
      }
    }, 3000);

    // Lively Wallpaper native host API listener fallback
    window.livelyCurrentTrack = (trackData) => {
      try {
        const t = typeof trackData === 'string' ? JSON.parse(trackData) : trackData;
        if (t && t.Title) {
          setTrack((prev) => ({
            ...prev,
            title: (t.Title || prev.title).toUpperCase(),
            artist: (t.Artist || prev.artist).toUpperCase(),
            album: (t.Album || '').toUpperCase(),
            artwork: t.Thumbnail || null,
            durationMs: Number(t.Duration) || 0,
            sourceApp: 'Lively Host',
          }));
          setConnectionStatus('connected');
        }
      } catch (e) {
        console.warn('[Lively] Track parse error:', e);
      }
    };

    return () => {
      isUnmountedRef.current = true;
      clearInterval(pingInterval);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (wsRef.current) {
        try { wsRef.current.close(); } catch (e) {}
        wsRef.current = null;
      }
    };
  }, [url]);

  return {
    connectionStatus,
    track,
    playback,
    lyrics,
    latencyMs,
    setTrack,
    setPlayback,
    setLyrics,
  };
}
