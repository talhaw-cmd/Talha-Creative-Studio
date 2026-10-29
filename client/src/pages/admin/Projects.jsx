import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { admin, fmtDate, slugify } from '../../lib/api.js';
import { useApi, useDebounced, useTitle } from '../../lib/useAsync.js';
import { Empty, ErrorState, Field, Modal, Pager, Spinner, StatusBadge, useConfirm, useToast } from '../../components/ui.jsx';

function Categories({ onClose }) {
  const toast = useToast(); const confirm = useConfirm();
  const { data, loading, error, reload } = useApi('/categories', undefined, { admin: true });
  const [name, setName] = useState('');
  async function add(e) {
    e.preventDefault(); if (!name.trim()) return;
    try { await admin.post('/categories', { name: name.trim(), slug: slugify(name), position: (data?.data.length || 0) + 1 }); setName(''); reload(); }
    catch (err) { toast.error(err.message); }
  }
  async function rename(c) {
    const n = window.prompt('Category name', c.name); if (!n?.trim() || n === c.name) return;
    try { await admin.patch(`/categories/${c.id}`, { name: n.trim(), slug: slugify(n) }); reload(); } catch (err) { toast.error(err.message); }
  }
  async function remove(c) {
    if (!(await confirm({ message: `Delete “${c.name}”? Projects in it become uncategorised.`, danger: true, confirmLabel: 'Delete' }))) return;
    try { await admin.del(`/categories/${c.id}`); reload(); } catch (err) { toast.error(err.message); }
  }
  return (
    <Modal title="Categories" onClose={onClose}>
      {loading ? <Spinner /> : error ? <ErrorState error={error} onRetry={reload} /> : (
        <ul className="list">{data.data.map((c) => <li key={c.id}><span>{c.name}</span><span className="row gap"><button className="btn sm" onClick={() => rename(c)}>Rename</button><button className="btn sm danger" onClick={() => remove(c)}>Delete</button></span></li>)}</ul>)}
      <form className="row gap" onSubmit={add}><input className="input" placeholder="New category" value={name} onChange={(e) => setName(e.target.value)} /><button className="btn primary">Add</button></form>
    </Modal>
  );
}

export default function Projects() {
  useTitle('Projects');
  const [params, setParams] = useSearchParams();
  const status = params.get('status') || '';
  const page = Number(params.get('page') || 1);
  const [q, setQ] = useState('');
  const dq = useDebounced(q);
  const [cats, setCats] = useState(false);
  const nav = useNavigate(); const toast = useToast(); const confirm = useConfirm();
  const { data, loading, error, reload } = useApi('/projects', { status, q: dq, page, limit: 15 }, { admin: true });
  const set = (k, v) => { const n = new URLSearchParams(params); v ? n.set(k, v) : n.delete(k); if (k !== 'page') n.delete('page'); setParams(n, { replace: true }); };

  const act = (fn, ok) => async () => { try { await fn(); toast.success(ok); reload(); } catch (e) { toast.error(e.message); } };
  async function duplicate(p) { try { const r = await admin.post(`/projects/${p.id}/duplicate`); toast.success('Duplicated as draft'); nav(`/admin/projects/${r.data.id}`); } catch (e) { toast.error(e.message); } }
  async function archive(p) {
    if (!(await confirm({ title: 'Archive project?', message: `“${p.title}” will be hidden from the public site. Its media files are kept.`, danger: true, confirmLabel: 'Archive' }))) return;
    act(() => admin.post(`/projects/${p.id}/archive`), 'Archived')();
  }

  return (
    <>
      <div className="row between wrap gap"><h1>Projects</h1><div className="row gap"><button className="btn" onClick={() => setCats(true)}>Categories</button><Link className="btn primary" to="/admin/projects/new">New project</Link></div></div>
      <div className="row gap wrap">
        <input className="input" type="search" placeholder="Search title or slug…" value={q} onChange={(e) => { setQ(e.target.value); set('page', ''); }} />
        <select className="input" value={status} onChange={(e) => set('status', e.target.value)} aria-label="Status filter">
          <option value="">Active (draft + published)</option><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option>
        </select>
      </div>
      {loading ? <Spinner /> : error ? <ErrorState error={error} onRetry={reload} /> : data.data.length === 0 ? <Empty title="No projects" hint="Create your first case study." action={<Link className="btn primary" to="/admin/projects/new">New project</Link>} /> : (
        <div className="table-wrap"><table className="table">
          <thead><tr><th>Title</th><th>Category</th><th>Status</th><th>Updated</th><th /></tr></thead>
          <tbody>{data.data.map((p) => (
            <tr key={p.id}>
              <td><Link to={`/admin/projects/${p.id}`}><strong>{p.title}</strong></Link>{p.featured && <span className="badge b-published">featured</span>}<br /><small className="muted">/work/{p.slug}</small></td>
              <td>{p.categories?.name || '—'}</td><td><StatusBadge value={p.status} /></td><td>{fmtDate(p.updated_at)}</td>
              <td className="row gap end">
                <Link className="btn sm" to={`/admin/projects/${p.id}`}>Edit</Link>
                {p.status === 'published'
                  ? <button className="btn sm" onClick={act(() => admin.post(`/projects/${p.id}/publish`, { publish: false }), 'Unpublished')}>Unpublish</button>
                  : p.status === 'draft' ? <button className="btn sm primary" onClick={act(() => admin.post(`/projects/${p.id}/publish`, { publish: true }), 'Published')}>Publish</button>
                    : <button className="btn sm" onClick={act(() => admin.post(`/projects/${p.id}/publish`, { publish: false }), 'Restored to draft')}>Restore</button>}
                <button className="btn sm" onClick={() => duplicate(p)}>Duplicate</button>
                {p.status !== 'archived' && <button className="btn sm danger" onClick={() => archive(p)}>Archive</button>}
              </td>
            </tr>))}</tbody>
        </table></div>)}
      <Pager meta={data?.meta} onPage={(p) => set('page', String(p))} />
      {cats && <Categories onClose={() => setCats(false)} />}
    </>
  );
}
