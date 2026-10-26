import { useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAsync, useTitle } from '../lib/useAsync.js';
import { useReveal } from '../lib/motion.js';
import { ErrorState, Spinner } from '../components/ui.jsx';
import BlockRenderer from '../components/BlockRenderer.jsx';
import ProjectCard from '../components/ProjectCard.jsx';
import NotFound from './NotFound.jsx';

export function ProjectView({ project: p, showBack = false }) {
  const root = useRef(null);
  useReveal(root, '[data-reveal]', [p.id, p.blocks]);
  const direction = [p.concept, p.audience && `Audience: ${p.audience}`].filter(Boolean);
  const facts = [['Role', p.role], ['Tools', p.tools?.join(', ')]].filter(([, v]) => v);
  return (
    <article ref={root}>
      <header className="section pd-head">
        {showBack && <Link to="/work" className="back">← Back to work</Link>}
        <h1>{p.title}</h1>
        <div className="chips">
          {p.categories?.name && <span className="chip static">{p.categories.name}</span>}
          {p.year && <span className="chip static">{p.year}</span>}
        </div>
      </header>
      {p.cover_url && <div className="section pd-cover"><img src={p.cover_url} alt={p.cover_alt || p.title} style={{ objectPosition: `${p.cover_focal_x ?? 50}% ${p.cover_focal_y ?? 50}%` }} /></div>}
      {(p.description || p.challenge || direction.length > 0 || facts.length > 0) && (
        <section className="section pd-cols">
          <div><h3>Project overview</h3>{p.description && <p>{p.description}</p>}{p.challenge && <p>{p.challenge}</p>}</div>
          <div><h3>Creative direction</h3>{direction.map((d, i) => <p key={i}>{d}</p>)}
            {facts.length > 0 && <ul>{facts.map(([k, v]) => <li key={k}><strong>{k}:</strong> {v}</li>)}</ul>}</div>
        </section>
      )}
      <BlockRenderer blocks={p.blocks} />
      {p.tags?.length > 0 && <div className="section chips">{p.tags.map((t) => <span className="chip static" key={t}>{t}</span>)}</div>}
    </article>
  );
}

export default function ProjectDetail() {
  const { slug } = useParams();
  const { data, loading, error, reload } = useAsync(() => api.get(`/projects/${slug}`), [slug]);
  const p = data?.data;
  useTitle(p?.title);
  if (loading) return <div className="section"><Spinner /></div>;
  if (error?.status === 404) return <NotFound />;
  if (error) return <div className="section"><ErrorState error={error} onRetry={reload} /></div>;
  return (
    <>
      <ProjectView project={p} showBack />
      <nav className="section pn" aria-label="More projects">
        {p.prev ? <Link to={`/work/${p.prev.slug}`}>← {p.prev.title}</Link> : <span />}
        {p.next ? <Link to={`/work/${p.next.slug}`}>{p.next.title} →</Link> : <span />}
      </nav>
      {p.related.length > 0 && <section className="section"><h2>Related work</h2><div className="grid-work">{p.related.map((r, i) => <ProjectCard key={r.id} project={r} index={i} />)}</div></section>}
    </>
  );
}
