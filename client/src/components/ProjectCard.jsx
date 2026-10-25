import { Link } from 'react-router-dom';

export default function ProjectCard({ project: p, index = 0 }) {
  return (
    <Link to={`/work/${p.slug}`} className={`card-work v${index % 3}`} data-reveal>
      <div className="card-img">
        {p.cover_url
          ? <img src={p.cover_url} alt={p.cover_alt || p.title} loading="lazy" style={{ objectPosition: `${p.cover_focal_x ?? 50}% ${p.cover_focal_y ?? 50}%` }} />
          : <div className="img-missing">No image</div>}
        <div className="card-hover"><span>View case study →</span></div>
      </div>
      <div className="card-meta"><strong>{p.title}</strong><span className="muted">{p.categories?.name || 'Other'}{p.year ? ` · ${p.year}` : ''}</span></div>
    </Link>
  );
}
