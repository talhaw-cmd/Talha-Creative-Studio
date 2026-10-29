import { useState } from 'react';
import { Module } from './Modules.jsx';
import RichText from './RichText.jsx';
import { KINDS, kindOf } from './BlockEditor.jsx';
import { inkFor } from '../lib/showcase.js';

// The live canvas inside the editor: the same modules visitors see, click one to edit it.
export default function EditorCanvas({ blocks, settings, cover, selected, onSelect, onChange, onDropFiles, busy }) {
  const [over, setOver] = useState(false);
  const move = (i, d) => { const n = [...blocks]; const j = i + d; if (j < 0 || j >= n.length) return; [n[i], n[j]] = [n[j], n[i]]; onChange(n); };
  const dup = (i) => { const n = [...blocks]; n.splice(i + 1, 0, { ...blocks[i], _k: Math.random().toString(36).slice(2), content: structuredClone(blocks[i].content) }); onChange(n); onSelect(n[i + 1]._k); };
  const del = (i) => { onChange(blocks.filter((_, k) => k !== i)); onSelect(null); };
  return (
    <div className={`ed-canvas sc-canvas ${over ? 'drop' : ''}`} style={{ '--sc-bg': settings.bg, '--sc-ink': inkFor(settings.bg), '--sc-gap': `${settings.spacing}px` }}
      onClick={() => onSelect(null)}
      onDragOver={(e) => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); setOver(true); } }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOver(false); }}
      onDrop={(e) => { if (e.dataTransfer.files?.length) { e.preventDefault(); setOver(false); onDropFiles(e.dataTransfer.files); } }}>
      {settings.showCover && cover && <figure className="mod a-center img" style={{ '--mw': '1400px' }}><img src={cover} alt="" /></figure>}
      {blocks.length === 0 && <div className="ed-empty"><strong>Your canvas is empty</strong><span>Drop images here, or pick something from “Add content” on the right.</span></div>}
      {blocks.map((b, i) => {
        const sel = selected === b._k;
        const emptyText = b.type === 'rich_text' && !(b.content.text || '').trim() && !sel;
        return (
          <div key={b._k} className={`ed-mod ${sel ? 'sel' : ''}`} onClick={(e) => { e.stopPropagation(); onSelect(b._k); }}>
            <div className="ed-tools" onClick={(e) => e.stopPropagation()}>
              <span className="ed-kind">{KINDS[kindOf(b)]?.label || b.type}</span>
              <button type="button" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">↑</button>
              <button type="button" disabled={i === blocks.length - 1} onClick={() => move(i, 1)} aria-label="Move down">↓</button>
              <button type="button" onClick={() => dup(i)} aria-label="Duplicate">⧉</button>
              <button type="button" onClick={() => del(i)} aria-label="Delete">✕</button>
            </div>
            {sel && b.type === 'rich_text'
              ? <div className="mod" style={{ '--mw': '840px' }}><RichText key={b._k} floating content={b.content} onChange={(v) => onChange(blocks.map((x) => (x._k === b._k ? { ...x, content: { ...x.content, ...v } } : x)))} /></div>
              : emptyText ? <div className="mod txt muted" style={{ '--mw': '840px' }}>Click here to write…</div>
                : <Module b={{ ...b, id: b._k }} first />}
          </div>
        );
      })}
      {busy && <div className="ed-busy">{busy}</div>}
    </div>
  );
}
