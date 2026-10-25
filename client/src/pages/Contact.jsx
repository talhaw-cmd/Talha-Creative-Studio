import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAsync, useTitle } from '../lib/useAsync.js';
import { Field } from '../components/ui.jsx';

const empty = { name: '', email: '', company: '', service: '', budget: '', deadline: '', brief: '', website: '' };
const budgets = ['Under $100', '$100 – $300', '$300 – $1,000', '$1,000+', 'Not sure yet'];

export default function Contact() {
  useTitle('Contact');
  const [params] = useSearchParams();
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState({ state: 'idle' });
  const pk = useAsync(() => api.get('/packages'), []);

  useEffect(() => {
    const slug = params.get('package');
    const found = pk.data?.data.find((p) => p.slug === slug);
    if (found) setForm((f) => (f.service ? f : { ...f, service: found.name }));
  }, [params, pk.data]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function validate() {
    const e = {};
    if (!form.name.trim()) e.name = 'Please enter your name';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Enter a valid email address';
    if (form.brief.trim().length < 10) e.brief = 'Tell me a little more (at least 10 characters)';
    return e;
  }

  async function submit(ev) {
    ev.preventDefault();
    const e = validate(); setErrors(e);
    if (Object.keys(e).length) return;
    setStatus({ state: 'sending' });
    try { await api.post('/contact', form); setStatus({ state: 'done' }); setForm(empty); }
    catch (err) { setErrors(err.details || {}); setStatus({ state: 'error', message: err.message }); }
  }

  if (status.state === 'done') return (
    <div className="section narrow"><h1>Thank you!</h1><p className="lead">Your enquiry has been received. I’ll reply by email soon.</p><button className="btn" onClick={() => setStatus({ state: 'idle' })}>Send another</button></div>
  );

  return (
    <div className="section narrow">
      <h1>Start a project</h1>
      <form onSubmit={submit} noValidate className="form">
        <div className="grid2">
          <Field label="Name *" error={errors.name}><input className="input" value={form.name} onChange={set('name')} autoComplete="name" required /></Field>
          <Field label="Email *" error={errors.email}><input className="input" type="email" value={form.email} onChange={set('email')} autoComplete="email" required /></Field>
          <Field label="Company"><input className="input" value={form.company} onChange={set('company')} autoComplete="organization" /></Field>
          <Field label="Service">
            <input className="input" list="services" value={form.service} onChange={set('service')} placeholder="e.g. Snack packaging" />
            <datalist id="services">{pk.data?.data.map((p) => <option key={p.id} value={p.name} />)}</datalist>
          </Field>
          <Field label="Budget range"><select className="input" value={form.budget} onChange={set('budget')}><option value="">Select…</option>{budgets.map((b) => <option key={b}>{b}</option>)}</select></Field>
          <Field label="Deadline"><input className="input" value={form.deadline} onChange={set('deadline')} placeholder="e.g. End of next month" /></Field>
        </div>
        <Field label="Project brief *" error={errors.brief}><textarea className="input" rows="6" value={form.brief} onChange={set('brief')} required /></Field>
        <div className="hp" aria-hidden="true"><label>Leave empty<input tabIndex="-1" autoComplete="off" value={form.website} onChange={set('website')} /></label></div>
        {status.state === 'error' && <p className="field-err" role="alert">{status.message}</p>}
        <button className="btn primary lg" disabled={status.state === 'sending'}>{status.state === 'sending' ? 'Sending…' : 'Send enquiry'}</button>
      </form>
    </div>
  );
}
