import { Link } from 'react-router-dom';
import { admin, fmtDate, money } from '../../lib/api.js';
import { useAsync, useTitle } from '../../lib/useAsync.js';
import { Empty, ErrorState, Spinner, StatusBadge } from '../../components/ui.jsx';

const Stat = ({ label, value, to, warn }) => (
  <Link to={to} className={`stat ${warn ? 'warn' : ''}`}><strong>{value}</strong><span>{label}</span></Link>
);

export default function Dashboard() {
  useTitle('Dashboard');
  const { data, loading, error, reload } = useAsync(() => admin.get('/dashboard'), []);
  if (loading) return <Spinner />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  const d = data.data;
  const out = Object.entries(d.outstanding);
  return (
    <>
      <h1>Dashboard</h1>
      <div className="stats">
        <Stat label="Published projects" value={d.projects.published} to="/admin/projects" />
        <Stat label="Draft projects" value={d.projects.drafts} to="/admin/projects?status=draft" />
        <Stat label="Published packages" value={d.packages} to="/admin/packages" />
        <Stat label="Active client work" value={d.activeWork} to="/admin/clients" />
        <Stat label="New enquiries" value={d.newEnquiries} to="/admin/enquiries" warn={d.newEnquiries > 0} />
        <Stat label="Unpaid invoices" value={d.unpaidInvoices} to="/admin/invoices" />
        <Stat label="Overdue invoices" value={d.overdueInvoices} to="/admin/invoices?status=overdue" warn={d.overdueInvoices > 0} />
        <div className="stat"><strong>{out.length ? out.map(([c, v]) => money(v, c)).join(' · ') : '—'}</strong><span>Outstanding</span></div>
      </div>
      <section className="panel"><h2>Quick actions</h2>
        <div className="quick">{[['/admin/projects/new', 'Add project', 'Create a new case study'], ['/admin/media', 'Upload media', 'Add artwork to the library'], ['/admin/packages', 'Edit packages', 'Update prices and deliverables'], ['/admin/enquiries', 'View messages', 'Read new enquiries']].map(([to, t, d]) => <Link key={to} to={to} className="quick-item"><strong>{t}</strong><span className="muted">{d}</span></Link>)}</div></section>
      <div className="grid2">
        <section className="panel"><h2>Upcoming deadlines</h2>
          {d.deadlines.length === 0 ? <Empty title="Nothing due in the next 14 days" /> : (
            <ul className="list">{d.deadlines.map((x) => (
              <li key={x.id}><Link to={`/admin/client-projects/${x.id}`}>{x.title}</Link><span className="muted">{x.clients?.name}</span>
                <span className={x.overdue ? 'field-err' : ''}>{fmtDate(x.deadline)}</span></li>))}</ul>)}
        </section>
        <section className="panel"><h2>Recent activity</h2>
          {d.activity.length === 0 ? <Empty title="No activity yet" /> : (
            <ul className="list">{d.activity.map((a) => <li key={a.id}><span><StatusBadge value={a.action} /> {a.entity}</span><span className="muted">{fmtDate(a.created_at)}</span></li>)}</ul>)}
        </section>
      </div>
    </>
  );
}
