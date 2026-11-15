/**
 * DREAMSCAPE 2.0 — Spatial Layout Engine
 * Generates art-directed 2.5D spatial compositions for lyric words.
 */

export function generatePhraseLayout(lineWords = [], activeIndex = 0, personality = 'DREAM', seed = 12345) {
  if (!lineWords || lineWords.length === 0) return [];

  const count = lineWords.length;

  return lineWords.map((w, i) => {
    const isHero = i === activeIndex;
    const isSupporting = Math.abs(i - activeIndex) <= 2 && !isHero;
    const isGhost = Math.abs(i - activeIndex) > 2;
    const role = isHero ? 'hero' : (isSupporting ? 'supporting' : 'ghost');

    const offset = i - activeIndex;

    // Beautiful horizontal flow centered on the active word
    // Words preceding active are on the left, words following are on the right
    const stepX = count > 5 ? 120 : 150;
    const x = offset * stepX;
    
    // Subtle architectural vertical rhythm
    const y = offset !== 0 ? (i % 2 === 0 ? -22 : 18) : 0;
    
    // Depth: Hero is at focal front (z=40), supporting words slightly deeper (z=0 to -80)
    const z = isHero ? 40 : -Math.abs(offset) * 35;

    // Scale: Hero is bold and prominent (2.4x), supporting words are crisp (1.1x)
    const scale = isHero ? 2.4 : (isSupporting ? 1.15 : 0.85);

    // Subtle gentle angle for dynamic tension
    const rotZ = offset * -0.015;

    return {
      text: w.text || '',
      startMs: w.startMs,
      endMs: w.endMs,
      role,
      isHero,
      isSupporting,
      isGhost,
      x,
      y,
      z,
      scale,
      rotZ,
      index: i,
    };
  });
}
