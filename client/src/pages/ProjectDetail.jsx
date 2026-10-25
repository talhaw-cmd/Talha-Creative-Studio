import { useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAsync, useTitle } from '../lib/useAsync.js';
import { useReveal } from '../lib/motion.js';
import { ErrorState, Spinner } from '../components/ui.jsx';
import BlockRenderer from '../components/BlockRenderer.jsx';
import ProjectCard from '../components/ProjectCard.jsx';
import NotFound from './NotFound.jsx';

export function ProjectView({ project: p }) {
  const root = useRef(null);
  useReveal(root, '[data-reveal]', [p.id, p.blocks]);
  const facts = [['Role', p.role], ['Year', p.year], ['Category', p.categories?.name], ['Tools', p.tools?.join(', ')]].filter(([, v]) => v);
  return (
    <article ref={root}>
      <header className="section project-head">
        <p className="eyebrow">{p.categories?.name}</p>
        <h1>{p.title}</h1>
        {p.description && <p className="lead">{p.description}</p>}
        <dl className="facts">{facts.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
      </header>
      {p.cover_url && <img className="cover" src={p.cover_url} alt={p.cover_alt || p.title} />}
      {(p.challenge || p.concept || p.audience) && (
        <section className="section three">
          {[['Challenge', p.challenge], ['Concept', p.concept], ['Audience', p.audience]].filter(([, v]) => v).map(([k, v]) => <div key={k} data-reveal><h3>{k}</h3><p>{v}</p></div>)}
        </section>
      )}
      <BlockRenderer blocks={p.blocks} />
      {p.tags?.length > 0 && <div className="section chips">{p.tags.map((t) => <span className="chip" key={t}>{t}</span>)}</div>}
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
      <ProjectView project={p} />
      <nav className="section pn" aria-label="More projects">
        {p.prev ? <Link to={`/work/${p.prev.slug}`}>← {p.prev.title}</Link> : <span />}
        {p.next ? <Link to={`/work/${p.next.slug}`}>{p.next.title} →</Link> : <span />}
      </nav>
      {p.related.length > 0 && <section className="section"><h2>Related work</h2><div className="grid-work">{p.related.map((r, i) => <ProjectCard key={r.id} project={r} index={i} />)}</div></section>}
    </>
  );
}
