import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { admin, fmtDate, money } from '../../lib/api.js';
import { useAsync, useDebounced, useTitle } from '../../lib/useAsync.js';
import { Empty, ErrorState, Field, Modal, Pager, Spinner, StatusBadge, useConfirm, useToast } from '../../components/ui.jsx';

const today = () => new Date().toISOString().slice(0, 10);
const plus = (d) => new Date(Date.now() + d * 864e5).toISOString().slice(0, 10);

export function InvoiceForm({ clientProjectId, invoice, onClose, onSaved }) {
  const toast = useToast();
  const projects = useAsync(() => (clientProjectId ? Promise.resolve(null) : admin.get('/client-projects', { limit: 100 })), []);
  const [f, setF] = useState(invoice ? { ...invoice, notes: invoice.notes || '' } : { invoice_number: `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`, client_project_id: clientProjectId || '', issue_date: today(), due_date: plus(14), amount: '', currency: 'USD', notes: '' });
  const [errors, setErrors] = useState({}); const [busy, setBusy] = useState(false);
  const s = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function save(e) {
    e.preventDefault();
    const er = {};
    if (!f.invoice_number.trim()) er.invoice_number = 'Required';
    if (!f.client_project_id) er.client_project_id = 'Choose a project';
    if (f.amount === '' || Number(f.amount) < 0) er.amount = 'Enter an amount';
    if (!f.due_date) er.due_date = 'Required';
    setErrors(er); if (Object.keys(er).length) return;
    setBusy(true);
    try {
      const body = { invoice_number: f.invoice_number.trim(), issue_date: f.issue_date, due_date: f.due_date, amount: Number(f.amount), currency: f.currency, notes: f.notes || null };
      const r = invoice ? await admin.patch(`/invoices/${invoice.id}`, body) : await admin.post('/invoices', { ...body, client_project_id: f.client_project_id });
      toast.success('Invoice saved'); onSaved(r.data);
    } catch (err) { setErrors(err.details || {}); toast.error(err.message); } finally { setBusy(false); }
  }
  return (
    <Modal title={invoice ? 'Edit invoice' : 'New invoice'} onClose={onClose}>
      <form className="form" onSubmit={save}>
        <div className="grid2"><Field label="Invoice number *" error={errors.invoice_number}><input className="input" value={f.invoice_number} onChange={s('invoice_number')} /></Field>
          {!clientProjectId && !invoice && <Field label="Client project *" error={errors.client_project_id}><select className="input" value={f.client_project_id} onChange={s('client_project_id')}><option value="">Select…</option>{projects.data?.data.map((p) => <option key={p.id} value={p.id}>{p.clients?.name} — {p.title}</option>)}</select></Field>}
          <Field label="Issue date"><input className="input" type="date" value={f.issue_date} onChange={s('issue_date')} /></Field>
          <Field label="Due date *" error={errors.due_date}><input className="input" type="date" value={f.due_date} onChange={s('due_date')} /></Field>
          <Field label="Amount *" error={errors.amount}><input className="input" type="number" min="0" step="0.01" value={f.amount} onChange={s('amount')} /></Field>
          <Field label="Currency"><select className="input" value={f.currency} onChange={s('currency')} disabled={!!invoice}><option>USD</option><option>PKR</option></select></Field></div>
        <Field label="Notes"><textarea className="input" rows="3" value={f.notes} onChange={s('notes')} /></Field>
        <div className="row end gap"><button type="button" className="btn ghost" onClick={onClose}>Cancel</button><button className="btn primary" disabled={busy}>{busy ? 'Saving…' : 'Save invoice'}</button></div>
      </form>
    </Modal>
  );
}

export default function Invoices() {
  useTitle('Invoices');
  const [params, setParams] = useSearchParams();
  const status = params.get('status') || '';
  const [page, setPage] = useState(1); const [q, setQ] = useState(''); const dq = useDebounced(q);
  const [form, setForm] = useState(false); const nav = useNavigate();
  const { data, loading, error, reload } = useAsync(() => admin.get('/invoices', { status, q: dq, page, limit: 15 }), [status, dq, page]);
  return (
    <>
      <div className="row between wrap gap"><h1>Invoices</h1><button className="btn primary" onClick={() => setForm(true)}>New invoice</button></div>
      <div className="row gap wrap"><input className="input" type="search" placeholder="Invoice number…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <select className="input" value={status} onChange={(e) => { e.target.value ? setParams({ status: e.target.value }) : setParams({}); setPage(1); }} aria-label="Status">
          <option value="">All statuses</option>{['unpaid', 'partially_paid', 'paid', 'overdue', 'cancelled'].map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}</select></div>
      {loading ? <Spinner /> : error ? <ErrorState error={error} onRetry={reload} /> : data.data.length === 0 ? <Empty title="No invoices" /> : (
        <div className="table-wrap"><table className="table"><thead><tr><th>Number</th><th>Client / project</th><th>Amount</th><th>Outstanding</th><th>Due</th><th>Status</th></tr></thead>
          <tbody>{data.data.map((i) => (
            <tr key={i.id}><td><Link to={`/admin/invoices/${i.id}`}><strong>{i.invoice_number}</strong></Link></td>
              <td>{i.client_project?.clients?.name}<br /><small className="muted">{i.client_project?.title}</small></td>
              <td>{money(i.amount, i.currency)}</td><td>{money(i.outstanding, i.currency)}</td><td>{fmtDate(i.due_date)}</td><td><StatusBadge value={i.status} /></td></tr>))}</tbody></table></div>)}
      <Pager meta={data?.meta} onPage={setPage} />
      {form && <InvoiceForm onClose={() => setForm(false)} onSaved={(i) => nav(`/admin/invoices/${i.id}`)} />}
    </>
  );
}

export function InvoiceDetail() {
  const { id } = useParams();
  const toast = useToast(); const confirm = useConfirm();
  const [edit, setEdit] = useState(false); const [pay, setPay] = useState(null);
  const { data, loading, error, reload } = useAsync(() => admin.get(`/invoices/${id}`), [id]);
  useTitle(data?.data.invoice_number);
  if (loading) return <Spinner />; if (error) return <ErrorState error={error} onRetry={reload} />;
  const i = data.data;
  const act = async (fn, ok) => { try { await fn(); toast.success(ok); reload(); } catch (e) { toast.error(e.message); } };
  async function addPayment(e) {
    e.preventDefault();
    const amount = Number(pay.amount);
    if (!(amount > 0)) return toast.error('Enter a payment amount');
    await act(() => admin.post(`/invoices/${id}/payments`, { amount, paid_on: pay.paid_on, method: pay.method || null, note: pay.note || null }), 'Payment recorded');
    setPay(null);
  }
  async function cancel() {
    if (await confirm({ title: 'Cancel invoice?', message: 'The invoice and its payment history are kept, but it will be marked cancelled.', danger: true, confirmLabel: 'Cancel invoice' }))
      act(() => admin.patch(`/invoices/${id}`, { cancelled: true }), 'Invoice cancelled');
  }
  async function download() {
    try { const r = await admin.get(`/invoices/${id}/attachment`); window.open(r.data.url, '_blank', 'noopener'); } catch (e) { toast.error(e.message); }
  }
  async function attach(e) {
    const f = e.target.files?.[0]; e.target.value = ''; if (!f) return;
    if (f.size > 50 * 1024 * 1024) return toast.error('File is larger than 50 MB');
    act(() => admin.upload(`/invoices/${id}/attachment`, f), 'Attachment saved');
  }
  return (
    <>
      <div className="row between wrap gap"><div><Link to="/admin/invoices" className="link">← Invoices</Link><h1>{i.invoice_number} <StatusBadge value={i.status} /></h1>
        <p className="muted">{i.client_project?.clients?.name} · <Link to={`/admin/client-projects/${i.client_project_id}`}>{i.client_project?.title}</Link></p></div>
        <div className="row gap wrap">
          {!i.cancelled && <button className="btn" onClick={() => setEdit(true)}>Edit</button>}
          {!i.cancelled && i.outstanding > 0 && <button className="btn primary" onClick={() => setPay({ amount: i.outstanding, paid_on: today(), method: '', note: '' })}>Record payment</button>}
          {!i.cancelled ? <button className="btn danger" onClick={cancel}>Cancel invoice</button> : <button className="btn" onClick={() => act(() => admin.patch(`/invoices/${id}`, { cancelled: false }), 'Invoice reinstated')}>Reinstate</button>}
        </div></div>
      <div className="stats">
        <div className="stat"><strong>{money(i.amount, i.currency)}</strong><span>Invoice amount</span></div>
        <div className="stat"><strong>{money(i.paid_amount, i.currency)}</strong><span>Paid</span></div>
        <div className={`stat ${i.outstanding > 0 && i.status === 'overdue' ? 'warn' : ''}`}><strong>{money(i.outstanding, i.currency)}</strong><span>Outstanding</span></div>
        <div className="stat"><strong>{fmtDate(i.due_date)}</strong><span>Due · issued {fmtDate(i.issue_date)}</span></div>
      </div>
      {i.notes && <section className="panel"><h3>Notes</h3><p className="pre">{i.notes}</p></section>}
      <section className="panel"><div className="row between"><h2>Payments</h2></div>
        {i.payments.length === 0 ? <Empty title="No payments recorded" /> : (
          <table className="table"><thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Note</th><th /></tr></thead>
            <tbody>{i.payments.map((p) => <tr key={p.id}><td>{fmtDate(p.paid_on)}</td><td>{money(p.amount, i.currency)}</td><td>{p.method || '—'}</td><td>{p.note || '—'}</td>
              <td><button className="btn sm danger" onClick={async () => { if (await confirm({ message: 'Delete this payment record?', danger: true, confirmLabel: 'Delete' })) act(() => admin.del(`/invoices/${id}/payments/${p.id}`), 'Payment removed'); }}>Delete</button></td></tr>)}</tbody></table>)}
      </section>
      <section className="panel"><h2>Invoice file</h2><div className="row gap">
        {i.attachment_path && <button className="btn" onClick={download}>Download attached file</button>}
        <label className="btn">{i.attachment_path ? 'Replace file' : 'Attach PDF'}<input type="file" hidden accept="application/pdf,image/png,image/jpeg" onChange={attach} /></label></div></section>
      {edit && <InvoiceForm invoice={i} onClose={() => setEdit(false)} onSaved={() => { setEdit(false); reload(); }} />}
      {pay && <Modal title="Record payment" onClose={() => setPay(null)}><form className="form" onSubmit={addPayment}>
        <div className="grid2"><Field label={`Amount (max ${money(i.outstanding, i.currency)})`}><input className="input" type="number" min="0.01" step="0.01" max={i.outstanding} value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} /></Field>
          <Field label="Date"><input className="input" type="date" value={pay.paid_on} onChange={(e) => setPay({ ...pay, paid_on: e.target.value })} /></Field></div>
        <Field label="Method"><input className="input" value={pay.method} onChange={(e) => setPay({ ...pay, method: e.target.value })} placeholder="Bank transfer, Fiverr, cash…" /></Field>
        <Field label="Note"><input className="input" value={pay.note} onChange={(e) => setPay({ ...pay, note: e.target.value })} /></Field>
        <div className="row end gap"><button type="button" className="btn ghost" onClick={() => setPay(null)}>Cancel</button><button className="btn primary">Record</button></div></form></Modal>}
    </>
  );
}
