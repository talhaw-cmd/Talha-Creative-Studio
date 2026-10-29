// Allow-list HTML sanitiser for rich text modules (DOMParser never runs scripts).
const KEEP = new Set(['P', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'H2', 'H3', 'H4', 'UL', 'OL', 'LI', 'A', 'BLOCKQUOTE', 'DIV']);
const DROP = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'SVG', 'MATH', 'LINK', 'META', 'TEMPLATE', 'FORM', 'INPUT', 'BUTTON', 'TEXTAREA', 'SELECT']);
const ALIGN = new Set(['left', 'center', 'right', 'justify']);
const safeHref = (h) => (/^(https?:\/\/|mailto:|\/)/i.test((h || '').trim()) ? h.trim() : null);

function clean(node, doc) {
  [...node.childNodes].forEach((c) => {
    if (c.nodeType === 3) return;
    if (c.nodeType !== 1) { c.remove(); return; }
    if (DROP.has(c.tagName.toUpperCase())) { c.remove(); return; }
    clean(c, doc);
    if (!KEEP.has(c.tagName)) { c.replaceWith(...c.childNodes); return; }
    const align = (c.style?.textAlign || '').toLowerCase();
    const href = c.tagName === 'A' ? safeHref(c.getAttribute('href')) : null;
    [...c.attributes].forEach((a) => c.removeAttribute(a.name));
    if (ALIGN.has(align) && align !== 'left') c.setAttribute('style', `text-align:${align}`);
    if (c.tagName === 'A') {
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
