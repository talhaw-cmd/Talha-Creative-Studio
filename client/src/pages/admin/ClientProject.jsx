import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { admin, fmtDate, fmtSize, money } from '../../lib/api.js';
import { useAsync, useTitle } from '../../lib/useAsync.js';
import { ErrorState, Field, Spinner, StatusBadge, useConfirm, useToast, useUnsavedWarning } from '../../components/ui.jsx';
import { InvoiceForm } from './Invoices.jsx';

const STATUSES = ['brief', 'in_progress', 'review', 'revisions', 'delivered', 'completed', 'cancelled'];
const KINDS = ['reference', 'contract', 'client_asset', 'source', 'final', 'invoice', 'other'];

export default function ClientProject() {
  const { id } = useParams(); const nav = useNavigate();
  const toast = useToast(); const confirm = useConfirm();
  const { data, loading, error, reload } = useAsync(() => admin.get(`/client-projects/${id}`), [id]);
  const [f, setF] = useState(null); const [dirty, setDirty] = useState(false); const [busy, setBusy] = useState(false);
  const [kind, setKind] = useState('reference'); const [desc, setDesc] = useState(''); const [uploading, setUploading] = useState(false);
  const [invForm, setInvForm] = useState(false); const [item, setItem] = useState('');
  const fileRef = useRef(null);
  useUnsavedWarning(dirty);
  useTitle(data?.data.title);

  useEffect(() => { if (data) { const p = data.data; setF({ ...p, deadline: p.deadline || '', scope: p.scope || '', dimensions: p.dimensions || '', audience: p.audience || '', references_notes: p.references_notes || '', brand_guidelines: p.brand_guidelines || '', requirements: p.requirements || '', internal_notes: p.internal_notes || '' }); setDirty(false); } }, [data]);
  if (loading || !f) return <Spinner />; if (error) return <ErrorState error={error} onRetry={reload} />;
  const p = data.data;
  const set = (k, v) => { setF((x) => ({ ...x, [k]: v })); setDirty(true); };
  const s = (k) => (e) => set(k, e.target.value);

  async function save(e) {
    e?.preventDefault();
    if (!f.title.trim()) return toast.error('Title is required');
    setBusy(true);
    try {
      await admin.patch(`/client-projects/${id}`, { title: f.title.trim(), scope: f.scope || null, dimensions: f.dimensions || null, audience: f.audience || null, references_notes: f.references_notes || null,
        brand_guidelines: f.brand_guidelines || null, requirements: f.requirements || null, internal_notes: f.internal_notes || null, deadline: f.deadline || null, priority: f.priority,
        status: f.status, revision_rounds: Number(f.revision_rounds) || 0, checklist: f.checklist });
      toast.success('Saved'); setDirty(false); reload();
    } catch (err) { toast.error(err.message); } finally { setBusy(false); }
  }
  async function upload(e) {
    const file = e.target.files?.[0]; e.target.value = ''; if (!file) return;
    if (file.size > 50 * 1024 * 1024) return toast.error('File is larger than 50 MB');
    setUploading(true);
    try { await admin.upload('/files', file, { client_project_id: id, kind, description: desc || undefined }); toast.success('File uploaded'); setDesc(''); reload(); }
    catch (err) { toast.error(err.message); } finally { setUploading(false); }
  }
  async function download(file) { try { const r = await admin.get(`/files/${file.id}/download`); window.open(r.data.url, '_blank', 'noopener'); } catch (err) { toast.error(err.message); } }
  async function removeFile(file) {
    if (!(await confirm({ message: `Delete “${file.file_name}” permanently?`, danger: true, confirmLabel: 'Delete' }))) return;
    try { await admin.del(`/files/${file.id}`); toast.success('Deleted'); reload(); } catch (err) { toast.error(err.message); }
  }
  async function remove() {
    if (!(await confirm({ title: 'Delete project?', message: 'The project and its files will be deleted. Projects with invoices can’t be deleted.', danger: true, confirmLabel: 'Delete' }))) return;
    try { await admin.del(`/client-projects/${id}`); toast.success('Deleted'); nav(`/admin/clients/${p.client_id}`); } catch (err) { toast.error(err.message); }
  }
  const done = f.checklist.filter((c) => c.done).length;

  return (
    <>
      <div className="row between wrap gap"><div><Link to={`/admin/clients/${p.client_id}`} className="link">← {p.clients?.name}</Link><h1>{f.title} <StatusBadge value={f.status} /></h1></div>
        <div className="row gap">{dirty && <span className="muted small">Unsaved changes</span>}<button className="btn primary" disabled={busy || !dirty} onClick={save}>{busy ? 'Saving…' : 'Save changes'}</button><button className="btn danger" onClick={remove}>Delete</button></div></div>

      <form className="panel" onSubmit={save}><h2>Brief &amp; requirements</h2>
        <div className="grid3">
          <Field label="Title"><input className="input" value={f.title} onChange={s('title')} /></Field>
          <Field label="Status"><select className="input" value={f.status} onChange={s('status')}>{STATUSES.map((x) => <option key={x} value={x}>{x.replace('_', ' ')}</option>)}</select></Field>
          <Field label="Priority"><select className="input" value={f.priority} onChange={s('priority')}>{['low', 'normal', 'high', 'urgent'].map((x) => <option key={x}>{x}</option>)}</select></Field>
          <Field label="Deadline"><input className="input" type="date" value={f.deadline} onChange={s('deadline')} /></Field>
          <Field label="Revision rounds used"><input className="input" type="number" min="0" value={f.revision_rounds} onChange={s('revision_rounds')} /></Field>
          <Field label="Dimensions"><input className="input" value={f.dimensions} onChange={s('dimensions')} placeholder="e.g. 200 × 300 mm" /></Field>
        </div>
        <div className="grid2">
          <Field label="Scope"><textarea className="input" rows="3" value={f.scope} onChange={s('scope')} /></Field>
          <Field label="Target audience"><textarea className="input" rows="3" value={f.audience} onChange={s('audience')} /></Field>
          <Field label="Requirements"><textarea className="input" rows="4" value={f.requirements} onChange={s('requirements')} /></Field>
          <Field label="References"><textarea className="input" rows="4" value={f.references_notes} onChange={s('references_notes')} /></Field>
          <Field label="Brand guidelines"><textarea className="input" rows="3" value={f.brand_guidelines} onChange={s('brand_guidelines')} /></Field>
          <Field label="Internal notes (private)"><textarea className="input" rows="3" value={f.internal_notes} onChange={s('internal_notes')} /></Field>
        </div>
      </form>

      <section className="panel"><h2>Delivery checklist <small className="muted">{done}/{f.checklist.length}</small></h2>
        {f.checklist.map((c, i) => (
          <div className="row gap center" key={i}>
            <label className="check grow"><input type="checkbox" checked={c.done} onChange={(e) => set('checklist', f.checklist.map((x, n) => (n === i ? { ...x, done: e.target.checked } : x)))} /> <span className={c.done ? 'done' : ''}>{c.label}</span></label>
            <button type="button" className="btn ghost sm" onClick={() => set('checklist', f.checklist.filter((_, n) => n !== i))} aria-label="Remove item">✕</button></div>))}
        <form className="row gap" onSubmit={(e) => { e.preventDefault(); if (item.trim()) { set('checklist', [...f.checklist, { label: item.trim(), done: false }]); setItem(''); } }}>
          <input className="input" placeholder="Add checklist item" value={item} onChange={(e) => setItem(e.target.value)} /><button className="btn">Add</button></form>
      </section>

      <section className="panel"><h2>Private files</h2>
        <div className="row gap wrap"><select className="input fit" value={kind} onChange={(e) => setKind(e.target.value)} aria-label="File type">{KINDS.map((k) => <option key={k} value={k}>{k.replace('_', ' ')}</option>)}</select>
          <input className="input" placeholder="Description (optional)" value={desc} onChange={(e) => setDesc(e.target.value)} />
          <button className="btn primary" disabled={uploading} onClick={() => fileRef.current.click()}>{uploading ? 'Uploading…' : 'Upload file'}</button>
          <input ref={fileRef} type="file" hidden onChange={upload} /></div>
        <p className="muted small">Stored privately · max 50 MB · downloads use a 60-second secure link.</p>
        {p.files.length === 0 ? <p className="muted">No files yet.</p> : (
          <table className="table"><thead><tr><th>File</th><th>Type</th><th>Size</th><th>Uploaded</th><th /></tr></thead>
            <tbody>{p.files.map((x) => <tr key={x.id}><td><strong>{x.file_name}</strong>{x.description && <><br /><small className="muted">{x.description}</small></>}</td><td>{x.kind.replace('_', ' ')}</td><td>{fmtSize(x.size_bytes || 0)}</td><td>{fmtDate(x.created_at)}</td>
              <td className="row gap end"><button className="btn sm" onClick={() => download(x)}>Download</button><button className="btn sm danger" onClick={() => removeFile(x)}>Delete</button></td></tr>)}</tbody></table>)}
      </section>

      <section className="panel"><div className="row between"><h2>Invoices</h2><button className="btn primary" onClick={() => setInvForm(true)}>New invoice</button></div>
        {p.invoices.length === 0 ? <p className="muted">No invoices yet.</p> : (
          <table className="table"><thead><tr><th>Number</th><th>Amount</th><th>Outstanding</th><th>Due</th><th>Status</th></tr></thead>
            <tbody>{p.invoices.map((i) => <tr key={i.id}><td><Link to={`/admin/invoices/${i.id}`}><strong>{i.invoice_number}</strong></Link></td><td>{money(i.amount, i.currency)}</td><td>{money(i.outstanding, i.currency)}</td><td>{fmtDate(i.due_date)}</td><td><StatusBadge value={i.status} /></td></tr>)}</tbody></table>)}
      </section>
      {invForm && <InvoiceForm clientProjectId={id} onClose={() => setInvForm(false)} onSaved={(i) => nav(`/admin/invoices/${i.id}`)} />}
    </>
  );
}
