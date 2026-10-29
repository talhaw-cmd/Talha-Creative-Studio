import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../lib/useAsync.js';
import { inkFor, splitBlocks } from '../lib/showcase.js';
import { fmtDate } from '../lib/api.js';
import Modules, { ModuleSkeleton } from './Modules.jsx';
import ProjectCard, { useProjectLink } from './ProjectCard.jsx';
import { useToast } from './ui.jsx';

function PN({ p, dir }) {
  const link = useProjectLink(p);
  return <Link {...link} className={`sc-pn-${dir}`}>{dir === 'prev' ? '← ' : ''}{p.title}{dir === 'next' ? ' →' : ''}</Link>;
}

// Behance-style case study: one centred canvas, header, stacked modules, footer, sticky rail, more work.
export default function Showcase({ project: p, loading = false, variant = 'page', nav }) {
  const toast = useToast();
  const owner = useApi('/settings').data?.data;
  const { settings, modules } = useMemo(() => splitBlocks(p.blocks), [p.blocks]);
  const ownerName = owner?.site_title || 'Talha Creative Studio';
  const hire = `/contact?service=${encodeURIComponent(p.title || '')}`;
  const facts = [['Role', p.role], ['Tools', p.tools?.join(', ')]].filter(([, v]) => v);
  const about = [['Challenge', p.challenge], ['Concept', p.concept], ['Audience', p.audience]].filter(([, v]) => v);

  const copy = async () => {
    try { await navigator.clipboard.writeText(`${window.location.origin}/work/${p.slug}`); toast.success('Link copied'); } catch { toast.error('Could not copy the link'); }
  };
  const top = (e) => { const ov = e.currentTarget.closest('.ov'); (ov || window).scrollTo({ top: 0, behavior: 'smooth' }); };

  return (
    <div className={`sc sc-${variant}`}>
      <div className="sc-layout">
        <article className="sc-canvas" style={{ '--sc-bg': settings.bg, '--sc-ink': inkFor(settings.bg), '--sc-gap': `${settings.spacing}px` }}>
          <header className="sc-head pad">
            <h1>{p.title}</h1>
            <div className="sc-owner">
              <span className="sc-avatar" aria-hidden="true">{ownerName.slice(0, 1).toUpperCase()}</span>
              <div><strong>{ownerName}</strong><span className="small">{[p.categories?.name, p.year].filter(Boolean).join(' · ')}</span></div>
              {variant !== 'preview' && <Link className="btn primary sm" to={hire}>Hire me</Link>}
            </div>
            {p.description && <p className="sc-intro">{p.description}</p>}
            {facts.length > 0 && <dl className="sc-facts">{facts.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>}
          </header>

          {about.length > 0 && <section className="sc-about pad">{about.map(([k, v]) => <div key={k}><h3>{k}</h3><p>{v}</p></div>)}</section>}

          {settings.showCover && p.cover_url && (
            <figure className="mod a-center img" style={{ '--mw': '1400px' }}><img src={p.cover_url} alt={p.cover_alt || p.title} decoding="async" /></figure>
          )}

          {loading ? <ModuleSkeleton /> : <Modules modules={modules} />}

          {!loading && (
            <footer className="sc-foot pad">
              {p.tags?.length > 0 && <div className="chips">{p.tags.map((t) => <span className="chip static" key={t}>{t}</span>)}</div>}
              {p.published_at && <p className="small sc-date">Published {fmtDate(p.published_at)}</p>}
              <div className="row gap wrap">
                <Link className="btn primary" to={hire}>Start a project like this</Link>
                <button type="button" className="btn" onClick={copy}>Copy link</button>
              </div>
            </footer>
          )}
        </article>

        {variant !== 'preview' && (
          <aside className="sc-rail" aria-label="Project actions">
            <button type="button" onClick={copy} aria-label="Copy link" title="Copy link">⧉</button>
            <Link to={hire} aria-label="Start a project like this" title="Start a project like this">✉</Link>
            <button type="button" onClick={top} aria-label="Back to top" title="Back to top">↑</button>
          </aside>
        )}
      </div>

      {nav && variant !== 'preview' && (
        <section className="sc-more">
          {(nav.prev || nav.next) && <div className="sc-pn">{nav.prev ? <PN p={nav.prev} dir="prev" /> : <span />}{nav.next ? <PN p={nav.next} dir="next" /> : <span />}</div>}
          {nav.related?.length > 0 && <><h2>More projects</h2><div className="grid-work">{nav.related.map((r, i) => <ProjectCard key={r.id} project={r} index={i} />)}</div></>}
        </section>
      )}
    </div>
  );
}
