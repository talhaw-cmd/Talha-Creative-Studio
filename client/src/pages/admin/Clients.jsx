import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { admin, fmtDate } from '../../lib/api.js';
import { useAsync, useDebounced, useTitle } from '../../lib/useAsync.js';
import { Empty, ErrorState, Field, Modal, Pager, Spinner, StatusBadge, useConfirm, useToast } from '../../components/ui.jsx';

function ClientForm({ client, onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState({ name: '', email: '', phone: '', company: '', notes: '', ...(client || {}) });
  const [errors, setErrors] = useState({}); const [busy, setBusy] = useState(false);
  async function save(e) {
    e.preventDefault();
    if (!f.name.trim()) return setErrors({ name: 'Name is required' });
    setBusy(true);
    try {
      const body = { name: f.name.trim(), email: f.email || null, phone: f.phone || null, company: f.company || null, notes: f.notes || null };
      const r = client ? await admin.patch(`/clients/${client.id}`, body) : await admin.post('/clients', body);
      toast.success('Client saved'); onSaved(r.data);
    } catch (err) { setErrors(err.details || {}); toast.error(err.message); } finally { setBusy(false); }
  }
  const s = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <Modal title={client ? 'Edit client' : 'New client'} onClose={onClose}>
      <form className="form" onSubmit={save}>
        <Field label="Name *" error={errors.name}><input className="input" value={f.name} onChange={s('name')} /></Field>
        <div className="grid2"><Field label="Email" error={errors.email}><input className="input" type="email" value={f.email || ''} onChange={s('email')} /></Field>
          <Field label="Phone"><input className="input" value={f.phone || ''} onChange={s('phone')} /></Field></div>
        <Field label="Company"><input className="input" value={f.company || ''} onChange={s('company')} /></Field>
        <Field label="Notes"><textarea className="input" rows="3" value={f.notes || ''} onChange={s('notes')} /></Field>
        <div className="row end gap"><button type="button" className="btn ghost" onClick={onClose}>Cancel</button><button className="btn primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button></div>
      </form>
    </Modal>
  );
}

export function ClientProjectForm({ clientId, onClose, onSaved }) {
  const toast = useToast();
  const pk = useAsync(() => admin.get('/packages'), []);
  const [f, setF] = useState({ title: '', deadline: '', priority: 'normal', package_id: '', requirements: '' });
  const [errors, setErrors] = useState({}); const [busy, setBusy] = useState(false);
  async function save(e) {
    e.preventDefault();
    if (!f.title.trim()) return setErrors({ title: 'Title is required' });
    setBusy(true);
    try { const r = await admin.post('/client-projects', { client_id: clientId, title: f.title.trim(), deadline: f.deadline || null, priority: f.priority, package_id: f.package_id || null, requirements: f.requirements || null }); toast.success('Project created'); onSaved(r.data); }
    catch (err) { setErrors(err.details || {}); toast.error(err.message); } finally { setBusy(false); }
  }
  const s = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <Modal title="New client project" onClose={onClose}>
      <form className="form" onSubmit={save}>
        <Field label="Title *" error={errors.title}><input className="input" value={f.title} onChange={s('title')} /></Field>
        <div className="grid2"><Field label="Deadline"><input className="input" type="date" value={f.deadline} onChange={s('deadline')} /></Field>
          <Field label="Priority"><select className="input" value={f.priority} onChange={s('priority')}>{['low', 'normal', 'high', 'urgent'].map((p) => <option key={p}>{p}</option>)}</select></Field></div>
        <Field label="Package"><select className="input" value={f.package_id} onChange={s('package_id')}><option value="">None</option>{pk.data?.data.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
        <Field label="Requirements"><textarea className="input" rows="3" value={f.requirements} onChange={s('requirements')} /></Field>
        <div className="row end gap"><button type="button" className="btn ghost" onClick={onClose}>Cancel</button><button className="btn primary" disabled={busy}>Create</button></div>
      </form>
    </Modal>
  );
}

export default function Clients() {
  useTitle('Clients');
  const [q, setQ] = useState(''); const [page, setPage] = useState(1); const [archived, setArchived] = useState(false);
  const dq = useDebounced(q);
  const [form, setForm] = useState(false);
  const nav = useNavigate();
  const { data, loading, error, reload } = useAsync(() => admin.get('/clients', { q: dq, page, limit: 15, archived: String(archived) }), [dq, page, archived]);
  return (
    <>
      <div className="row between wrap gap"><h1>Clients</h1><button className="btn primary" onClick={() => setForm(true)}>New client</button></div>
      <div className="row gap wrap"><input className="input" type="search" placeholder="Search name, company, email…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <label className="check"><input type="checkbox" checked={archived} onChange={(e) => { setArchived(e.target.checked); setPage(1); }} /> Show archived</label></div>
      {loading ? <Spinner /> : error ? <ErrorState error={error} onRetry={reload} /> : data.data.length === 0 ? <Empty title="No clients" action={<button className="btn primary" onClick={() => setForm(true)}>Add a client</button>} /> : (
        <div className="table-wrap"><table className="table"><thead><tr><th>Name</th><th>Company</th><th>Email</th><th>Projects</th><th>Added</th></tr></thead>
          <tbody>{data.data.map((c) => <tr key={c.id}><td><Link to={`/admin/clients/${c.id}`}><strong>{c.name}</strong></Link></td><td>{c.company || '—'}</td><td>{c.email || '—'}</td><td>{c.project_count}</td><td>{fmtDate(c.created_at)}</td></tr>)}</tbody></table></div>)}
      <Pager meta={data?.meta} onPage={setPage} />
      {form && <ClientForm onClose={() => setForm(false)} onSaved={(c) => nav(`/admin/clients/${c.id}`)} />}
    </>
  );
}

export function ClientDetail() {
  const { id } = useParams(); const nav = useNavigate();
  const toast = useToast(); const confirm = useConfirm();
  const [edit, setEdit] = useState(false); const [newP, setNewP] = useState(false);
  const { data, loading, error, reload } = useAsync(() => admin.get(`/clients/${id}`), [id]);
  useTitle(data?.data.name);
  if (loading) return <Spinner />; if (error) return <ErrorState error={error} onRetry={reload} />;
  const c = data.data;
  async function remove() {
    if (!(await confirm({ title: 'Remove client?', message: c.projects.length ? 'This client has projects, so they will be archived (history is kept).' : 'This client will be deleted.', danger: true, confirmLabel: 'Remove' }))) return;
    try { const r = await admin.del(`/clients/${id}`); toast.success(r.data.archived ? 'Client archived' : 'Client deleted'); nav('/admin/clients'); } catch (e) { toast.error(e.message); }
  }
  return (
    <>
      <div className="row between wrap gap"><div><Link to="/admin/clients" className="link">← Clients</Link><h1>{c.name}{c.archived && <StatusBadge value="archived" />}</h1></div>
        <div className="row gap"><button className="btn" onClick={() => setEdit(true)}>Edit</button><button className="btn danger" onClick={remove}>Remove</button></div></div>
      <section className="panel"><dl className="facts">
        {[['Company', c.company], ['Email', c.email], ['Phone', c.phone]].map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v || '—'}</dd></div>)}</dl>
        {c.notes && <p className="pre">{c.notes}</p>}</section>
      <div className="row between"><h2>Projects</h2><button className="btn primary" onClick={() => setNewP(true)}>New project</button></div>
      {c.projects.length === 0 ? <Empty title="No projects yet" /> : (
        <div className="table-wrap"><table className="table"><thead><tr><th>Project</th><th>Status</th><th>Priority</th><th>Deadline</th></tr></thead>
          <tbody>{c.projects.map((p) => <tr key={p.id}><td><Link to={`/admin/client-projects/${p.id}`}><strong>{p.title}</strong></Link></td><td><StatusBadge value={p.status} /></td><td>{p.priority}</td><td>{fmtDate(p.deadline)}</td></tr>)}</tbody></table></div>)}
      {edit && <ClientForm client={c} onClose={() => setEdit(false)} onSaved={() => { setEdit(false); reload(); }} />}
      {newP && <ClientProjectForm clientId={c.id} onClose={() => setNewP(false)} onSaved={(p) => nav(`/admin/client-projects/${p.id}`)} />}
    </>
  );
}
