import { Link } from 'react-router-dom';
import { money } from '../lib/api.js';

export const priceLabel = (p) =>
  p.price_type === 'quote' ? 'Custom quote' : `${p.price_type === 'starting' ? 'From ' : ''}${money(p.price, p.currency)}`;

// With three packages, show the featured one in the middle (like the design).
export function centerFeatured(list) {
  if (list.length !== 3) return list;
  const i = list.findIndex((p) => p.featured);
  if (i < 0 || i === 1) return list;
  const n = [...list]; [n[1], n[i]] = [n[i], n[1]]; return n;
}

export default function PackageCard({ pkg: p }) {
  return (
    <article className={`card-pkg ${p.featured ? 'featured' : ''}`}>
      {p.featured && <span className="pkg-tag">Most popular</span>}
      <h3>{p.name}</h3>
      {p.summary && <p className="pkg-sum">{p.summary}</p>}
      <p className="price">{priceLabel(p)}</p>
      <ul className="ticks">{p.deliverables.slice(0, 6).map((d) => <li key={d}>{d}</li>)}</ul>
      <p className="pkg-meta">{p.revisions} revisions{p.turnaround_days ? ` · about ${p.turnaround_days} working days` : ''}</p>
      <Link className={`btn ${p.price_type === 'quote' ? '' : 'primary'}`} to={`/contact?package=${p.slug}`}>{p.price_type === 'quote' ? 'Request a quote' : 'Get started'}</Link>
    </article>
  );
}
