import { useState } from 'react';
import { Field } from './ui.jsx';
import { MediaPicker } from './MediaPicker.jsx';

export const BLOCK_TYPES = {
  rich_text: ['Rich text', { text: '' }], image: ['Single image', { url: '', alt: '', caption: '' }],
  full_image: ['Full-width image', { url: '', alt: '', caption: '' }], gallery: ['Gallery', { images: [] }],
  two_columns: ['Two columns', { left: { text: '' }, right: { text: '' } }], video: ['Video', { url: '' }],
  before_after: ['Before / after', { before: '', after: '', alt: '' }], pdf: ['PDF / document', { url: '', label: 'Open PDF' }],
  palette: ['Colour palette', { colors: ['#111111', '#F7F5F0', '#28C37B'] }], divider: ['Divider', {}], spacer: ['Spacer', { height: 48 }],
};

// Image/video/pdf URL field with library picker
function UrlField({ label, value, onChange, accept = 'image' }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="url-field">
      <span className="field-label">{label}</span>
      <div className="row gap">
        {accept === 'image' && value && <img className="thumb sm" src={value} alt="" />}
        <input className="input" placeholder="https://… or choose from library" value={value || ''} onChange={(e) => onChange(e.target.value)} />
        <button type="button" className="btn sm" onClick={() => setOpen(true)}>Library</button>
      </div>
      {open && <MediaPicker accept={accept} onClose={() => setOpen(false)} onSelect={(m) => { onChange(m.url); setOpen(false); }} />}
    </div>
  );
}

function Editor({ block, set }) {
  const c = block.content;
  const up = (patch) => set({ ...c, ...patch });
  switch (block.type) {
    case 'rich_text': return <Field label="Text (blank line = new paragraph)"><textarea className="input" rows="6" value={c.text || ''} onChange={(e) => up({ text: e.target.value })} /></Field>;
    case 'image': case 'full_image': return (<>
      <UrlField label="Image" value={c.url} onChange={(url) => up({ url })} />
      <Field label="Alt text"><input className="input" value={c.alt || ''} onChange={(e) => up({ alt: e.target.value })} /></Field>
      <Field label="Caption"><input className="input" value={c.caption || ''} onChange={(e) => up({ caption: e.target.value })} /></Field></>);
    case 'gallery': {
      const imgs = c.images || [];
      const setImg = (i, patch) => up({ images: imgs.map((im, k) => (k === i ? { ...im, ...patch } : im)) });
      return (<>
        {imgs.map((im, i) => (
          <div key={i} className="sub-card">
            <UrlField label={`Image ${i + 1}`} value={im.url} onChange={(url) => setImg(i, { url })} />
            <div className="row gap"><input className="input" placeholder="Alt text" value={im.alt || ''} onChange={(e) => setImg(i, { alt: e.target.value })} />
              <button type="button" className="btn sm danger" onClick={() => up({ images: imgs.filter((_, k) => k !== i) })}>Remove</button></div>
          </div>))}
        <button type="button" className="btn sm" onClick={() => up({ images: [...imgs, { url: '', alt: '' }] })}>+ Add image</button></>);
    }
    case 'two_columns': return ['left', 'right'].map((side) => {
      const s = c[side] || {};
      const isImg = s.url !== undefined;
      return (
        <div key={side} className="sub-card"><div className="row between"><strong>{side === 'left' ? 'Left' : 'Right'} column</strong>
          <button type="button" className="btn ghost sm" onClick={() => up({ [side]: isImg ? { text: '' } : { url: '', alt: '' } })}>Switch to {isImg ? 'text' : 'image'}</button></div>
          {isImg ? (<><UrlField label="Image" value={s.url} onChange={(url) => up({ [side]: { ...s, url } })} />
            <input className="input" placeholder="Alt text" value={s.alt || ''} onChange={(e) => up({ [side]: { ...s, alt: e.target.value } })} /></>)
            : <textarea className="input" rows="4" value={s.text || ''} onChange={(e) => up({ [side]: { text: e.target.value } })} />}
        </div>);
    });
    case 'video': return <UrlField label="Video (mp4 / webm)" accept="all" value={c.url} onChange={(url) => up({ url })} />;
    case 'before_after': return (<>
      <UrlField label="Before image" value={c.before} onChange={(before) => up({ before })} />
      <UrlField label="After image" value={c.after} onChange={(after) => up({ after })} />
      <Field label="Alt text"><input className="input" value={c.alt || ''} onChange={(e) => up({ alt: e.target.value })} /></Field></>);
    case 'pdf': return (<><UrlField label="PDF file" accept="all" value={c.url} onChange={(url) => up({ url })} />
      <Field label="Button label"><input className="input" value={c.label || ''} onChange={(e) => up({ label: e.target.value })} /></Field></>);
    case 'palette': {
      const cols = c.colors || [];
      return (<div className="row gap wrap">
        {cols.map((x, i) => (
          <div key={i} className="row gap"><input type="color" aria-label={`Colour ${i + 1}`} value={/^#[0-9a-f]{6}$/i.test(x) ? x : '#000000'} onChange={(e) => up({ colors: cols.map((y, k) => (k === i ? e.target.value : y)) })} />
            <button type="button" className="btn ghost sm" onClick={() => up({ colors: cols.filter((_, k) => k !== i) })}>✕</button></div>))}
        <button type="button" className="btn sm" onClick={() => up({ colors: [...cols, '#cccccc'] })}>+ Colour</button></div>);
    }
    case 'spacer': return <Field label="Height (px)"><input className="input" type="number" min="8" max="400" value={c.height ?? 48} onChange={(e) => up({ height: Number(e.target.value) })} /></Field>;
    default: return <p className="muted">No options.</p>;
  }
}

export default function BlockEditor({ blocks, onChange }) {
  const [type, setType] = useState('rich_text');
  const move = (i, d) => { const n = [...blocks]; const j = i + d; if (j < 0 || j >= n.length) return; [n[i], n[j]] = [n[j], n[i]]; onChange(n); };
  const key = () => Math.random().toString(36).slice(2);
  return (
    <div className="blocks-editor">
      {blocks.length === 0 && <p className="muted">No blocks yet. Add text, images, galleries and more to build the case study.</p>}
      {blocks.map((b, i) => (
        <div className="block-card" key={b._k}>
          <div className="row between"><strong>{i + 1}. {BLOCK_TYPES[b.type]?.[0] || b.type}</strong>
            <span className="row gap">
              <button type="button" className="btn sm" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">↑</button>
              <button type="button" className="btn sm" disabled={i === blocks.length - 1} onClick={() => move(i, 1)} aria-label="Move down">↓</button>
              <button type="button" className="btn sm danger" onClick={() => onChange(blocks.filter((_, k) => k !== i))}>Remove</button></span></div>
          <Editor block={b} set={(content) => onChange(blocks.map((x, k) => (k === i ? { ...x, content } : x)))} />
        </div>))}
      <div className="row gap wrap">
        <select className="input" value={type} onChange={(e) => setType(e.target.value)} aria-label="Block type">{Object.entries(BLOCK_TYPES).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}</select>
        <button type="button" className="btn primary" onClick={() => onChange([...blocks, { _k: key(), type, content: structuredClone(BLOCK_TYPES[type][1]) }])}>Add block</button>
      </div>
    </div>
  );
}
