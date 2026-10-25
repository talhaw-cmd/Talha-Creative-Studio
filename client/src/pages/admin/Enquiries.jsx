import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { admin, fmtDate } from '../../lib/api.js';
import { useAsync, useDebounced, useTitle } from '../../lib/useAsync.js';
import { Empty, ErrorState, Pager, Spinner, StatusBadge, useConfirm, useToast } from '../../components/ui.jsx';

export default function Enquiries() {
  useTitle('Enquiries');
  const [status, setStatus] = useState(''); const [page, setPage] = useState(1); const [q, setQ] = useState(''); const dq = useDebounced(q);
  const [open, setOpen] = useState(null);
  const toast = useToast(); const confirm = useConfirm(); const nav = useNavigate();
  const { data, loading, error, reload } = useAsync(() => admin.get('/enquiries', { status, q: dq, page, limit: 15 }), [status, dq, page]);
  const act = async (fn, ok) => { try { const r = await fn(); toast.success(ok); reload(); return r; } catch (e) { toast.error(e.message); } };
  async function convert(e) {
    if (!(await confirm({ title: 'Convert to client project?', message: `Creates (or reuses) a client for ${e.email} and a new project from this brief.`, confirmLabel: 'Convert' }))) return;
    const r = await act(() => admin.post(`/enquiries/${e.id}/convert`), 'Converted');
    if (r) nav(`/admin/client-projects/${r.data.client_project_id}`);
  }
  async function remove(e) { if (await confirm({ message: 'Delete this enquiry permanently?', danger: true, confirmLabel: 'Delete' })) act(() => admin.del(`/enquiries/${e.id}`), 'Deleted'); }
  return (
    <>
      <h1>Enquiries</h1>
      <div className="row gap wrap"><input className="input" type="search" placeholder="Search…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <select className="input" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Status"><option value="">All</option>{['new', 'in_progress', 'converted', 'closed'].map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}</select></div>
      {loading ? <Spinner /> : error ? <ErrorState error={error} onRetry={reload} /> : data.data.length === 0 ? <Empty title="No enquiries" hint="Messages from the contact form appear here." /> : (
        <div className="stack">{data.data.map((e) => (
          <article className="panel" key={e.id}>
            <div className="row between wrap gap"><div><strong>{e.name}</strong> <StatusBadge value={e.status} /><br /><a href={`mailto:${e.email}`}>{e.email}</a>{e.company && <span className="muted"> · {e.company}</span>}</div><span className="muted">{fmtDate(e.created_at)}</span></div>
            <p className="muted small">{[e.service, e.budget && `Budget: ${e.budget}`, e.deadline && `Deadline: ${e.deadline}`].filter(Boolean).join(' · ')}</p>
            <p className={open === e.id ? 'pre' : 'pre clamp'}>{e.brief}</p>
            <div className="row gap wrap"><button className="btn sm ghost" onClick={() => setOpen(open === e.id ? null : e.id)}>{open === e.id ? 'Show less' : 'Read all'}</button>
              <select className="input fit" value={e.status} onChange={(ev) => act(() => admin.patch(`/enquiries/${e.id}`, { status: ev.target.value }), 'Status updated')} aria-label="Change status">{['new', 'in_progress', 'converted', 'closed'].map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}</select>
              {e.client_project_id ? <Link className="btn sm" to={`/admin/client-projects/${e.client_project_id}`}>Open project</Link> : <button className="btn sm primary" onClick={() => convert(e)}>Convert to project</button>}
              <button className="btn sm danger" onClick={() => remove(e)}>Delete</button></div>
          </article>))}</div>)}
      <Pager meta={data?.meta} onPage={setPage} />
    </>
  );
}
