import { useState } from 'react';
import { admin, money, slugify } from '../../lib/api.js';
import { useAsync, useTitle } from '../../lib/useAsync.js';
import { Empty, ErrorState, Field, Modal, Spinner, StatusBadge, useConfirm, useToast, useUnsavedWarning } from '../../components/ui.jsx';
import { MediaField } from '../../components/MediaPicker.jsx';

const blank = { name: '', slug: '', summary: '', price_type: 'fixed', price: '', currency: 'USD', deliverables: '', revisions: 2, turnaround_days: '',
  addons: [], faqs: [], terms: '', cover_media_id: null, cover_url: null, featured: false, position: 0 };

function PackageForm({ pkg, onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState(pkg ? { ...blank, ...pkg, price: pkg.price ?? '', turnaround_days: pkg.turnaround_days ?? '', summary: pkg.summary || '', terms: pkg.terms || '', deliverables: pkg.deliverables.join('\n') } : blank);
  const [slugTouched, setSlugTouched] = useState(!!pkg);
  const [dirty, setDirty] = useState(false);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  useUnsavedWarning(dirty);
  const set = (k, v) => { setF((x) => ({ ...x, [k]: v })); setDirty(true); };
  const close = () => { if (!dirty || window.confirm('Discard unsaved changes?')) onClose(); };

  async function save(e) {
    e.preventDefault();
    const er = {};
    if (!f.name.trim()) er.name = 'Name is required';
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(f.slug)) er.slug = 'Lowercase letters, numbers, hyphens';
    if (f.price_type !== 'quote' && (f.price === '' || Number(f.price) < 0)) er.price = 'Enter a price';
    setErrors(er); if (Object.keys(er).length) return;
    const body = { name: f.name.trim(), slug: f.slug, summary: f.summary || null, price_type: f.price_type, price: f.price_type === 'quote' ? null : Number(f.price),
      currency: f.currency, deliverables: f.deliverables.split('\n').map((s) => s.trim()).filter(Boolean), revisions: Number(f.revisions),
      turnaround_days: f.turnaround_days === '' ? null : Number(f.turnaround_days),
      addons: f.addons.filter((a) => a.name.trim()).map((a) => ({ name: a.name.trim(), price: Number(a.price) || 0 })),
      faqs: f.faqs.filter((q) => q.q.trim() && q.a.trim()), terms: f.terms || null, cover_media_id: f.cover_media_id, featured: f.featured };
    setBusy(true);
    try { pkg ? await admin.patch(`/packages/${pkg.id}`, body) : await admin.post('/packages', body); toast.success('Package saved'); setDirty(false); onSaved(); }
    catch (err) { setErrors(err.details || {}); toast.error(err.message); } finally { setBusy(false); }
  }
  const arr = (k, i, patch) => set(k, f[k].map((x, n) => (n === i ? { ...x, ...patch } : x)));

  return (
    <Modal title={pkg ? 'Edit package' : 'New package'} onClose={close} wide>
      <form onSubmit={save} className="form">
        <div className="grid2">
          <Field label="Name *" error={errors.name}><input className="input" value={f.name} onChange={(e) => { set('name', e.target.value); if (!slugTouched) set('slug', slugify(e.target.value)); }} /></Field>
          <Field label="Slug *" error={errors.slug}><input className="input" value={f.slug} onChange={(e) => { setSlugTouched(true); set('slug', e.target.value); }} /></Field>
          <Field label="Pricing"><select className="input" value={f.price_type} onChange={(e) => set('price_type', e.target.value)}><option value="fixed">Fixed price</option><option value="starting">Starting price</option><option value="quote">Quote only</option></select></Field>
          <div className="grid2">
            <Field label="Price" error={errors.price}><input className="input" type="number" min="0" step="1" disabled={f.price_type === 'quote'} value={f.price} onChange={(e) => set('price', e.target.value)} /></Field>
            <Field label="Currency"><select className="input" value={f.currency} onChange={(e) => set('currency', e.target.value)}><option>USD</option><option>PKR</option></select></Field>
          </div>
          <Field label="Revisions included"><input className="input" type="number" min="0" value={f.revisions} onChange={(e) => set('revisions', e.target.value)} /></Field>
          <Field label="Turnaround (working days)"><input className="input" type="number" min="0" value={f.turnaround_days} onChange={(e) => set('turnaround_days', e.target.value)} /></Field>
        </div>
        <Field label="Summary"><input className="input" value={f.summary} onChange={(e) => set('summary', e.target.value)} /></Field>
        <Field label="Deliverables (one per line)"><textarea className="input" rows="4" value={f.deliverables} onChange={(e) => set('deliverables', e.target.value)} /></Field>

        <fieldset><legend>Add-ons</legend>
          {f.addons.map((a, i) => <div className="row gap" key={i}><input className="input" placeholder="Name" value={a.name} onChange={(e) => arr('addons', i, { name: e.target.value })} /><input className="input narrow" type="number" min="0" placeholder="Price" value={a.price} onChange={(e) => arr('addons', i, { price: e.target.value })} /><button type="button" className="btn sm danger" onClick={() => set('addons', f.addons.filter((_, n) => n !== i))}>✕</button></div>)}
          <button type="button" className="btn sm" onClick={() => set('addons', [...f.addons, { name: '', price: '' }])}>+ Add-on</button></fieldset>
        <fieldset><legend>FAQs</legend>
          {f.faqs.map((q, i) => <div className="sub-card" key={i}><input className="input" placeholder="Question" value={q.q} onChange={(e) => arr('faqs', i, { q: e.target.value })} /><textarea className="input" rows="2" placeholder="Answer" value={q.a} onChange={(e) => arr('faqs', i, { a: e.target.value })} /><button type="button" className="btn sm danger" onClick={() => set('faqs', f.faqs.filter((_, n) => n !== i))}>Remove</button></div>)}
          <button type="button" className="btn sm" onClick={() => set('faqs', [...f.faqs, { q: '', a: '' }])}>+ FAQ</button></fieldset>
        <Field label="Terms, scope and exclusions"><textarea className="input" rows="3" value={f.terms} onChange={(e) => set('terms', e.target.value)} /></Field>
        <MediaField value={f.cover_media_id} url={f.cover_url} onChange={(m) => { set('cover_media_id', m?.id || null); set('cover_url', m?.url || null); }} label="Choose cover" />
        <label className="check"><input type="checkbox" checked={f.featured} onChange={(e) => set('featured', e.target.checked)} /> Featured (shown first)</label>
        <div className="row end gap"><button type="button" className="btn ghost" onClick={close}>Cancel</button><button className="btn primary" disabled={busy}>{busy ? 'Saving…' : 'Save package'}</button></div>
      </form>
    </Modal>
  );
}

export default function Packages() {
  useTitle('Packages');
  const [edit, setEdit] = useState(null);
  const [status, setStatus] = useState('');
  const toast = useToast(); const confirm = useConfirm();
  const { data, loading, error, reload } = useAsync(() => admin.get('/packages', { status }), [status]);
  const act = async (fn, ok) => { try { await fn(); toast.success(ok); reload(); } catch (e) { toast.error(e.message); } };
  async function archive(p) {
    if (await confirm({ title: 'Archive package?', message: `“${p.name}” will be removed from the public site.`, danger: true, confirmLabel: 'Archive' })) act(() => admin.del(`/packages/${p.id}`), 'Archived');
  }
  return (
    <>
      <div className="row between wrap gap"><h1>Packages</h1><button className="btn primary" onClick={() => setEdit('new')}>New package</button></div>
      <select className="input fit" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status"><option value="">Active</option><option value="published">Published</option><option value="draft">Draft</option><option value="archived">Archived</option></select>
      {loading ? <Spinner /> : error ? <ErrorState error={error} onRetry={reload} /> : data.data.length === 0 ? <Empty title="No packages" action={<button className="btn primary" onClick={() => setEdit('new')}>Create one</button>} /> : (
        <div className="table-wrap"><table className="table"><thead><tr><th>Name</th><th>Price</th><th>Status</th><th /></tr></thead>
          <tbody>{data.data.map((p) => (
            <tr key={p.id}><td><strong>{p.name}</strong>{p.featured && <span className="badge b-published">featured</span>}<br /><small className="muted">{p.slug}</small></td>
              <td>{p.price_type === 'quote' ? 'Quote only' : `${p.price_type === 'starting' ? 'From ' : ''}${money(p.price, p.currency)}`}</td><td><StatusBadge value={p.status} /></td>
              <td className="row gap end">
                <button className="btn sm" onClick={() => setEdit(p)}>Edit</button>
                <button className="btn sm" onClick={() => act(() => admin.post(`/packages/${p.id}/publish`, { publish: p.status !== 'published' }), p.status === 'published' ? 'Unpublished' : 'Published')}>{p.status === 'published' ? 'Unpublish' : 'Publish'}</button>
                {p.status !== 'archived' && <button className="btn sm danger" onClick={() => archive(p)}>Archive</button>}</td></tr>))}</tbody></table></div>)}
      {edit && <PackageForm pkg={edit === 'new' ? null : edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload(); }} />}
    </>
  );
}
