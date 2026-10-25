import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { api, money } from '../lib/api.js';
import { useAsync, useTitle } from '../lib/useAsync.js';
import { useReveal } from '../lib/motion.js';
import { Empty, ErrorState, Spinner } from '../components/ui.jsx';
import PackageCard, { priceLabel } from '../components/PackageCard.jsx';

export default function Packages() {
  useTitle('Packages');
  const root = useRef(null);
  const { data, loading, error, reload } = useAsync(() => api.get('/packages'), []);
  const list = data?.data || [];
  useReveal(root, '[data-reveal]', [data]);
  const faqs = list.flatMap((p) => p.faqs.map((f) => ({ ...f, pkg: p.name })));

  return (
    <div className="section" ref={root}>
      <h1>Packages</h1>
      <p className="lead">Clear scopes and prices. Need something different? <Link to="/contact" className="link">Ask for a custom quote</Link>.</p>
      {loading ? <Spinner /> : error ? <ErrorState error={error} onRetry={reload} /> : list.length === 0 ? <Empty title="No packages available" hint="Send an enquiry and I’ll prepare a quote." action={<Link className="btn primary" to="/contact">Enquire</Link>} /> : (
        <>
          <div className="grid-pkg">{list.map((p) => <PackageCard key={p.id} pkg={p} />)}</div>
          {list.length > 1 && (
            <div className="table-wrap" data-reveal>
              <h2>Compare</h2>
              <table className="table">
                <thead><tr><th /> {list.map((p) => <th key={p.id}>{p.name}</th>)}</tr></thead>
                <tbody>
                  <tr><th>Price</th>{list.map((p) => <td key={p.id}>{priceLabel(p)}</td>)}</tr>
                  <tr><th>Revisions</th>{list.map((p) => <td key={p.id}>{p.revisions}</td>)}</tr>
                  <tr><th>Turnaround</th>{list.map((p) => <td key={p.id}>{p.turnaround_days ? `${p.turnaround_days} days` : '—'}</td>)}</tr>
                  <tr><th>Deliverables</th>{list.map((p) => <td key={p.id}><ul>{p.deliverables.map((d) => <li key={d}>{d}</li>)}</ul></td>)}</tr>
                  <tr><th>Add-ons</th>{list.map((p) => <td key={p.id}>{p.addons.length ? p.addons.map((a) => `${a.name} (+${money(a.price, p.currency)})`).join(', ') : '—'}</td>)}</tr>
                </tbody>
              </table>
            </div>
          )}
          {list.some((p) => p.terms) && <details className="faq" data-reveal><summary>Terms &amp; exclusions</summary>{list.filter((p) => p.terms).map((p) => <p key={p.id}><strong>{p.name}:</strong> {p.terms}</p>)}</details>}
          {faqs.length > 0 && <div data-reveal><h2>FAQs</h2>{faqs.map((f, i) => <details className="faq" key={i}><summary>{f.q}</summary><p>{f.a}</p></details>)}</div>}
        </>
      )}
    </div>
  );
}
