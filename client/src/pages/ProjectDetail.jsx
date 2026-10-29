import { useCallback, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useApi, useTitle } from '../lib/useAsync.js';
import { ErrorState, Spinner } from '../components/ui.jsx';
import Showcase from '../components/Showcase.jsx';
import NotFound from './NotFound.jsx';

// Full page: used when a project URL is opened directly (shared link, refresh).
export default function ProjectDetail() {
  const { slug } = useParams();
  const { state } = useLocation();
  const { data, loading, error, reload } = useApi(`/projects/${slug}`);
  const p = data?.data;
  useTitle(p?.title);
  if (error?.status === 404) return <NotFound />;
  if (error) return <div className="section"><ErrorState error={error} onRetry={reload} /></div>;
  const shown = p || state?.preview;
  if (!shown) return <div className="section"><Spinner /></div>;
  return <Showcase project={shown} loading={loading} variant="page" nav={p && { prev: p.prev, next: p.next, related: p.related }} />;
}

// Overlay: opens over the list the visitor came from (like Behance). Cached/prefetched data shows instantly.
export function ProjectOverlay() {
  const { slug } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const scroller = useRef(null);
  const { data, error, reload } = useApi(`/projects/${slug}`);
  const p = data?.data;
  const shown = p || state?.preview;
  useTitle(shown?.title);

  const close = useCallback(() => navigate(-1), [navigate]);
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const onKey = (e) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    scroller.current?.focus({ preventScroll: true });
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKey); };
  }, [close]);
  useEffect(() => { scroller.current?.scrollTo(0, 0); }, [slug]);

  const outside = (e) => { if (!e.target.closest('.sc-canvas, .sc-rail, .sc-more, .ov-close')) close(); };

  return (
    <div className="ov" ref={scroller} role="dialog" aria-modal="true" aria-label={shown?.title || 'Project'} tabIndex={-1} onMouseDown={outside}>
      <button type="button" className="ov-close" onClick={close} aria-label="Close project">✕</button>
      <div className="ov-wrap">
        {error?.status === 404 ? (
          <div className="sc-canvas ov-msg"><h2>Project not found</h2><p className="muted">It may be unpublished or the link is wrong.</p><button className="btn" onClick={close}>Close</button></div>
        ) : error && !shown ? (
          <div className="sc-canvas ov-msg"><ErrorState error={error} onRetry={reload} /></div>
        ) : shown ? (
          <Showcase project={shown} loading={!p} variant="overlay" nav={p && { prev: p.prev, next: p.next, related: p.related }} />
        ) : (
          <div className="sc-canvas ov-msg"><Spinner /></div>
        )}
      </div>
    </div>
  );
}
