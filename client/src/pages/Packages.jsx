import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { money } from '../lib/api.js';
import { useApi, useTitle } from '../lib/useAsync.js';
import { useBatchIn, useSplitHeadings } from '../lib/motion.js';
import { Empty, ErrorState, Spinner } from '../components/ui.jsx';
import PackageCard, { centerFeatured, priceLabel } from '../components/PackageCard.jsx';
import Lines from '../components/Lines.jsx';
import Process from '../components/Process.jsx';

export default function Packages() {
  useTitle('Packages');
  const root = useRef(null);
  const { data, loading, error, reload } = useApi('/packages');
  const list = centerFeatured(data?.data || []);
  useSplitHeadings(root, []);
  useBatchIn(root, '.card-pkg', [data]);
  const faqs = list.flatMap((p) => p.faqs.map((f) => ({ ...f, pkg: p.name })));

  return (
    <div ref={root}>
      <div className="section">
        <div className="page-head"><Lines as="h1" lines={['Choose your package']} /><p>Flexible options for every stage of your creative journey. Need something different? <Link to="/contact" className="link">Ask for a custom quote</Link>.</p></div>
        {loading ? <Spinner /> : error ? <ErrorState error={error} onRetry={reload} /> : list.length === 0 ? <Empty title="No packages available" hint="Send an enquiry and I’ll prepare a quote." action={<Link className="btn primary" to="/contact">Enquire</Link>} /> : (
          <>
            <div className="grid-pkg">{list.map((p) => <PackageCard key={p.id} pkg={p} />)}</div>
            {list.length > 1 && (
              <div className="table-wrap">
                <h2>Compare</h2>
                <table className="table">
                  <thead><tr><th />{list.map((p) => <th key={p.id}>{p.name}</th>)}</tr></thead>
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
            {list.some((p) => p.terms) && <details className="faq"><summary>Terms and exclusions</summary>{list.filter((p) => p.terms).map((p) => <p key={p.id}><strong>{p.name}:</strong> {p.terms}</p>)}</details>}
            {faqs.length > 0 && <div className="faq-block"><h2>Frequently asked</h2>{faqs.map((f, i) => <details className="faq" key={i}><summary>{f.q}</summary><p>{f.a}</p></details>)}</div>}
          </>
        )}
      </div>
      <Process />
    </div>
  );
}
