// Case-study settings live in one hidden "divider" block (content.__settings) so the database needs no change.
export const defaultSettings = { bg: '#ffffff', spacing: 2, showCover: false, button: { label: '', url: '' } };
export const WIDTHS = { full: 1400, wide: 1100, standard: 840, narrow: 600 };
export const DEFAULT_WIDTH = { rich_text: 'standard', pdf: 'standard', image: 'full', full_image: 'full', gallery: 'full', two_columns: 'wide', video: 'wide', before_after: 'wide', palette: 'wide', divider: 'wide' };
// Behance cover is 808 x 632 (about 1.28:1). We store/crop at 2x for sharp retina cards.
export const COVER = { w: 808, h: 632, outW: 1616, outH: 1264, ratio: 808 / 632 };

export function splitBlocks(blocks = []) {
  let settings = { ...defaultSettings, button: { ...defaultSettings.button } };
  const modules = [];
  blocks.forEach((b) => {
    if (b?.content?.__settings) {
      const { __settings, button, ...rest } = b.content;
      settings = { ...settings, ...rest, button: { ...settings.button, ...(button || {}) } };
    } else modules.push(b);
  });
  return { settings, modules };
}
export const settingsBlock = (s) => ({
  type: 'divider',
  content: { __settings: true, bg: s.bg, spacing: Math.min(Math.max(Number(s.spacing) || 0, 0), 80), showCover: !!s.showCover, button: { label: (s.button?.label || '').slice(0, 40), url: s.button?.url || '' } },
});

export const safeUrl = (u) => (typeof u === 'string' && /^(https?:\/\/|mailto:|\/(?!\/))/i.test(u.trim()) ? u.trim() : null);

// readable text colour for a background
export function inkFor(bg = '#ffffff') {
  const m = /^#?([0-9a-f]{6})$/i.exec(bg.trim()); if (!m) return '#1c1b22';
  const n = parseInt(m[1], 16); const r = n >> 16; const g = (n >> 8) & 255; const b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55 ? '#1c1b22' : '#f5f3ee';
}
