import { useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../lib/useAsync.js';
import { inkFor, safeUrl, splitBlocks } from '../lib/showcase.js';
import { fmtDate } from '../lib/api.js';
import Modules, { ModuleSkeleton } from './Modules.jsx';
import ProjectCard, { useProjectLink } from './ProjectCard.jsx';
import { useToast } from './ui.jsx';

function PN({ p, dir }) {
  const link = useProjectLink(p);
  return <Link {...link} className={`sc-pn-${dir}`}>{dir === 'prev' ? '← ' : ''}{p.title}{dir === 'next' ? ' →' : ''}</Link>;
}

function MoreBy({ items, owner }) {
  const row = useRef(null);
  const go = (d) => row.current?.scrollBy({ left: d * row.current.clientWidth * 0.8, behavior: 'smooth' });
  return (
    <section className="sc-by">
      <div className="sc-col">
        <div className="row between center"><h2>More by {owner}</h2>
          <span className="row gap"><button type="button" className="arrow-btn sm" onClick={() => go(-1)} aria-label="Previous projects">←</button><button type="button" className="arrow-btn sm" onClick={() => go(1)} aria-label="Next projects">→</button></span></div>
        <div className="sc-by-row" ref={row}>{items.map((r, i) => <div key={r.id} className="sc-by-item"><ProjectCard project={r} index={i} /></div>)}</div>
      </div>
    </section>
  );
}

// Behance-style case study page: title bar, one centred canvas (modules only), closing block, more work, details.
export default function Showcase({ project: p, loading = false, variant = 'page', nav }) {
  const toast = useToast();
  const site = useApi('/settings').data?.data;
  const { settings, modules } = useMemo(() => splitBlocks(p.blocks), [p.blocks]);
  const ownerName = site?.site_title || 'Talha Creative Studio';
  const live = variant !== 'preview';
  const hire = `/contact?service=${encodeURIComponent(p.title || '')}`;
  const btnUrl = safeUrl(settings.button.url); const btn = settings.button.label && btnUrl ? settings.button : null;
  const about = [['Challenge', p.challenge], ['Concept', p.concept], ['Audience', p.audience]].filter(([, v]) => v);
  const meta = [p.categories?.name, p.year].filter(Boolean).join(' · ');

  const copy = async () => {
    try { await navigator.clipboard.writeText(`${window.location.origin}/work/${p.slug}`); toast.success('Link copied'); } catch { toast.error('Could not copy the link'); }
  };
  const top = (e) => { const ov = e.currentTarget.closest('.ov'); (ov || window).scrollTo({ top: 0, behavior: 'smooth' }); };
  const Btn = ({ cls = 'btn primary sm' }) => (btn ? (btnUrl.startsWith('/') ? <Link className={cls} to={btnUrl}>{btn.label}</Link> : <a className={cls} href={btnUrl} target="_blank" rel="noopener noreferrer">{btn.label}</a>) : null);

  return (
    <div className={`sc sc-${variant}`}>
      <div className="sc-col sc-bar">
        <span className="sc-avatar" aria-hidden="true">{ownerName.slice(0, 1).toUpperCase()}</span>
        <div className="sc-bar-t"><h1>{p.title}</h1><span className="small muted">{ownerName}{meta ? ` · ${meta}` : ''}</span></div>
        {live && <div className="row gap"><Btn cls="btn sm" /><Link className="btn primary sm" to={hire}>Hire me</Link></div>}
      </div>

      <div className="sc-layout">
        <article className="sc-canvas" style={{ '--sc-bg': settings.bg, '--sc-ink': inkFor(settings.bg), '--sc-gap': `${settings.spacing}px` }}>
          {live && (
            <div className="sc-pills">
              <Link to="/work" className="pill">More work</Link>
              <button type="button" className="pill" onClick={copy}>Copy link</button>
            </div>
          )}
          {settings.showCover && p.cover_url && <figure className="mod a-center img" style={{ '--mw': '1400px' }}><img src={p.cover_url} alt={p.cover_alt || p.title} decoding="async" /></figure>}
          {loading ? <ModuleSkeleton /> : <Modules modules={modules} />}
        </article>
        {live && (
          <aside className="sc-rail" aria-label="Project actions">
            <button type="button" onClick={copy} aria-label="Copy link" title="Copy link">⧉</button>
            <Link to={hire} aria-label="Start a project like this" title="Contact">✉</Link>
            <button type="button" onClick={top} aria-label="Back to top" title="Back to top">↑</button>
          </aside>
        )}
      </div>

      {!loading && (
        <>
          <section className="sc-col sc-end">
            <h2>{p.title}</h2>
            {p.published_at && <p className="small">Published {fmtDate(p.published_at)}</p>}
            {live && <div className="row gap wrap center-x"><Link className="btn primary" to={hire}>Start a project like this</Link><Btn cls="btn" /><button type="button" className="btn" onClick={copy}>Copy link</button></div>}
          </section>

          {live && nav?.related?.length > 0 && <MoreBy items={nav.related} owner={ownerName} />}

          <section className="sc-col sc-details">
            <div className="sc-dl">
              <div className="sc-card">
                <div className="sc-owner"><span className="sc-avatar" aria-hidden="true">{ownerName.slice(0, 1).toUpperCase()}</span><div><strong>{ownerName}</strong><span className="small muted">{site?.tagline || [p.role, p.year].filter(Boolean).join(' · ')}</span></div></div>
                {p.description && <p className="sc-desc">{p.description}</p>}
                {about.map(([k, v]) => <div key={k} className="sc-abt"><h3>{k}</h3><p>{v}</p></div>)}
              </div>
              {p.tools?.length > 0 && <div className="sc-card"><h3>Tools</h3><div className="tiles">{p.tools.map((t) => <span className="tile" key={t}><i>{t.slice(0, 1).toUpperCase()}</i>{t}</span>)}</div></div>}
              {p.categories?.name && <div className="sc-card"><h3>Creative field</h3><div className="tiles"><span className="tile wide">{p.categories.name}</span></div></div>}
            </div>
            <div className="sc-dr">{p.tags?.length > 0 && <div className="sc-tags">{p.tags.slice(0, 10).map((t) => <span key={t}>{t}</span>)}</div>}</div>
          </section>

          {live && nav && (nav.prev || nav.next) && <div className="sc-col sc-pn">{nav.prev ? <PN p={nav.prev} dir="prev" /> : <span />}{nav.next ? <PN p={nav.next} dir="next" /> : <span />}</div>}
        </>
      )}
    </div>
  );
}
