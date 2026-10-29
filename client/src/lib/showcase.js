// Case-study settings live in one hidden "divider" block (content.__settings) so the database needs no change.
export const defaultSettings = { bg: '#ffffff', spacing: 0, showCover: true };
export const WIDTHS = { full: 1400, wide: 1100, standard: 840, narrow: 600 };
export const DEFAULT_WIDTH = { rich_text: 'standard', pdf: 'standard', image: 'full', full_image: 'full', gallery: 'full', two_columns: 'wide', video: 'wide', before_after: 'wide', palette: 'wide', divider: 'wide' };

export function splitBlocks(blocks = []) {
  let settings = { ...defaultSettings };
  const modules = [];
  blocks.forEach((b) => {
    if (b?.content?.__settings) settings = { ...settings, ...b.content, __settings: undefined };
    else modules.push(b);
  });
  return { settings, modules };
}
export const settingsBlock = (settings) => ({ type: 'divider', content: { __settings: true, bg: settings.bg, spacing: Number(settings.spacing) || 0, showCover: !!settings.showCover } });

// readable text colour for a background
export function inkFor(bg = '#ffffff') {
  const m = /^#?([0-9a-f]{6})$/i.exec(bg.trim()); if (!m) return '#1c1b22';
  const n = parseInt(m[1], 16); const r = n >> 16; const g = (n >> 8) & 255; const b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55 ? '#1c1b22' : '#f5f3ee';
}
