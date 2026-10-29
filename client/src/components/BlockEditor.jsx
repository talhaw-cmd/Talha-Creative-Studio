import { useRef, useState } from 'react';
import { Field, useToast } from './ui.jsx';
import { MediaPicker } from './MediaPicker.jsx';
import RichText from './RichText.jsx';
import { DEFAULT_WIDTH, WIDTHS } from '../lib/showcase.js';
import { measure, uploadMedia } from '../lib/image.js';

export const BLOCK_TYPES = {
  rich_text: ['Text', { html: '<p></p>', text: '' }], image: ['Image', { url: '', alt: '', caption: '' }],
  full_image: ['Full-width image', { url: '', alt: '', caption: '' }], gallery: ['Gallery', { images: [], cols: 2, gap: 0 }],
  two_columns: ['Two columns', { left: { text: '' }, right: { text: '' } }], video: ['Video', { url: '' }],
  before_after: ['Before / after', { before: '', after: '', alt: '' }], pdf: ['PDF / document', { url: '', label: 'Open PDF' }],
  palette: ['Colour palette', { colors: ['#111111', '#F7F5F0', '#28C37B'] }], divider: ['Divider', {}], spacer: ['Spacer', { height: 48 }],
};
const NO_WIDTH = ['spacer'];
const WIDTH_LABEL = { full: 'Full 1400', wide: 'Wide 1100', standard: 'Standard 840', narrow: 'Narrow 600' };
const isImg = (t) => t === 'image' || t === 'full_image';
const key = () => Math.random().toString(36).slice(2);

// Image/video/pdf URL field with library picker. onChange(url, size?) — size is measured for images.
function UrlField({ label, value, onChange, accept = 'image' }) {
  const [open, setOpen] = useState(false);
  const pick = async (url) => onChange(url, accept === 'image' ? await measure(url) : null);
  return (
    <div className="url-field">
      <span className="field-label">{label}</span>
      <div className="row gap">
        {accept === 'image' && value && <img className="thumb sm" src={value} alt="" />}
        <input className="input" placeholder="https://… or choose from library" value={value || ''} onChange={(e) => onChange(e.target.value, null)} onBlur={(e) => accept === 'image' && e.target.value && pick(e.target.value)} />
        <button type="button" className="btn sm" onClick={() => setOpen(true)}>Library</button>
      </div>
      {open && <MediaPicker accept={accept} onClose={() => setOpen(false)} onSelect={(m) => { pick(m.url); setOpen(false); }} />}
    </div>
  );
}

function Quality({ w, h, width }) {
  if (!w) return null;
  const canvas = WIDTHS[width] || 1100;
  const msg = w < canvas ? `Shown at its own width (${w}px), not stretched, so it stays sharp.` : w > 2800 ? 'Very large file. It will be scaled down to fit.' : 'Sharp at this width.';
  return <p className={`small ${w < 600 ? 'warn' : 'muted'}`}>{w} × {h}px · {msg}{w < 600 ? ' Low resolution. Use a larger file if you can.' : ''}</p>;
}

function Layout({ block, up }) {
  const c = block.content; const t = block.type;
  if (NO_WIDTH.includes(t)) return null;
  const aligned = t === 'rich_text' || isImg(t);
  return (
    <div className="layout-row">
      <label>Width<select className="input" value={c.width || DEFAULT_WIDTH[t] || 'wide'} onChange={(e) => up({ width: e.target.value })}>{Object.keys(WIDTHS).map((k) => <option key={k} value={k}>{WIDTH_LABEL[k]}</option>)}</select></label>
      {aligned && <label>Align<select className="input" value={c.align || 'center'} onChange={(e) => up({ align: e.target.value })}><option value="left">Left</option><option value="center">Centre</option><option value="right">Right</option></select></label>}
      {t === 'rich_text' && <label>Text size<select className="input" value={c.size || 'm'} onChange={(e) => up({ size: e.target.value })}><option value="s">Small</option><option value="m">Normal</option><option value="l">Large</option></select></label>}
      {isImg(t) && <label>Corners<select className="input" value={c.radius || 'none'} onChange={(e) => up({ radius: e.target.value })}><option value="none">Square</option><option value="sm">Soft</option><option value="md">Rounded</option><option value="lg">Round</option></select></label>}
      {isImg(t) && <label className="check"><input type="checkbox" checked={!!c.fit} onChange={(e) => up({ fit: e.target.checked })} /> Fill the width</label>}
    </div>
  );
}

function Editor({ block, set }) {
  const c = block.content;
  const up = (patch) => set({ ...c, ...patch });
  const width = c.width || DEFAULT_WIDTH[block.type] || 'wide';
  switch (block.type) {
    case 'rich_text': return <RichText content={c} onChange={(v) => up(v)} />;
    case 'image': case 'full_image': return (<>
      <UrlField label="Image" value={c.url} onChange={(url, s) => up({ url, w: s?.w, h: s?.h })} />
      <Quality w={c.w} h={c.h} width={width} />
      <div className="grid2">
        <Field label="Alt text"><input className="input" value={c.alt || ''} onChange={(e) => up({ alt: e.target.value })} /></Field>
        <Field label="Caption"><input className="input" value={c.caption || ''} onChange={(e) => up({ caption: e.target.value })} /></Field>
      </div></>);
    case 'gallery': {
      const imgs = c.images || [];
      const setImg = (i, patch) => up({ images: imgs.map((im, k) => (k === i ? { ...im, ...patch } : im)) });
      return (<>
        <div className="layout-row">
          <label>Columns<select className="input" value={c.cols || 2} onChange={(e) => up({ cols: Number(e.target.value) })}>{[1, 2, 3, 4].map((n) => <option key={n}>{n}</option>)}</select></label>
          <label>Gap<select className="input" value={c.gap || 0} onChange={(e) => up({ gap: Number(e.target.value) })}><option value="0">None</option><option value="8">Small</option><option value="16">Medium</option><option value="32">Large</option></select></label>
          <label>Crop<select className="input" value={c.crop || 'natural'} onChange={(e) => up({ crop: e.target.value })}><option value="natural">Natural</option><option value="square">Square</option></select></label>
        </div>
        {imgs.map((im, i) => (
          <div key={i} className="sub-card">
            <UrlField label={`Image ${i + 1}`} value={im.url} onChange={(url, s) => setImg(i, { url, w: s?.w, h: s?.h })} />
            <div className="row gap"><input className="input" placeholder="Alt text" value={im.alt || ''} onChange={(e) => setImg(i, { alt: e.target.value })} />
              <button type="button" className="btn sm danger" onClick={() => up({ images: imgs.filter((_, k) => k !== i) })}>Remove</button></div>
          </div>))}
        <button type="button" className="btn sm" onClick={() => up({ images: [...imgs, { url: '', alt: '' }] })}>+ Add image</button></>);
    }
    case 'two_columns': return ['left', 'right'].map((side) => {
      const s = c[side] || {};
      const img = s.url !== undefined;
      return (
        <div key={side} className="sub-card"><div className="row between"><strong>{side === 'left' ? 'Left' : 'Right'} column</strong>
          <button type="button" className="btn ghost sm" onClick={() => up({ [side]: img ? { text: '' } : { url: '', alt: '' } })}>Switch to {img ? 'text' : 'image'}</button></div>
          {img ? (<><UrlField label="Image" value={s.url} onChange={(url) => up({ [side]: { ...s, url } })} />
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

const summary = (b) => {
  const c = b.content || {};
  if (b.type === 'rich_text') return (c.text || '').slice(0, 60);
  if (isImg(b.type)) return c.alt || (c.url || '').split('/').pop();
  if (b.type === 'gallery') return `${(c.images || []).length} images`;
  return '';
};

export default function BlockEditor({ blocks, onChange }) {
  const toast = useToast();
  const [type, setType] = useState('rich_text');
  const [shut, setShut] = useState({});
  const [busy, setBusy] = useState('');
  const [over, setOver] = useState(false);
  const fileRef = useRef(null);
  const move = (i, d) => { const n = [...blocks]; const j = i + d; if (j < 0 || j >= n.length) return; [n[i], n[j]] = [n[j], n[i]]; onChange(n); };
  const dup = (i) => { const n = [...blocks]; n.splice(i + 1, 0, { ...blocks[i], _k: key(), content: structuredClone(blocks[i].content) }); onChange(n); };

  // Upload many images at once: each becomes its own image block, in order.
  async function addFiles(fileList) {
    const files = [...fileList].filter((f) => f.type.startsWith('image/'));
    if (!files.length) return toast.error('Drop image files only');
    const added = [];
    for (let i = 0; i < files.length; i++) {
      setBusy(`Uploading ${i + 1} of ${files.length}…`);
      try {
        const r = await uploadMedia(files[i]);
        const s = await measure(r.data.url);
        added.push({ _k: key(), type: 'image', content: { url: r.data.url, alt: r.data.alt_text || '', caption: '', w: s?.w, h: s?.h } });
        if (r.resized) toast.success(`${files[i].name} resized to 2800px wide`);
      } catch (err) { toast.error(`${files[i].name}: ${err.message}`); }
    }
    setBusy('');
    if (added.length) onChange([...blocks, ...added]);
  }

  return (
    <div className={`blocks-editor ${over ? 'drop' : ''}`}
      onDragOver={(e) => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); setOver(true); } }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOver(false); }}
      onDrop={(e) => { if (e.dataTransfer.files?.length) { e.preventDefault(); setOver(false); addFiles(e.dataTransfer.files); } }}>
      {blocks.length === 0 && <p className="muted">Nothing here yet. Drop images onto this area, or add text, galleries and more. Blocks appear stacked on one centred canvas, like a Behance project.</p>}
      {blocks.map((b, i) => (
        <div className="block-card" key={b._k}>
          <div className="row between">
            <button type="button" className="blk-title" onClick={() => setShut((s) => ({ ...s, [b._k]: !s[b._k] }))} aria-expanded={!shut[b._k]}>
              <span>{shut[b._k] ? '▸' : '▾'}</span> <strong>{i + 1}. {BLOCK_TYPES[b.type]?.[0] || b.type}</strong> {shut[b._k] && <em className="muted small">{summary(b)}</em>}
            </button>
            <span className="row gap">
              <button type="button" className="btn sm" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">↑</button>
              <button type="button" className="btn sm" disabled={i === blocks.length - 1} onClick={() => move(i, 1)} aria-label="Move down">↓</button>
              <button type="button" className="btn sm" onClick={() => dup(i)}>Duplicate</button>
              <button type="button" className="btn sm danger" onClick={() => onChange(blocks.filter((_, k) => k !== i))}>Remove</button></span></div>
          {!shut[b._k] && (<>
            <Layout block={b} up={(patch) => onChange(blocks.map((x, k) => (k === i ? { ...x, content: { ...x.content, ...patch } } : x)))} />
            <Editor block={b} set={(content) => onChange(blocks.map((x, k) => (k === i ? { ...x, content } : x)))} />
          </>)}
        </div>))}
      <div className="row gap wrap center">
        <select className="input" value={type} onChange={(e) => setType(e.target.value)} aria-label="Block type">{Object.entries(BLOCK_TYPES).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}</select>
        <button type="button" className="btn primary" onClick={() => onChange([...blocks, { _k: key(), type, content: structuredClone(BLOCK_TYPES[type][1]) }])}>Add block</button>
        <button type="button" className="btn" disabled={!!busy} onClick={() => fileRef.current.click()}>{busy || 'Upload images'}</button>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
      </div>
    </div>
  );
}
