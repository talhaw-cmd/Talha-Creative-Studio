import { Link } from 'react-router-dom';
import { money } from '../lib/api.js';

export const priceLabel = (p) =>
  p.price_type === 'quote' ? 'Request a quote' : `${p.price_type === 'starting' ? 'From ' : ''}${money(p.price, p.currency)}`;

export default function PackageCard({ pkg: p }) {
  return (
    <article className={`card-pkg ${p.featured ? 'featured' : ''}`} data-reveal>
      {p.featured && <span className="badge b-published">Popular</span>}
      <h3>{p.name}</h3>
      <p className="price">{priceLabel(p)}</p>
      {p.summary && <p className="muted">{p.summary}</p>}
      <ul>{p.deliverables.slice(0, 5).map((d) => <li key={d}>{d}</li>)}</ul>
      <p className="muted small">{p.revisions} revisions{p.turnaround_days ? ` · ~${p.turnaround_days} working days` : ''}</p>
      <Link className="btn primary" to={`/contact?package=${p.slug}`}>{p.price_type === 'quote' ? 'Request a quote' : 'Enquire'}</Link>
    </article>
  );
}
