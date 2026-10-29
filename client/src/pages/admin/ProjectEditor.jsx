import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { admin, slugify } from '../../lib/api.js';
import { useAsync, useTitle } from '../../lib/useAsync.js';
import { ErrorState, Field, Modal, Spinner, StatusBadge, useConfirm, useToast, useUnsavedWarning } from '../../components/ui.jsx';
import { MediaField } from '../../components/MediaPicker.jsx';
import BlockEditor from '../../components/BlockEditor.jsx';
import CoverPicker from '../../components/CoverPicker.jsx';
import Showcase from '../../components/Showcase.jsx';
import { defaultSettings, settingsBlock, splitBlocks } from '../../lib/showcase.js';

const blank = { title: '', slug: '', category_id: '', description: '', year: new Date().getFullYear(), role: 'Graphic designer', tools: '', tags: '',
  challenge: '', concept: '', audience: '', cover_media_id: null, cover_url: null, cover_alt: '', cover_focal_x: 50, cover_focal_y: 50,
  video_preview_url: '', featured: false, status: 'draft', blocks: [], settings: defaultSettings };
const list = (s) => String(s || '').split(',').map((x) => x.trim()).filter(Boolean);
const key = () => Math.random().toString(36).slice(2);

export default function ProjectEditor() {
  const { id } = useParams();
  const isNew = id === 'new';
  const nav = useNavigate(); const toast = useToast(); const confirm = useConfirm();
  const [form, setForm] = useState(blank);
  const [dirty, setDirty] = useState(false);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);
  useUnsavedWarning(dirty);

  const cats = useAsync(() => admin.get('/categories'), []);
  const loaded = useAsync(() => (isNew ? Promise.resolve(null) : admin.get(`/projects/${id}`)), [id]);
  useTitle(isNew ? 'New project' : form.title || 'Project');

  useEffect(() => {
    const p = loaded.data?.data;
    if (!p) { if (isNew) { setForm(blank); setDirty(false); } return; }
    setForm({ ...blank, ...p, category_id: p.category_id || '', tools: (p.tools || []).join(', '), tags: (p.tags || []).join(', '),
      description: p.description || '', challenge: p.challenge || '', concept: p.concept || '', audience: p.audience || '',
      cover_alt: p.cover_alt || '', role: p.role || '', video_preview_url: p.video_preview_url || '',
      settings: splitBlocks(p.blocks).settings,
      blocks: splitBlocks(p.blocks).modules.map((b) => ({ _k: b.id, type: b.type, content: b.content })) });
    setSlugTouched(true); setDirty(false);
  }, [loaded.data, isNew]);

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setDirty(true); };
  const onTitle = (v) => { setForm((f) => ({ ...f, title: v, slug: slugTouched ? f.slug : slugify(v) })); setDirty(true); };

  const payload = () => ({
    title: form.title.trim(), slug: form.slug.trim(), category_id: form.category_id || null, description: form.description || null,
    year: form.year ? Number(form.year) : null, role: form.role || null, tools: list(form.tools), tags: list(form.tags),
    challenge: form.challenge || null, concept: form.concept || null, audience: form.audience || null,
    cover_media_id: form.cover_media_id || null, cover_alt: form.cover_alt || null,
    cover_focal_x: Number(form.cover_focal_x), cover_focal_y: Number(form.cover_focal_y),
    video_preview_url: form.video_preview_url || null, featured: !!form.featured,
  });

  async function save(then) {
    const e = {};
    if (!form.title.trim()) e.title = 'Title is required';
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug)) e.slug = 'Use lowercase letters, numbers and hyphens';
    if (form.cover_media_id && !form.cover_alt.trim()) e.cover_alt = 'Describe the cover image';
    setErrors(e); if (Object.keys(e).length) { toast.error('Please fix the highlighted fields'); return false; }
    setSaving(true);
    try {
      let pid = id;
      if (isNew) pid = (await admin.post('/projects', payload())).data.id;
      else await admin.patch(`/projects/${id}`, payload());
      await admin.put(`/projects/${pid}/blocks`, { blocks: [settingsBlock(form.settings), ...form.blocks].map((b, i) => ({ type: b.type, content: b.content, position: i })) });
      setDirty(false); toast.success('Saved');
      if (isNew) { nav(`/admin/projects/${pid}`, { replace: true }); }
      else loaded.reload();
      if (then) await then(pid);
      return true;
    } catch (err) { setErrors(err.details || {}); toast.error(err.message); return false; } finally { setSaving(false); }
  }

  async function togglePublish() {
    const publish = form.status !== 'published';
    await save(async (pid) => {
      await admin.post(`/projects/${pid}/publish`, { publish });
      toast.success(publish ? 'Published' : 'Unpublished');
      if (!isNew) loaded.reload();
    });
  }
  async function archive() {
    if (!(await confirm({ title: 'Archive project?', message: 'It will disappear from the public site. Media files are kept.', danger: true, confirmLabel: 'Archive' }))) return;
    try { await admin.post(`/projects/${id}/archive`); toast.success('Archived'); setDirty(false); nav('/admin/projects'); } catch (e) { toast.error(e.message); }
  }
  async function copyLink() {
    try { await navigator.clipboard.writeText(`${window.location.origin}/work/${form.slug}`); toast.success('Link copied'); } catch { toast.error('Could not copy'); }
  }

  const previewData = useMemo(() => ({
    ...form, tools: list(form.tools), tags: list(form.tags), categories: cats.data?.data.find((c) => c.id === form.category_id),
    blocks: [settingsBlock(form.settings), ...form.blocks].map((b, i) => ({ id: b._k || 's', type: b.type, content: b.content, position: i })),
  }), [form, cats.data]);
  const setS = (patch) => { setForm((f) => ({ ...f, settings: { ...f.settings, ...patch } })); setDirty(true); };

  if (loaded.loading && !loaded.data) return <Spinner />;
  if (loaded.error) return <ErrorState error={loaded.error} onRetry={loaded.reload} />;

  return (
    <form onSubmit={(e) => { e.preventDefault(); save(); }} className="editor">
      <div className="row between wrap gap sticky-bar">
        <div className="row gap center"><h1>{isNew ? 'New project' : 'Edit project'}</h1>{!isNew && <StatusBadge value={form.status} />}{dirty && <span className="muted small">Unsaved changes</span>}</div>
        <div className="row gap wrap">
          <button type="button" className="btn" onClick={() => setPreview(true)}>Preview</button>
          {!isNew && form.status === 'published' && <button type="button" className="btn" onClick={copyLink}>Copy link</button>}
          <button className="btn" disabled={saving}>{saving ? 'Saving…' : form.status === 'published' ? 'Save changes' : 'Save draft'}</button>
          <button type="button" className="btn primary" disabled={saving} onClick={togglePublish}>{form.status === 'published' ? 'Unpublish' : 'Save & publish'}</button>
        </div>
      </div>

      <section className="panel"><h2>Project information</h2>
        <div className="grid2">
          <Field label="Title *" error={errors.title}><input className="input" value={form.title} onChange={(e) => onTitle(e.target.value)} /></Field>
          <Field label="Slug *" error={errors.slug} hint="Public URL: /work/slug"><input className="input" value={form.slug} onChange={(e) => { setSlugTouched(true); set('slug', e.target.value); }} /></Field>
          <Field label="Category"><select className="input" value={form.category_id} onChange={(e) => set('category_id', e.target.value)}><option value="">Uncategorised</option>{cats.data?.data.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
          <Field label="Year"><input className="input" type="number" min="1990" max="2100" value={form.year || ''} onChange={(e) => set('year', e.target.value)} /></Field>
          <Field label="Role"><input className="input" value={form.role} onChange={(e) => set('role', e.target.value)} /></Field>
          <Field label="Tools (comma separated)"><input className="input" value={form.tools} onChange={(e) => set('tools', e.target.value)} placeholder="Illustrator, Photoshop" /></Field>
          <Field label="Tags (comma separated)"><input className="input" value={form.tags} onChange={(e) => set('tags', e.target.value)} /></Field>
          <label className="check"><input type="checkbox" checked={form.featured} onChange={(e) => set('featured', e.target.checked)} /> Featured project</label>
        </div>
        <Field label="Description"><textarea className="input" rows="3" value={form.description} onChange={(e) => set('description', e.target.value)} /></Field>
        <div className="grid3">
          <Field label="Challenge"><textarea className="input" rows="4" value={form.challenge} onChange={(e) => set('challenge', e.target.value)} /></Field>
          <Field label="Concept"><textarea className="input" rows="4" value={form.concept} onChange={(e) => set('concept', e.target.value)} /></Field>
          <Field label="Target audience"><textarea className="input" rows="4" value={form.audience} onChange={(e) => set('audience', e.target.value)} /></Field>
        </div>
      </section>

      <section className="panel"><h2>Cover artwork</h2>
        <CoverPicker url={form.cover_url} hasImage={!!form.cover_media_id} fx={Number(form.cover_focal_x)} fy={Number(form.cover_focal_y)}
          onPick={(m) => { setForm((f) => ({ ...f, cover_media_id: m.id, cover_url: m.url, cover_alt: f.cover_alt || m.alt_text || '', cover_focal_x: 50, cover_focal_y: 50 })); setDirty(true); }}
          onRemove={() => { setForm((f) => ({ ...f, cover_media_id: null, cover_url: null, cover_alt: '' })); setDirty(true); }}
          onFocal={(x, y) => { setForm((f) => ({ ...f, cover_focal_x: x, cover_focal_y: y })); setDirty(true); }} />
        <Field label="Cover alt text *" error={errors.cover_alt}><input className="input" value={form.cover_alt} onChange={(e) => set('cover_alt', e.target.value)} /></Field>
        <Field label="Video preview URL (optional)"><input className="input" type="url" value={form.video_preview_url} onChange={(e) => set('video_preview_url', e.target.value)} /></Field>
      </section>

      <section className="panel"><h2>Case-study look</h2>
        <div className="layout-row">
          <label>Background<span className="row gap"><input type="color" aria-label="Background colour" value={form.settings.bg} onChange={(e) => setS({ bg: e.target.value })} />
            {['#ffffff', '#f5f3ee', '#111111', '#1c2438'].map((c) => <button key={c} type="button" className="swatch" style={{ background: c }} aria-label={`Use ${c}`} onClick={() => setS({ bg: c })} />)}</span></label>
          <label>Space between blocks<select className="input" value={form.settings.spacing} onChange={(e) => setS({ spacing: Number(e.target.value) })}><option value="0">None (seamless)</option><option value="16">Small</option><option value="40">Medium</option><option value="80">Large</option></select></label>
          <label className="check"><input type="checkbox" checked={form.settings.showCover} onChange={(e) => setS({ showCover: e.target.checked })} /> Show cover at the top of the case study</label>
        </div>
      </section>

      <section className="panel"><h2>Case-study blocks</h2>
        <BlockEditor blocks={form.blocks} onChange={(blocks) => set('blocks', blocks.map((b) => ({ ...b, _k: b._k || key() })))} />
      </section>

      {!isNew && <div className="row end"><button type="button" className="btn danger" onClick={archive}>Archive project</button></div>}

      {preview && (
        <Modal title="Preview as visitor" onClose={() => setPreview(false)} wide>
          <div className="preview-frame"><Showcase project={previewData} variant="preview" /></div>
        </Modal>
      )}
    </form>
  );
}
