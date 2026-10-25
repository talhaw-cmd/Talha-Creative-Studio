import { useRef, useState } from 'react';
import { admin, fmtSize } from '../../lib/api.js';
import { useAsync, useDebounced, useTitle } from '../../lib/useAsync.js';
import { Empty, ErrorState, Field, Modal, Pager, Spinner, useConfirm, useToast } from '../../components/ui.jsx';

export default function Media() {
  useTitle('Media');
  const [q, setQ] = useState(''); const [page, setPage] = useState(1);
  const dq = useDebounced(q);
  const [edit, setEdit] = useState(null);
  const [progress, setProgress] = useState('');
  const fileRef = useRef(null);
  const toast = useToast(); const confirm = useConfirm();
  const { data, loading, error, reload } = useAsync(() => admin.get('/media', { q: dq, page, limit: 24 }), [dq, page]);

  async function onFiles(e) {
    const files = [...(e.target.files || [])]; e.target.value = '';
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (f.size > 20 * 1024 * 1024) { toast.error(`${f.name} is larger than 20 MB`); continue; }
      setProgress(`Uploading ${i + 1} of ${files.length}: ${f.name}`);
      try { const r = await admin.upload('/media', f); if (r.meta?.reused) toast.success(`${f.name} already existed — reused`); }
      catch (err) { toast.error(`${f.name}: ${err.message}`); }
    }
    setProgress(''); reload();
  }
  async function remove(m) {
    if (!(await confirm({ title: 'Delete file?', message: `“${m.file_name}” will be permanently deleted. Files used by a project can’t be deleted.`, danger: true, confirmLabel: 'Delete' }))) return;
    try { await admin.del(`/media/${m.id}`); toast.success('Deleted'); reload(); } catch (err) { toast.error(err.message); }
  }
  async function saveMeta(e) {
    e.preventDefault();
    try { await admin.patch(`/media/${edit.id}`, { alt_text: edit.alt_text || null, caption: edit.caption || null }); toast.success('Saved'); setEdit(null); reload(); } catch (err) { toast.error(err.message); }
  }
  return (
    <>
      <div className="row between wrap gap"><h1>Media library</h1>
        <button className="btn primary" disabled={!!progress} onClick={() => fileRef.current.click()}>Upload files</button>
        <input ref={fileRef} type="file" multiple hidden onChange={onFiles} accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,application/pdf" /></div>
      <p className="muted">Images, MP4/WebM video and PDF · max 20 MB each. Identical files are stored once and reused.</p>
      {progress && <p role="status" className="muted">{progress}</p>}
      <input className="input fit" type="search" placeholder="Search files, alt text, captions…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
      {loading ? <Spinner /> : error ? <ErrorState error={error} onRetry={reload} /> : data.data.length === 0 ? <Empty title="No files" hint="Upload artwork to get started." /> : (
        <div className="media-grid big">{data.data.map((m) => (
          <div className="media-tile static" key={m.id}>
            {m.mime_type?.startsWith('image/') ? <img src={m.url} alt={m.alt_text || m.file_name} loading="lazy" /> : <span className="file-ico">{m.mime_type?.split('/')[1]}</span>}
            <small>{m.file_name}<br />{fmtSize(m.size_bytes || 0)}{!m.alt_text && m.mime_type?.startsWith('image/') && <span className="field-err"> · no alt</span>}</small>
            <div className="row gap"><button className="btn sm" onClick={() => setEdit(m)}>Details</button><button className="btn sm" onClick={() => navigator.clipboard.writeText(m.url).then(() => toast.success('URL copied'))}>Copy URL</button><button className="btn sm danger" onClick={() => remove(m)}>Delete</button></div>
          </div>))}</div>)}
      <Pager meta={data?.meta} onPage={setPage} />
      {edit && <Modal title={edit.file_name} onClose={() => setEdit(null)}><form className="form" onSubmit={saveMeta}>
        <Field label="Alt text"><input className="input" value={edit.alt_text || ''} onChange={(e) => setEdit({ ...edit, alt_text: e.target.value })} /></Field>
        <Field label="Caption"><input className="input" value={edit.caption || ''} onChange={(e) => setEdit({ ...edit, caption: e.target.value })} /></Field>
        <div className="row end gap"><button type="button" className="btn ghost" onClick={() => setEdit(null)}>Cancel</button><button className="btn primary">Save</button></div></form></Modal>}
    </>
  );
}
