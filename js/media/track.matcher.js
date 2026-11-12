/* =========================================================================
   TRACK MATCHER UTILITIES
   Normalises strings for exact, cross-source track and lyric matching
   ========================================================================= */

window.SongNode = window.SongNode || {};

(function(exports) {
  function normalise(str) {
    if (!str) return "";
    return str
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function cleanTitle(str) {
    if (!str) return "";
    return str
      .replace(/\(.*?(remaster|deluxe|version|feat|ft|explicit|edition|mix|live|mono|stereo|bonus|audio).*\)/gi, '')
      .replace(/\[.*?(remaster|deluxe|version|feat|ft|explicit|edition|mix|live|mono|stereo|bonus|audio).*\]/gi, '')
      .replace(/-\s*(remastered|deluxe|single|live|edit).*/gi, '')
      .trim();
  }

  function generateTrackKey(title, artist, album = "") {
    return `${normalise(artist)} ${normalise(cleanTitle(title))} ${normalise(album)}`.trim();
  }

  exports.TrackMatcher = {
    normalise,
    cleanTitle,
    generateTrackKey
  };
})(window.SongNode);

