import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { admin, slugify } from '../../lib/api.js';
import { useApi, useAsync, useTitle } from '../../lib/useAsync.js';
import { ErrorState, Field, Modal, Spinner, StatusBadge, useConfirm, useToast, useUnsavedWarning } from '../../components/ui.jsx';
import { Inspector, KINDS, filesToImageBlocks, kindOf, newBlock } from '../../components/BlockEditor.jsx';
import EditorCanvas from '../../components/EditorCanvas.jsx';
import CoverCrop from '../../components/CoverCrop.jsx';
import Showcase from '../../components/Showcase.jsx';
import { defaultSettings, settingsBlock, splitBlocks } from '../../lib/showcase.js';

const blank = { title: '', slug: '', category_id: '', description: '', year: new Date().getFullYear(), role: 'Graphic designer', tools: '', tags: '',
  challenge: '', concept: '', audience: '', cover_media_id: null, cover_url: null, cover_alt: '', cover_focal_x: 50, cover_focal_y: 50,
  video_preview_url: '', featured: false, status: 'draft', blocks: [], settings: defaultSettings };
const list = (s) => String(s || '').split(',').map((x) => x.trim()).filter(Boolean);
const ADD = ['image', 'rich_text', 'gallery', 'video', 'embed'];
const MORE = ['before_after', 'two_columns', 'pdf', 'palette', 'divider', 'spacer'];

function StylesModal({ s, set, onClose }) {
  return (
    <Modal title="Project styles" onClose={onClose}>
      <Field label="Background colour"><div className="row gap center">
        <input type="color" aria-label="Background colour" value={s.bg} onChange={(e) => set({ bg: e.target.value })} />
        <input className="input" style={{ maxWidth: 130 }} value={s.bg} onChange={(e) => /^#[0-9a-f]{0,6}$/i.test(e.target.value) && set({ bg: e.target.value })} aria-label="Hex colour" />
        {['#ffffff', '#f5f3ee', '#111111', '#1c2438'].map((c) => <button key={c} type="button" className="swatch" style={{ background: c }} aria-label={`Use ${c}`} onClick={() => set({ bg: c })} />)}</div></Field>
      <Field label={`Content spacing (${s.spacing}px)`} hint="Space between modules. Behance’s default is 2px."><input type="range" min="0" max="80" value={s.spacing} onChange={(e) => set({ spacing: Number(e.target.value) })} /></Field>
      <label className="check"><input type="checkbox" checked={s.showCover} onChange={(e) => set({ showCover: e.target.checked })} /> Also show the cover at the top of the project</label>
      <div className="row end"><button type="button" className="btn primary" onClick={onClose}>Done</button></div>
    </Modal>
  );
}

function ButtonModal({ s, set, onClose }) {
  return (
    <Modal title="Custom button" onClose={onClose}>
      <p className="muted small">Shows next to “Hire me” on the project. Leave empty to hide it.</p>
      <Field label="Button label"><input className="input" maxLength="40" value={s.button.label} onChange={(e) => set({ button: { ...s.button, label: e.target.value } })} placeholder="View live site" /></Field>
      <Field label="Link"><input className="input" value={s.button.url} onChange={(e) => set({ button: { ...s.button, url: e.target.value } })} placeholder="https://…" /></Field>
      <div className="row end"><button type="button" className="btn primary" onClick={onClose}>Done</button></div>
    </Modal>
  );
}

export default function ProjectEditor() {
  const { id } = useParams();
  const isNew = id === 'new';
  const nav = useNavigate(); const toast = useToast(); const confirm = useConfirm();
  const [form, setForm] = useState(blank);
  const [dirty, setDirty] = useState(false);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState(isNew ? 'settings' : null);
  const [preview, setPreview] = useState(false);
  const [crop, setCrop] = useState(false);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const files = useRef(null); const fileMode = useRef('image');
  useUnsavedWarning(dirty);

  const cats = useApi('/categories', undefined, { admin: true });
  const site = useApi('/settings').data?.data;
  const loaded = useAsync(() => (isNew ? Promise.resolve(null) : admin.get(`/projects/${id}`)), [id]);
  useTitle(isNew ? 'New project' : form.title || 'Project');

  useEffect(() => {
    const p = loaded.data?.data;
    if (!p) { if (isNew) { setForm(blank); setDirty(false); } return; }
    const { settings, modules } = splitBlocks(p.blocks);
    setForm({ ...blank, ...p, category_id: p.category_id || '', tools: (p.tools || []).join(', '), tags: (p.tags || []).join(', '),
      description: p.description || '', challenge: p.challenge || '', concept: p.concept || '', audience: p.audience || '',
      cover_alt: p.cover_alt || '', role: p.role || '', video_preview_url: p.video_preview_url || '',
      settings, blocks: modules.map((b) => ({ _k: b.id, type: b.type, content: b.content })) });
    setSlugTouched(true); setDirty(false);
  }, [loaded.data, isNew]);

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setDirty(true); };
  const setS = (patch) => { setForm((f) => ({ ...f, settings: { ...f.settings, ...patch } })); setDirty(true); };
  const setBlocks = (blocks) => set('blocks', blocks);
  const onTitle = (v) => { setForm((f) => ({ ...f, title: v, slug: slugTouched ? f.slug : slugify(v) })); setDirty(true); };
  const sel = form.blocks.find((b) => b._k === selected);

  const payload = () => ({
    title: form.title.trim(), slug: form.slug.trim(), category_id: form.category_id || null, description: form.description || null,
    year: form.year ? Number(form.year) : null, role: form.role || null, tools: list(form.tools), tags: list(form.tags).slice(0, 10),
    challenge: form.challenge || null, concept: form.concept || null, audience: form.audience || null,
    cover_media_id: form.cover_media_id || null, cover_alt: form.cover_alt || null,
    cover_focal_x: Number(form.cover_focal_x), cover_focal_y: Number(form.cover_focal_y),
    video_preview_url: form.video_preview_url || null, featured: !!form.featured,
  });

  function validate(forPublish) {
    const e = {};
    if (!form.title.trim()) e.title = 'Title is required';
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug)) e.slug = 'Use lowercase letters, numbers and hyphens';
    if (form.cover_media_id && !form.cover_alt.trim()) e.cover_alt = 'Describe the cover image';
    if (forPublish && !form.cover_media_id) e.cover = 'A cover is required to publish';
    if (list(form.tags).length > 10) e.tags = 'At most 10 tags';
    setErrors(e);
    if (Object.keys(e).length) { setModal('settings'); toast.error(Object.values(e)[0]); return false; }
    return true;
  }

  async function save(then, forPublish = false) {
    if (!validate(forPublish)) return false;
    setSaving(true);
    try {
      let pid = id;
      if (isNew) pid = (await admin.post('/projects', payload())).data.id;
      else await admin.patch(`/projects/${id}`, payload());
      await admin.put(`/projects/${pid}/blocks`, { blocks: [settingsBlock(form.settings), ...form.blocks].map((b, i) => ({ type: b.type, content: b.content, position: i })) });
      setDirty(false); toast.success('Saved');
      if (isNew) nav(`/admin/projects/${pid}`, { replace: true }); else loaded.reload();
      if (then) await then(pid);
      return true;
    } catch (err) { setErrors(err.details || {}); toast.error(err.message); return false; } finally { setSaving(false); }
  }
  async function togglePublish() {
    const publish = form.status !== 'published';
    await save(async (pid) => { await admin.post(`/projects/${pid}/publish`, { publish }); toast.success(publish ? 'Published' : 'Unpublished'); if (!isNew) loaded.reload(); }, publish);
  }
  async function archive() {
    if (!(await confirm({ title: 'Archive project?', message: 'It will disappear from the public site. Media files are kept.', danger: true, confirmLabel: 'Archive' }))) return;
    try { await admin.post(`/projects/${id}/archive`); toast.success('Archived'); setDirty(false); nav('/admin/projects'); } catch (e) { toast.error(e.message); }
  }
  async function back() {
    if (dirty && !(await confirm({ title: 'Leave without saving?', message: 'Your latest changes have not been saved.', danger: true, confirmLabel: 'Leave' }))) return;
    setDirty(false); nav('/admin/projects');
  }

  // insert after the selected module, or at the end
  const insert = (items) => {
    const at = sel ? form.blocks.indexOf(sel) + 1 : form.blocks.length;
    const n = [...form.blocks]; n.splice(at, 0, ...items); setBlocks(n); setSelected(items[items.length - 1]._k);
  };
  const add = (kind) => {
    if (kind === 'image' || kind === 'gallery') { fileMode.current = kind; files.current.click(); return; }
    insert([newBlock(kind)]);
  };
  async function onFiles(fl) {
    const imgs = await filesToImageBlocks(fl, toast, setBusy);
    if (!imgs.length) return;
    if (fileMode.current === 'gallery') { const b = newBlock('gallery'); b.content.images = imgs; b.content.perRow = Math.min(imgs.length, 4); insert([b]); }
    else insert(imgs.map((im) => ({ ...newBlock('image'), content: { ...im, caption: '' } })));
  }

  const previewData = useMemo(() => ({
    ...form, tools: list(form.tools), tags: list(form.tags), categories: cats.data?.data.find((c) => c.id === form.category_id),
    blocks: [settingsBlock(form.settings), ...form.blocks].map((b, i) => ({ id: b._k || 's', type: b.type, content: b.content, position: i })),
  }), [form, cats.data]);
  const candidates = useMemo(() => {
    const u = []; form.blocks.forEach((b) => { if (b.content?.url && ['image', 'full_image'].includes(b.type)) u.push(b.content.url); (b.content?.images || []).forEach((i) => i.url && u.push(i.url)); });
    if (form.cover_url) u.unshift(form.cover_url);
    return [...new Set(u)].slice(0, 12);
  }, [form.blocks, form.cover_url]);

  if (loaded.loading && !loaded.data) return <Spinner />;
  if (loaded.error) return <ErrorState error={loaded.error} onRetry={loaded.reload} />;

  return (
    <div className="ed">
      <div className="ed-top">
        <button type="button" className="ed-back" onClick={back} aria-label="Back to projects">←</button>
        <button type="button" className="ed-title" onClick={() => setModal('settings')} title="Project settings">{form.title || 'Untitled project'}</button>
        {!isNew && <StatusBadge value={form.status} />}{dirty && <span className="muted small">Unsaved changes</span>}
        <span className="ed-gap" />
        <button type="button" className="btn ghost" onClick={() => setPreview(true)}>Preview</button>
        <button type="button" className="btn" disabled={saving} onClick={() => save()}>{saving ? 'Saving…' : form.status === 'published' ? 'Save changes' : 'Save draft'}</button>
        <button type="button" className="btn ed-pub" disabled={saving} onClick={togglePublish}>{form.status === 'published' ? 'Unpublish' : 'Publish'}</button>
      </div>

      <div className="ed-body">
        <div className="ed-stage">
          <EditorCanvas blocks={form.blocks} settings={form.settings} cover={form.cover_url} selected={selected} onSelect={setSelected} onChange={setBlocks}
            onDropFiles={(fl) => { fileMode.current = 'image'; onFiles(fl); }} busy={busy} />
        </div>

        <aside className="ed-side">
          {sel ? (
            <div className="ed-card">
              <div className="row between center"><h2>{KINDS[kindOf(sel)]?.label || 'Module'}</h2><button type="button" className="btn ghost sm" onClick={() => setSelected(null)}>Done</button></div>
              <Inspector block={sel} onChange={(b) => setBlocks(form.blocks.map((x) => (x._k === b._k ? b : x)))} />
            </div>
          ) : (<>
            <div className="ed-card"><h2>Add content</h2>
              <div className="ed-tiles">{ADD.map((k) => <button type="button" key={k} onClick={() => add(k)}><span aria-hidden="true">{KINDS[k].icon}</span>{KINDS[k].label}</button>)}</div>
              <details><summary>More modules</summary><div className="ed-tiles">{MORE.map((k) => <button type="button" key={k} onClick={() => add(k)}><span aria-hidden="true">{KINDS[k].icon}</span>{KINDS[k].label}</button>)}</div></details>
              {busy && <p className="muted small">{busy}</p>}
            </div>
            <div className="ed-card"><h2>Edit project</h2>
              <div className="ed-tiles two"><button type="button" onClick={() => setModal('styles')}><span aria-hidden="true">🖌</span>Styles</button><button type="button" onClick={() => setModal('settings')}><span aria-hidden="true">⚙</span>Settings</button></div>
              <button type="button" className="btn" onClick={() => setModal('button')}>Custom button{form.settings.button.label ? `: ${form.settings.button.label}` : ''}</button>
              <p className="muted small">Tip: click a module on the canvas to edit it. Drop image files onto the canvas to add them.</p>
            </div>
            {!isNew && <button type="button" className="btn danger" onClick={archive}>Archive project</button>}
          </>)}
        </aside>
      </div>
      <input ref={files} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple hidden onChange={(e) => { onFiles(e.target.files); e.target.value = ''; }} />

      {modal === 'styles' && <StylesModal s={form.settings} set={setS} onClose={() => setModal(null)} />}
      {modal === 'button' && <ButtonModal s={form.settings} set={setS} onClose={() => setModal(null)} />}
      {modal === 'settings' && (
        <Modal title="Project settings" onClose={() => setModal(null)} wide>
          <div className="grid2">
            <div className="stack">
              <span className="field-label">Project cover (required to publish)</span>
              <div className="cc-card">
                <div className="cc-frame">{form.cover_url ? <img src={form.cover_url} alt="" style={{ width: '100%', height: '100%', left: 0, top: 0 }} /> : <span className="muted">No cover yet</span>}</div>
                <div className="cc-meta"><strong>{form.title || 'Untitled project'}</strong><span>{site?.site_title || 'Talha Creative Studio'}</span></div>
              </div>
              {errors.cover && <p className="warn">{errors.cover}</p>}
              <button type="button" className="btn" onClick={() => setCrop(true)}>{form.cover_media_id ? 'Edit cover image' : 'Choose cover image'}</button>
              <Field label="Cover alt text *" error={errors.cover_alt}><input className="input" value={form.cover_alt} onChange={(e) => set('cover_alt', e.target.value)} /></Field>
            </div>
            <div className="stack">
              <Field label="Title *" error={errors.title}><input className="input" value={form.title} onChange={(e) => onTitle(e.target.value)} /></Field>
              <Field label="Slug *" error={errors.slug} hint="Public URL: /work/slug"><input className="input" value={form.slug} onChange={(e) => { setSlugTouched(true); set('slug', e.target.value); }} /></Field>
              <Field label={`Tags (${list(form.tags).length}/10, comma separated)`} error={errors.tags}><input className="input" value={form.tags} onChange={(e) => set('tags', e.target.value)} /></Field>
              <Field label="Category"><select className="input" value={form.category_id} onChange={(e) => set('category_id', e.target.value)}><option value="">Uncategorised</option>{cats.data?.data.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
            </div>
          </div>
          <div className="grid3">
            <Field label="Year"><input className="input" type="number" min="1990" max="2100" value={form.year || ''} onChange={(e) => set('year', e.target.value)} /></Field>
            <Field label="Role"><input className="input" value={form.role} onChange={(e) => set('role', e.target.value)} /></Field>
            <Field label="Tools (comma separated)"><input className="input" value={form.tools} onChange={(e) => set('tools', e.target.value)} placeholder="Illustrator, Photoshop" /></Field>
          </div>
          <Field label="Description"><textarea className="input" rows="3" value={form.description} onChange={(e) => set('description', e.target.value)} /></Field>
          <div className="grid3">
            <Field label="Challenge"><textarea className="input" rows="3" value={form.challenge} onChange={(e) => set('challenge', e.target.value)} /></Field>
            <Field label="Concept"><textarea className="input" rows="3" value={form.concept} onChange={(e) => set('concept', e.target.value)} /></Field>
            <Field label="Target audience"><textarea className="input" rows="3" value={form.audience} onChange={(e) => set('audience', e.target.value)} /></Field>
          </div>
          <label className="check"><input type="checkbox" checked={form.featured} onChange={(e) => set('featured', e.target.checked)} /> Featured project</label>
          <div className="row end"><button type="button" className="btn primary" onClick={() => setModal(null)}>Done</button></div>
        </Modal>
      )}
      {crop && <CoverCrop initial={form.cover_url} candidates={candidates} title={form.title} owner={site?.site_title || 'Talha Creative Studio'} onClose={() => setCrop(false)}
        onDone={(m) => { setForm((f) => ({ ...f, cover_media_id: m.id, cover_url: m.url, cover_alt: f.cover_alt || m.alt_text || '', cover_focal_x: 50, cover_focal_y: 50 })); setDirty(true); setCrop(false); }} />}

      {preview && (
        <div className="ed-preview">
          <div className="ed-top"><button type="button" className="ed-back" onClick={() => setPreview(false)} aria-label="Back to editor">←</button><strong>Preview</strong><span className="muted small">This is how visitors will see it</span></div>
          <div className="ed-pv-body"><Showcase project={previewData} variant="preview" /></div>
        </div>
      )}
    </div>
  );
}
