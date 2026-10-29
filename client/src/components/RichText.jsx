import { useEffect, useRef } from 'react';
import { sanitizeHtml, textToHtml, htmlToText } from '../lib/sanitize.js';

const BTN = [
  ['h2', 'H2', 'Heading', () => document.execCommand('formatBlock', false, 'h2')],
  ['h3', 'H3', 'Subheading', () => document.execCommand('formatBlock', false, 'h3')],
  ['p', '¶', 'Paragraph', () => document.execCommand('formatBlock', false, 'p')],
  ['q', '❝', 'Quote', () => document.execCommand('formatBlock', false, 'blockquote')],
  ['b', 'B', 'Bold', () => document.execCommand('bold')],
  ['i', 'I', 'Italic', () => document.execCommand('italic')],
  ['u', 'U', 'Underline', () => document.execCommand('underline')],
  ['ul', '•', 'Bulleted list', () => document.execCommand('insertUnorderedList')],
  ['ol', '1.', 'Numbered list', () => document.execCommand('insertOrderedList')],
  ['l', '⇤', 'Align left', () => document.execCommand('justifyLeft')],
  ['c', '⇔', 'Align centre', () => document.execCommand('justifyCenter')],
  ['r', '⇥', 'Align right', () => document.execCommand('justifyRight')],
  ['a', '🔗', 'Link', () => { const u = window.prompt('Link address (https://…)'); if (u) document.execCommand('createLink', false, u); }],
  ['x', 'Tx', 'Clear formatting', () => { document.execCommand('removeFormat'); document.execCommand('formatBlock', false, 'p'); }],
];

// Small rich text editor. Stores sanitised `html` plus a plain `text` copy.
export default function RichText({ content, onChange }) {
  const ref = useRef(null);
  const last = useRef(null);
  useEffect(() => {
    const html = content.html ? sanitizeHtml(content.html) : textToHtml(content.text);
    ref.current.innerHTML = html; last.current = html;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const emit = () => {
    const html = sanitizeHtml(ref.current.innerHTML);
    if (html === last.current) return;
    last.current = html;
    onChange({ html, text: htmlToText(html) });
  };
  const onPaste = (e) => {
    e.preventDefault();
    const t = e.clipboardData.getData('text/plain');
    document.execCommand('insertHTML', false, textToHtml(t));
  };
  return (
    <div className="rt">
      <div className="rt-bar" role="toolbar" aria-label="Text formatting">
        {BTN.map(([k, l, t, fn]) => (
          <button key={k} type="button" title={t} aria-label={t} className="rt-btn" onMouseDown={(e) => { e.preventDefault(); ref.current.focus(); fn(); emit(); }}>{l}</button>
        ))}
      </div>
      <div ref={ref} className="rt-area txt" contentEditable suppressContentEditableWarning role="textbox" aria-multiline="true" aria-label="Text" onInput={emit} onBlur={emit} onPaste={onPaste} />
    </div>
  );
}
