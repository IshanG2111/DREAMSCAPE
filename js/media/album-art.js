/* =========================================================================
   ALBUM ART SERVICE
   Fetches official high-resolution album artwork via iTunes API / SMTC,
   with offline demo art fallbacks and caching.
   ========================================================================= */

window.SongNode = window.SongNode || {};

(function(exports) {
  // Embedded fallback artwork for demo tracks (SVG data URIs or reliable URLs)
  const FALLBACK_ARTWORKS = {
    "currents": "https://upload.wikimedia.org/wikipedia/en/9/9b/Tame_Impala_-_Currents.png",
    "depression cherry": "https://upload.wikimedia.org/wikipedia/en/9/91/Beach_House_-_Depression_Cherry.png",
    "starboy": "https://upload.wikimedia.org/wikipedia/en/3/39/The_Weeknd_-_Starboy.png"
  };

  class AlbumArtService {
    constructor() {
      this.cache = new Map();
      this.currentArtworkUrl = null;
      this.currentTrackKey = null;
      this.onArtworkChange = null;
    }

    async resolveArtwork(track) {
      if (!track || !track.title) return null;

      const title = (track.title || "").trim();
      const artist = (track.artist || "").trim();
      const album = (track.album || "").trim();
      const cacheKey = `${artist} - ${title}`.toLowerCase();

      if (this.cache.has(cacheKey)) {
        const cachedUrl = this.cache.get(cacheKey);
        this.emitChange(cachedUrl, track);
        return cachedUrl;
      }

      // 1. Direct artwork supplied by bridge / SMTC
      if (track.artwork && track.artwork.length > 10) {
        this.cache.set(cacheKey, track.artwork);
        this.emitChange(track.artwork, track);
        return track.artwork;
      }

      // 2. Try iTunes Search API (free, fast, universal)
      try {
        const query = `${artist} ${title} ${album}`.trim();
        const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=1`;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        const resp = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (resp.ok) {
          const data = await resp.json();
          if (data.results && data.results.length > 0) {
            const rawUrl = data.results[0].artworkUrl100;
            if (rawUrl) {
              // Upgrade to 600x600 or 1000x1000 high resolution
              const highResUrl = rawUrl.replace("100x100bb.jpg", "600x600bb.jpg");
              this.cache.set(cacheKey, highResUrl);
              this.emitChange(highResUrl, track);
              return highResUrl;
            }
          }
        }
      } catch (err) {
        // Network or timeout, proceed to fallback
        console.warn("[AlbumArtService] Remote iTunes search failed, checking fallbacks:", err.message);
      }

      // 3. Known Demo Fallbacks
      const lowerQuery = `${artist} ${title} ${album}`.toLowerCase();
      for (const [key, fallbackUrl] of Object.entries(FALLBACK_ARTWORKS)) {
        if (lowerQuery.includes(key)) {
          this.cache.set(cacheKey, fallbackUrl);
          this.emitChange(fallbackUrl, track);
          return fallbackUrl;
        }
      }

      // 4. Procedural Editorial Artwork Generator (Zero external dependencies)
      const proceduralArt = this.generateProceduralArt(artist, album || title);
      this.cache.set(cacheKey, proceduralArt);
      this.emitChange(proceduralArt, track);
      return proceduralArt;
    }

    // Procedural minimalist canvas disc art if offline
    generateProceduralArt(artist, album) {
      const cvs = document.createElement('canvas');
      cvs.width = 400;
      cvs.height = 400;
      const ctx = cvs.getContext('2d');

      // Gradient background
      const grad = ctx.createLinearGradient(0, 0, 400, 400);
      grad.addColorStop(0, '#0a0814');
      grad.addColorStop(0.5, '#1e1035');
      grad.addColorStop(1, '#080b18');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 400, 400);

      // Liquid ripples
      ctx.strokeStyle = 'rgba(141, 101, 255, 0.45)';
      ctx.lineWidth = 1.5;
      for (let r = 30; r < 200; r += 28) {
        ctx.beginPath();
        ctx.arc(200, 200, r, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Concentric iridescent ring
      ctx.strokeStyle = 'rgba(106, 158, 255, 0.65)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(200, 200, 110, 0, Math.PI * 2);
      ctx.stroke();

      // Core chrome sphere
      const sphereGrad = ctx.createRadialGradient(185, 185, 5, 200, 200, 45);
      sphereGrad.addColorStop(0, '#ffffff');
      sphereGrad.addColorStop(0.4, '#c5c9e4');
      sphereGrad.addColorStop(1, '#19102d');
      ctx.fillStyle = sphereGrad;
      ctx.beginPath();
      ctx.arc(200, 200, 45, 0, Math.PI * 2);
      ctx.fill();

      // Subtle editorial typography
      ctx.fillStyle = 'rgba(241, 234, 251, 0.75)';
      ctx.font = "italic 16px 'Cormorant Garamond', Georgia, serif";
      ctx.textAlign = 'center';
      ctx.fillText((album || "CURRENT TRACK").toUpperCase(), 200, 345);

      ctx.fillStyle = 'rgba(130, 118, 143, 0.65)';
      ctx.font = "500 10px 'Space Grotesk', sans-serif";
      ctx.fillText((artist || "DREAMSCAPE").toUpperCase(), 200, 365);

      return cvs.toDataURL('image/png');
    }

    emitChange(url, track) {
      this.currentArtworkUrl = url;
      this.currentTrackKey = `${track.artist} - ${track.title}`;
      if (typeof this.onArtworkChange === 'function') {
        this.onArtworkChange(url, track);
      }
    }
  }

  exports.AlbumArtService = AlbumArtService;
})(window.SongNode);

