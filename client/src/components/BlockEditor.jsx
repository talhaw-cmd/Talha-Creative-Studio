import { useRef, useState } from 'react';
import { Field, useToast } from './ui.jsx';
import { MediaPicker } from './MediaPicker.jsx';
import { DEFAULT_WIDTH, WIDTHS } from '../lib/showcase.js';
import { embedSrc } from '../lib/embed.js';
import { measure, uploadMedia } from '../lib/image.js';

// kind = what the editor calls it; type = what is stored in the database
export const KINDS = {
  image: { label: 'Image', icon: '🖼', type: 'image', content: { url: '', alt: '', caption: '' } },
  rich_text: { label: 'Text', icon: 'T', type: 'rich_text', content: { html: '<p></p>', text: '' } },
  gallery: { label: 'Photo Grid', icon: '▦', type: 'gallery', content: { images: [], perRow: 2, gap: 2, gw: 100 } },
  video: { label: 'Video', icon: '▶', type: 'video', content: { url: '' } },
  embed: { label: 'Embed', icon: '</>', type: 'video', content: { embed: '' } },
  before_after: { label: 'Before / After', icon: '◐', type: 'before_after', content: { before: '', after: '', alt: '' } },
  two_columns: { label: 'Two columns', icon: '◫', type: 'two_columns', content: { left: { text: '' }, right: { text: '' } } },
  pdf: { label: 'PDF', icon: '⎘', type: 'pdf', content: { url: '', label: 'Open PDF' } },
  palette: { label: 'Palette', icon: '◩', type: 'palette', content: { colors: ['#111111', '#F7F5F0', '#28C37B'] } },
  divider: { label: 'Divider', icon: '—', type: 'divider', content: {} },
  spacer: { label: 'Spacer', icon: '↕', type: 'spacer', content: { height: 48 } },
};
export const kindOf = (b) => (b.type === 'video' && b.content?.embed !== undefined ? 'embed' : b.type === 'full_image' ? 'image' : b.type);
export const newBlock = (kind) => ({ _k: Math.random().toString(36).slice(2), type: KINDS[kind].type, content: structuredClone(KINDS[kind].content) });

const WIDTH_LABEL = { full: 'Full 1400', wide: 'Wide 1100', standard: 'Standard 840', narrow: 'Narrow 600' };
const isImg = (t) => t === 'image' || t === 'full_image';

// Upload image files (resized in the browser if huge) and return measured image blocks.
export async function filesToImageBlocks(files, toast, onProgress) {
  const list = [...files].filter((f) => f.type.startsWith('image/'));
  if (!list.length) { toast.error('Choose image files only'); return []; }
  const out = [];
  for (let i = 0; i < list.length; i++) {
    onProgress?.(`Uploading ${i + 1} of ${list.length}…`);
    try {
      const r = await uploadMedia(list[i]); const s = await measure(r.data.url);
      out.push({ url: r.data.url, alt: r.data.alt_text || '', w: s?.w, h: s?.h });
      if (r.resized) toast.success(`${list[i].name} resized to 2800px wide`);
    } catch (err) { toast.error(`${list[i].name}: ${err.message}`); }
  }
  onProgress?.('');
  return out;
}

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
  if (['spacer', 'divider'].includes(t) && !c.embed) return null;
  const aligned = t === 'rich_text' || isImg(t);
  return (
    <div className="layout-row">
      {t !== 'gallery' && <label>Width<select className="input" value={c.width || DEFAULT_WIDTH[t] || 'wide'} onChange={(e) => up({ width: e.target.value })}>{Object.keys(WIDTHS).map((k) => <option key={k} value={k}>{WIDTH_LABEL[k]}</option>)}</select></label>}
      {aligned && <label>{t === 'rich_text' ? 'Text align' : 'Align'}<select className="input" value={c.align || (t === 'rich_text' ? 'left' : 'center')} onChange={(e) => up({ align: e.target.value })}><option value="left">Left</option><option value="center">Centre</option><option value="right">Right</option></select></label>}
      {t === 'rich_text' && <label>Base size<select className="input" value={c.size || 'm'} onChange={(e) => up({ size: e.target.value })}><option value="s">Small</option><option value="m">Normal</option><option value="l">Large</option></select></label>}
      {isImg(t) && <label>Corners<select className="input" value={c.radius || 'none'} onChange={(e) => up({ radius: e.target.value })}><option value="none">Square</option><option value="sm">Soft</option><option value="md">Rounded</option><option value="lg">Round</option></select></label>}
      {isImg(t) && <label className="check"><input type="checkbox" checked={!!c.fit} onChange={(e) => up({ fit: e.target.checked })} /> Fill the width</label>}
    </div>
  );
}

function PhotoGridEditor({ c, up }) {
  const toast = useToast(); const fileRef = useRef(null); const [busy, setBusy] = useState('');
  const imgs = c.images || [];
  const setImg = (i, patch) => up({ images: imgs.map((im, k) => (k === i ? { ...im, ...patch } : im)) });
  const mv = (i, d) => { const n = [...imgs]; const j = i + d; if (j < 0 || j >= n.length) return; [n[i], n[j]] = [n[j], n[i]]; up({ images: n }); };
  const add = async (files) => { const r = await filesToImageBlocks(files, toast, setBusy); if (r.length) up({ images: [...imgs, ...r] }); };
  return (<>
    <div className="layout-row">
      <label>Images per row<select className="input" value={c.perRow || c.cols || 2} onChange={(e) => up({ perRow: Number(e.target.value) })}>{[1, 2, 3, 4].map((n) => <option key={n}>{n}</option>)}</select></label>
      <label>Gap<select className="input" value={c.gap ?? 2} onChange={(e) => up({ gap: Number(e.target.value) })}><option value="0">None</option><option value="2">Thin (2px)</option><option value="8">Small</option><option value="16">Medium</option><option value="32">Large</option></select></label>
      <label>Grid width<select className="input" value={c.gw || 100} onChange={(e) => up({ gw: Number(e.target.value) })}><option value="100">Full</option><option value="90">Wide (90%)</option><option value="80">Inset (80%)</option><option value="60">Narrow (60%)</option></select></label>
      <label>Crop<select className="input" value={c.crop || 'natural'} onChange={(e) => up({ crop: e.target.value })}><option value="natural">Keep each ratio</option><option value="square">Square</option></select></label>
    </div>
    <div className="pg-edit">
      {imgs.map((im, i) => (
        <div key={i} className="pg-tile">
          {im.url ? <img src={im.url} alt="" /> : <div className="thumb empty">No image</div>}
          <div className="row between"><span className="small muted">{im.w ? `${im.w}×${im.h}` : ''}</span>
            <span className="row gap"><button type="button" className="btn ghost sm" onClick={() => mv(i, -1)} aria-label="Move earlier">←</button><button type="button" className="btn ghost sm" onClick={() => mv(i, 1)} aria-label="Move later">→</button><button type="button" className="btn ghost sm" onClick={() => up({ images: imgs.filter((_, k) => k !== i) })} aria-label="Remove image">✕</button></span></div>
          <input className="input" placeholder="Alt text" value={im.alt || ''} onChange={(e) => setImg(i, { alt: e.target.value })} />
        </div>))}
    </div>
    <button type="button" className="btn primary" disabled={!!busy} onClick={() => fileRef.current.click()}>{busy || '+ Add photos'}</button>
    <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple hidden onChange={(e) => { add(e.target.files); e.target.value = ''; }} />
  </>);
}

function Editor({ block, set }) {
  const c = block.content;
  const up = (patch) => set({ ...c, ...patch });
  const width = c.width || DEFAULT_WIDTH[block.type] || 'wide';
  switch (block.type) {
    case 'rich_text': return <p className="muted small">Click the text on the canvas to edit it. The toolbar appears above it.</p>;
    case 'image': case 'full_image': return (<>
      <UrlField label="Image" value={c.url} onChange={(url, s) => up({ url, w: s?.w, h: s?.h })} />
      <Quality w={c.w} h={c.h} width={width} />
      <Field label="Alt text"><input className="input" value={c.alt || ''} onChange={(e) => up({ alt: e.target.value })} /></Field>
      <Field label="Caption"><input className="input" value={c.caption || ''} onChange={(e) => up({ caption: e.target.value })} /></Field></>);
    case 'gallery': return <PhotoGridEditor c={c} up={up} />;
    case 'two_columns': return ['left', 'right'].map((side) => {
      const s = c[side] || {}; const img = s.url !== undefined;
      return (
        <div key={side} className="sub-card"><div className="row between"><strong>{side === 'left' ? 'Left' : 'Right'} column</strong>
          <button type="button" className="btn ghost sm" onClick={() => up({ [side]: img ? { text: '' } : { url: '', alt: '' } })}>Switch to {img ? 'text' : 'image'}</button></div>
          {img ? (<><UrlField label="Image" value={s.url} onChange={(url) => up({ [side]: { ...s, url } })} />
            <input className="input" placeholder="Alt text" value={s.alt || ''} onChange={(e) => up({ [side]: { ...s, alt: e.target.value } })} /></>)
            : <textarea className="input" rows="4" value={s.text || ''} onChange={(e) => up({ [side]: { text: e.target.value } })} />}
        </div>);
    });
    case 'video':
      if (c.embed !== undefined) return (<Field label="YouTube or Vimeo link" hint="Only YouTube and Vimeo links can be embedded.">
        <input className="input" placeholder="https://www.youtube.com/watch?v=…" value={c.embed} onChange={(e) => up({ embed: e.target.value })} />
        {c.embed && !embedSrc(c.embed) && <p className="warn">This link can’t be embedded. Use a YouTube or Vimeo link.</p>}</Field>);
      return <UrlField label="Video file (mp4 / webm)" accept="all" value={c.url} onChange={(url) => up({ url })} />;
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

// Sidebar panel for the selected module.
export function Inspector({ block, onChange }) {
  const set = (content) => onChange({ ...block, content });
  return (
    <div className="insp">
      <Layout block={block} up={(patch) => set({ ...block.content, ...patch })} />
      <Editor block={block} set={set} />
    </div>
  );
}
