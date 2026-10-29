import { useEffect, useRef } from 'react';
import { FONTS, sanitizeHtml, textToHtml, htmlToText } from '../lib/sanitize.js';

const SIZES = [14, 16, 18, 20, 24, 32, 44, 60];
const BLOCK_OF = { p: 'P', h2: 'H2', h3: 'H3', blockquote: 'BLOCKQUOTE' };
const cmd = (c, v) => document.execCommand(c, false, v);

// Rich text editor with a Behance-style toolbar. Stores sanitised `html` plus a plain `text` copy.
export default function RichText({ content, onChange, floating = false }) {
  const ref = useRef(null);
  const last = useRef(null);
  const range = useRef(null);
  useEffect(() => {
    const html = content.html ? sanitizeHtml(content.html) : textToHtml(content.text);
    ref.current.innerHTML = html; last.current = html;
    cmd('styleWithCSS', true);
    const keep = () => { const s = window.getSelection(); if (s.rangeCount && ref.current.contains(s.anchorNode)) range.current = s.getRangeAt(0).cloneRange(); };
    document.addEventListener('selectionchange', keep);
    return () => document.removeEventListener('selectionchange', keep);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const emit = () => {
    const html = sanitizeHtml(ref.current.innerHTML);
    if (html === last.current) return;
    last.current = html;
    onChange({ html, text: htmlToText(html) });
  };
  const run = (fn) => {
    ref.current.focus();
    if (range.current) { const s = window.getSelection(); s.removeAllRanges(); s.addRange(range.current); }
    cmd('styleWithCSS', true); fn(); emit();
  };
  const block = (name) => run(() => cmd('formatBlock', BLOCK_OF[name] || 'P'));
  const size = (px) => run(() => {
    if (!px) return;
    cmd('fontSize', 7);
    ref.current.querySelectorAll('span[style*="xxx-large"], font[size="7"]').forEach((el) => { el.style.fontSize = `${px}px`; if (el.tagName === 'FONT') el.removeAttribute('size'); });
  });
  const dir = () => run(() => {
    const sel = window.getSelection(); let n = sel.anchorNode;
    while (n && n !== ref.current && !(n.nodeType === 1 && /^(P|H2|H3|H4|LI|BLOCKQUOTE|DIV)$/.test(n.tagName))) n = n.parentNode;
    if (!n || n === ref.current) { cmd('formatBlock', 'P'); n = window.getSelection().anchorNode; while (n && n.nodeType !== 1) n = n.parentNode; }
    if (n && n !== ref.current) n.setAttribute('dir', n.getAttribute('dir') === 'rtl' ? 'ltr' : 'rtl');
  });
  const link = () => run(() => { const u = window.prompt('Link address (https://…)'); if (u) cmd('createLink', u); });
  const B = ({ t, l, fn, w }) => <button type="button" title={t} aria-label={t} className="rt-btn" onMouseDown={(e) => { e.preventDefault(); fn(); }} style={w}>{l}</button>;

  return (
    <div className={`rt ${floating ? 'floating' : ''}`}>
      <div className="rt-bar" role="toolbar" aria-label="Text formatting">
        <select aria-label="Paragraph style" defaultValue="p" onChange={(e) => block(e.target.value)}><option value="p">Paragraph</option><option value="h2">Heading</option><option value="h3">Subheading</option><option value="blockquote">Quote</option></select>
        <select aria-label="Font" defaultValue="" onChange={(e) => { const k = e.target.value; if (k) run(() => cmd('fontName', FONTS[k])); }}><option value="" disabled>Font</option><option value="sans">Sans</option><option value="serif">Serif</option><option value="mono">Mono</option></select>
        <select aria-label="Size" defaultValue="" onChange={(e) => size(Number(e.target.value))}><option value="" disabled>Size</option>{SIZES.map((n) => <option key={n} value={n}>{n}</option>)}</select>
        <label className="rt-btn rt-color" title="Text colour"><span>A</span><input type="color" aria-label="Text colour" defaultValue="#1c1b22" onChange={(e) => run(() => cmd('foreColor', e.target.value))} /></label>
        <B t="Bold" l={<b>B</b>} fn={() => run(() => cmd('bold'))} /><B t="Italic" l={<i>I</i>} fn={() => run(() => cmd('italic'))} /><B t="Underline" l={<u>U</u>} fn={() => run(() => cmd('underline'))} />
        <B t="Align left" l="⇤" fn={() => run(() => cmd('justifyLeft'))} /><B t="Align centre" l="⇔" fn={() => run(() => cmd('justifyCenter'))} /><B t="Align right" l="⇥" fn={() => run(() => cmd('justifyRight'))} />
        <B t="Bulleted list" l="•" fn={() => run(() => cmd('insertUnorderedList'))} /><B t="Numbered list" l="1." fn={() => run(() => cmd('insertOrderedList'))} />
        <B t="Link" l="🔗" fn={link} /><B t="Remove link" l="⛓" fn={() => run(() => cmd('unlink'))} />
        <B t="Clear formatting" l="Tx" fn={() => run(() => { cmd('removeFormat'); cmd('formatBlock', 'P'); })} />
        <B t="Switch text direction (left-to-right / right-to-left)" l="⇄" fn={dir} />
      </div>
      <div ref={ref} className="rt-area txt" contentEditable suppressContentEditableWarning role="textbox" aria-multiline="true" aria-label="Text" data-placeholder="Enter your text here…" onInput={emit} onBlur={emit}
        onPaste={(e) => { e.preventDefault(); cmd('insertHTML', textToHtml(e.clipboardData.getData('text/plain'))); }} />
    </div>
  );
}
