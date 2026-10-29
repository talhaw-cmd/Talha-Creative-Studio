import { Link, useLocation } from 'react-router-dom';
import { prefetchProps } from '../lib/prefetch.js';

// Link props for opening a project. From a list page the project opens as an overlay on top of it
// (no page change, no spinner); from a project page itself it is a normal link.
export function useProjectLink(p) {
  const loc = useLocation();
  const inOverlay = !!loc.state?.background;
  const onDetail = !inOverlay && /^\/work\/[^/]+\/?$/.test(loc.pathname);
  const bg = inOverlay ? loc.state.background : { pathname: loc.pathname, search: loc.search, hash: loc.hash };
  return { to: `/work/${p.slug}`, state: onDetail ? undefined : { background: bg, preview: p }, replace: inOverlay, ...prefetchProps(p) };
}

export default function ProjectCard({ project: p, index = 0 }) {
  const link = useProjectLink(p);
  return (
    <Link {...link} className={`card-work r${index % 4}`}>
      <div className="card-img">
        {p.cover_url
          ? <img src={p.cover_url} alt={p.cover_alt || p.title} loading="lazy" decoding="async" style={{ objectPosition: `${p.cover_focal_x ?? 50}% ${p.cover_focal_y ?? 50}%` }} />
          : <div className="img-missing">No image</div>}
      </div>
      <div className="card-meta"><strong>{p.title}</strong><span className="muted">{p.categories?.name || 'Other'}{p.year ? ` · ${p.year}` : ''}</span></div>
      <span className="card-view">View project →</span>
    </Link>
  );
}
