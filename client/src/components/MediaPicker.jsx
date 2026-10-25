import { useRef, useState } from 'react';
import { admin, fmtSize } from '../lib/api.js';
import { useAsync, useDebounced } from '../lib/useAsync.js';
import { Empty, ErrorState, Modal, Pager, Spinner, useToast } from './ui.jsx';

// Pick (or upload) an image from the media library. Calls onSelect(asset).
export function MediaPicker({ onSelect, onClose, accept = 'image' }) {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const dq = useDebounced(q);
  const toast = useToast();
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const { data, loading, error, reload } = useAsync(
    () => admin.get('/media', { q: dq, page, limit: 24, type: accept === 'image' ? 'image' : undefined }), [dq, page, accept]);

  async function onFile(e) {
    const f = e.target.files?.[0]; if (!f) return;
    if (f.size > 20 * 1024 * 1024) return toast.error('File is larger than 20 MB');
    setBusy(true);
    try { const r = await admin.upload('/media', f); toast.success(r.meta?.reused ? 'Already in library — reused' : 'Uploaded'); onSelect(r.data); }
    catch (err) { toast.error(err.message); } finally { setBusy(false); e.target.value = ''; }
  }

  return (
    <Modal title="Media library" onClose={onClose} wide>
      <div className="row gap wrap">
        <input className="input" placeholder="Search files…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <button className="btn primary" disabled={busy} onClick={() => fileRef.current.click()}>{busy ? 'Uploading…' : 'Upload new'}</button>
        <input ref={fileRef} type="file" hidden onChange={onFile} accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,application/pdf" />
      </div>
      {loading ? <Spinner /> : error ? <ErrorState error={error} onRetry={reload} /> :
        !data.data.length ? <Empty title="No files yet" hint="Upload your first image." /> : (
          <div className="media-grid">
            {data.data.map((m) => (
              <button key={m.id} className="media-tile" onClick={() => onSelect(m)} title={m.file_name}>
                {m.mime_type?.startsWith('image/') ? <img src={m.url} alt={m.alt_text || m.file_name} loading="lazy" /> : <span className="file-ico">{m.mime_type?.split('/')[1]}</span>}
                <small>{m.file_name}<br />{fmtSize(m.size_bytes || 0)}</small>
              </button>
            ))}
          </div>
        )}
      <Pager meta={data?.meta} onPage={setPage} />
    </Modal>
  );
}

// Small field wrapper: shows a thumbnail + choose/clear buttons
export function MediaField({ value, url, onChange, label = 'Choose image' }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="media-field">
      {url ? <img src={url} alt="" className="thumb" /> : <div className="thumb empty">No image</div>}
      <div className="col gap">
        <button type="button" className="btn sm" onClick={() => setOpen(true)}>{value ? 'Change' : label}</button>
        {value && <button type="button" className="btn ghost sm" onClick={() => onChange(null)}>Remove</button>}
      </div>
      {open && <MediaPicker onClose={() => setOpen(false)} onSelect={(m) => { onChange(m); setOpen(false); }} />}
    </div>
  );
}
