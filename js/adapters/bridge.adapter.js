/* =========================================================================
   BRIDGE ADAPTER (WEBSOCKET CLIENT)
   Connects to the Windows SMTC Python/.NET bridge.
   Handles reconnection, ping-pong latency, and versioned event dispatching.
   ========================================================================= */

window.SongNode = window.SongNode || {};

(function(exports) {
  class BridgeAdapter {
    constructor(host = "127.0.0.1", port = 8765) {
      this.url = `ws://${host}:${port}`;
      this.ws = null;
      this.isConnected = false;
      this.reconnectTimer = null;
      this.reconnectAttempts = 0;
      this.lastSnapshotTime = 0;
      this.lastPingTime = 0;
      this.latencyMs = 0;

      // Event handlers
      this.onMediaSnapshot = null;
      this.onLyricsLoaded = null;
      this.onConnectionChange = null;

      this.connect();
    }

    connect() {
      if (this.ws) {
        try { this.ws.close(); } catch (e) {}
        this.ws = null;
      }

      try {
        const ws = new WebSocket(this.url);
        this.ws = ws;

        ws.onopen = () => {
          this.isConnected = true;
          this.reconnectAttempts = 0;
          if (this.onConnectionChange) this.onConnectionChange(true);
          this.startHeartbeat();
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            this.handleMessage(msg);
          } catch (err) {
            console.error("[BridgeAdapter] Malformed JSON received:", err);
          }
        };

        ws.onclose = () => {
          this.isConnected = false;
          this.stopHeartbeat();
          if (this.onConnectionChange) this.onConnectionChange(false);
          this.scheduleReconnect();
        };

        ws.onerror = () => {
          try { ws.close(); } catch (e) {}
        };
      } catch (err) {
        this.scheduleReconnect();
      }
    }

    scheduleReconnect() {
      if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
      this.reconnectAttempts++;
      const delay = Math.min(6000, 1500 + this.reconnectAttempts * 800);
      this.reconnectTimer = setTimeout(() => {
        this.connect();
      }, delay);
    }

    reconnectNow() {
      if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
      this.reconnectAttempts = 0;
      this.connect();
    }

    startHeartbeat() {
      this.stopHeartbeat();
      this.heartbeatInterval = setInterval(() => {
        if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.lastPingTime = performance.now();
          this.ws.send(JSON.stringify({ action: "PING" }));
        }
      }, 5000);
    }

    stopHeartbeat() {
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }
    }

    handleMessage(msg) {
      if (!msg) return;

      // Heartbeat Pong
      if (msg.type === "PONG") {
        this.latencyMs = Math.round(performance.now() - this.lastPingTime);
        return;
      }

      // Normalised Event Contract v1:
      if (msg.type === "media.snapshot") {
        this.lastSnapshotTime = performance.now();
        if (this.onMediaSnapshot) {
          this.onMediaSnapshot(msg);
        }
        return;
      }

      if (msg.type === "lyrics.loaded") {
        if (this.onLyricsLoaded) {
          this.onLyricsLoaded(msg);
        }
        return;
      }

      // Legacy fallback bridge format compatibility
      if (msg.type === "INIT" || msg.type === "TRACK_CHANGE" || msg.type === "TIMELINE_SYNC") {
        this.lastSnapshotTime = performance.now();
        const norm = window.SongNode.MediaNormalizer?.normalizeBridgeSnapshot(msg);
        if (norm && this.onMediaSnapshot) {
          this.onMediaSnapshot(norm);
        }
        if (msg.data?.lyrics && this.onLyricsLoaded) {
          const parsed = window.SongNode.LyricParser?.parse(msg.data.lyrics);
          this.onLyricsLoaded(parsed);
        }
      }
    }

    getLastSnapshotAgeSec() {
      if (!this.lastSnapshotTime) return -1;
      return ((performance.now() - this.lastSnapshotTime) / 1000).toFixed(1);
    }
  }

  exports.BridgeAdapter = BridgeAdapter;
})(window.SongNode);

