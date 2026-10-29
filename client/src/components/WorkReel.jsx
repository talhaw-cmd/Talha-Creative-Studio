import { useLayoutEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useProjectLink } from './ProjectCard.jsx';
import { gsap, ScrollTrigger } from '../lib/motion.js';
import { ErrorState, Spinner } from './ui.jsx';

// Desktop: the section pins, then vertical scroll drives a horizontal track.
// Mobile / reduced motion: a normal swipeable row.
function ReelCard({ p }) {
  const link = useProjectLink(p);
  return (
    <Link {...link} className="reel-card">
      <div className="reel-img">{p.cover_url ? <img src={p.cover_url} alt={p.cover_alt || p.title} loading="lazy" style={{ objectPosition: `${p.cover_focal_x ?? 50}% ${p.cover_focal_y ?? 50}%` }} /> : <div className="img-missing">No image</div>}</div>
      <div className="reel-meta"><div><strong>{p.title}</strong><span className="muted">{p.categories?.name || 'Other'}{p.year ? ` · ${p.year}` : ''}</span></div><span className="arrow-btn" aria-hidden="true">→</span></div>
    </Link>
  );
}

export default function WorkReel({ projects, loading, error, onRetry }) {
  const root = useRef(null); const track = useRef(null); const bar = useRef(null);

  useLayoutEffect(() => {
    if (!projects.length) return undefined;
    const mm = gsap.matchMedia();
    mm.add('(min-width: 900px) and (prefers-reduced-motion: no-preference)', () => {
      const dist = () => Math.max(0, track.current.scrollWidth - window.innerWidth);
      if (dist() < 40) return;
      const tween = gsap.to(track.current, {
        x: () => -dist(), ease: 'none',
        scrollTrigger: {
          trigger: root.current, pin: true, scrub: 0.8, start: 'top top', end: () => `+=${dist()}`,
          invalidateOnRefresh: true, anticipatePin: 1, refreshPriority: 1,
          onUpdate: (s) => { if (bar.current) bar.current.style.transform = `scaleX(${s.progress})`; },
        },
      });
      // each image drifts inside its frame while its card crosses the screen
      gsap.utils.toArray('.reel-img img', root.current).forEach((img) => {
        gsap.fromTo(img, { xPercent: -6 }, { xPercent: 6, ease: 'none', scrollTrigger: { trigger: img.closest('.reel-card'), containerAnimation: tween, start: 'left right', end: 'right left', scrub: true } });
      });
      requestAnimationFrame(() => ScrollTrigger.refresh());
    }, root);
    return () => mm.revert();
  }, [projects.length]);

  if (loading) return <section className="reel section" id="work"><Spinner /></section>;
  if (error) return <section className="reel section" id="work"><ErrorState error={error} onRetry={onRetry} /></section>;
  if (!projects.length) return <section className="reel section" id="work"><h2>Selected work</h2><p className="muted">Projects appear here once you publish them from the admin panel.</p></section>;

  return (
    <section className="reel" id="work" ref={root} aria-labelledby="reel-title">
      <div className="reel-viewport">
        <div className="reel-track" ref={track}>
          <div className="reel-intro">
            <h2 id="reel-title">Selected work. Real creative thinking.</h2>
            <Link className="link" to="/work">View all work →</Link>
            <p className="hint muted small">Keep scrolling to move through the projects.</p>
          </div>
          {projects.map((p) => (
            <ReelCard key={p.id} p={p} />
          ))}
          <Link to="/contact" className="reel-cta"><h3>Let’s build something amazing.</h3><span className="arrow-btn" aria-hidden="true">→</span></Link>
        </div>
      </div>
      <div className="reel-progress" aria-hidden="true"><i ref={bar} /></div>
    </section>
  );
}
