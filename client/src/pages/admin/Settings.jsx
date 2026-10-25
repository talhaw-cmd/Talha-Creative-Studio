import { useEffect, useState } from 'react';
import { admin } from '../../lib/api.js';
import { useAsync, useTitle } from '../../lib/useAsync.js';
import { ErrorState, Field, Spinner, useToast, useUnsavedWarning } from '../../components/ui.jsx';

const fields = [['site_title', 'Site title'], ['tagline', 'Tagline (homepage headline)'], ['contact_email', 'Contact email'], ['whatsapp', 'WhatsApp number (with country code)'], ['instagram', 'Instagram URL'], ['behance', 'Behance URL'], ['linkedin', 'LinkedIn URL']];

export default function Settings() {
  useTitle('Settings');
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(() => admin.get('/settings'), []);
  const [f, setF] = useState(null); const [dirty, setDirty] = useState(false); const [busy, setBusy] = useState(false); const [errors, setErrors] = useState({});
  useUnsavedWarning(dirty);
  useEffect(() => { if (data) { setF(Object.fromEntries(Object.entries(data.data).map(([k, v]) => [k, v ?? '']))); setDirty(false); } }, [data]);
  if (loading || !f) return <Spinner />; if (error) return <ErrorState error={error} onRetry={reload} />;
  const s = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setDirty(true); };
  async function save(e) {
    e.preventDefault(); setBusy(true); setErrors({});
    try {
      const { id, updated_at, ...rest } = f;
      await admin.put('/settings', rest); toast.success('Settings saved'); setDirty(false);
    } catch (err) { setErrors(err.details || {}); toast.error(err.message); } finally { setBusy(false); }
  }
  return (
    <form onSubmit={save} className="panel form">
      <div className="row between"><h1>Site settings</h1><button className="btn primary" disabled={busy || !dirty}>{busy ? 'Saving…' : 'Save settings'}</button></div>
      <div className="grid2">{fields.map(([k, l]) => <Field key={k} label={l} error={errors[k]}><input className="input" value={f[k]} onChange={s(k)} /></Field>)}</div>
      <Field label="SEO description / intro" hint="Shown under the homepage headline."><textarea className="input" rows="3" value={f.seo_description} onChange={s('seo_description')} /></Field>
      <Field label="About page text" hint="Blank line = new paragraph."><textarea className="input" rows="8" value={f.about_text} onChange={s('about_text')} /></Field>
      <p className="muted small">Contact links and social links only appear on the public site when filled in.</p>
    </form>
  );
}
