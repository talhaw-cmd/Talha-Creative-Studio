// Allow-list HTML sanitiser for rich text modules (DOMParser never runs scripts).
const KEEP = new Set(['P', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'H2', 'H3', 'H4', 'UL', 'OL', 'LI', 'A', 'BLOCKQUOTE', 'DIV', 'SPAN']);
const DROP = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'SVG', 'MATH', 'LINK', 'META', 'TEMPLATE', 'FORM', 'INPUT', 'BUTTON', 'TEXTAREA', 'SELECT']);
const ALIGN = new Set(['left', 'center', 'right', 'justify']);
const BLOCKS = new Set(['P', 'H2', 'H3', 'H4', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'DIV']);
export const FONTS = { sans: "Inter, Helvetica, Arial, sans-serif", serif: "Georgia, 'Times New Roman', serif", mono: "'Courier New', monospace" };
const safeHref = (h) => (/^(https?:\/\/|mailto:|\/)/i.test((h || '').trim()) ? h.trim() : null);

function hex(c = '') {
  c = c.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(c)) return c;
  if (/^#[0-9a-f]{3}$/.test(c)) return `#${c[1]}${c[1]}${c[2]}${c[2]}${c[3]}${c[3]}`;
  const m = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(c);
  return m ? `#${[m[1], m[2], m[3]].map((n) => Math.min(255, +n).toString(16).padStart(2, '0')).join('')}` : null;
}
function fontKey(f = '') {
  f = f.toLowerCase();
  if (/courier|mono/.test(f)) return 'mono';
  if (/georgia|times|serif/.test(f) && !/sans/.test(f)) return 'serif';
  if (/inter|helvetica|arial|sans/.test(f)) return 'sans';
  return null;
}

function clean(node, doc) {
  [...node.childNodes].forEach((c) => {
    if (c.nodeType === 3) return;
    if (c.nodeType !== 1) { c.remove(); return; }
    const tag = c.tagName.toUpperCase();
    if (DROP.has(tag)) { c.remove(); return; }
    if (tag === 'FONT') { // legacy execCommand output
      const s = doc.createElement('span'); const col = c.getAttribute('color'); const face = c.getAttribute('face');
      if (col) s.style.color = col; if (face) s.style.fontFamily = face;
      while (c.firstChild) s.appendChild(c.firstChild); c.replaceWith(s); clean(node, doc); return;
    }
    clean(c, doc);
    if (!KEEP.has(tag)) { c.replaceWith(...c.childNodes); return; }
    const st = c.style || {};
    const align = (st.textAlign || '').toLowerCase();
    const dir = c.getAttribute('dir');
    const href = tag === 'A' ? safeHref(c.getAttribute('href')) : null;
    const color = tag === 'SPAN' || tag === 'A' ? hex(st.color) : null;
    const size = parseFloat(st.fontSize); const px = /px$/.test(st.fontSize || '') && size >= 10 && size <= 96 ? Math.round(size) : null;
    const fk = tag === 'SPAN' ? fontKey(st.fontFamily) : null;
    [...c.attributes].forEach((a) => c.removeAttribute(a.name));
    const css = [];
    if (BLOCKS.has(tag) && ALIGN.has(align) && align !== 'left') css.push(`text-align:${align}`);
    if (tag === 'SPAN') {
      if (color) css.push(`color:${color}`);
      if (px) css.push(`font-size:${px}px`);
      if (fk && fk !== 'sans') css.push(`font-family:${FONTS[fk]}`);
    }
    if (css.length) c.setAttribute('style', css.join(';'));
    if (BLOCKS.has(tag) && (dir === 'rtl' || dir === 'ltr')) c.setAttribute('dir', dir);
    if (tag === 'SPAN' && !css.length) { c.replaceWith(...c.childNodes); return; }
    if (tag === 'A') {
      if (!href) { c.replaceWith(...c.childNodes); return; }
      c.setAttribute('href', href); c.setAttribute('target', '_blank'); c.setAttribute('rel', 'noopener noreferrer');
    }
  });
}
export function sanitizeHtml(html = '') {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  clean(doc.body, doc);
  return doc.body.innerHTML.replace(/<div><br><\/div>/g, '<p><br></p>');
}
export const textToHtml = (t = '') => String(t).split(/\n{2,}/).filter(Boolean).map((p) => `<p>${p.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\n/g, '<br>')}</p>`).join('');
export const htmlToText = (h = '') => { const d = new DOMParser().parseFromString(`<body>${h}</body>`, 'text/html'); return d.body.textContent || ''; };
