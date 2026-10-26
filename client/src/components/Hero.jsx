import { useLayoutEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from '../lib/motion.js';
import { useReducedMotion } from '../lib/useAsync.js';
import Lines from './Lines.jsx';

const Cover = ({ p }) => (p?.cover_url ? <img src={p.cover_url} alt="" style={{ objectPosition: `${p.cover_focal_x ?? 50}% ${p.cover_focal_y ?? 50}%` }} /> : <span className="ph" />);

export default function Hero({ projects }) {
  const root = useRef(null);
  const reduced = useReducedMotion();

  useLayoutEffect(() => {
    if (reduced) return undefined;
    let stopPointer = () => {};
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
      tl.from('.hl-inner', { yPercent: 115, duration: 1.1, stagger: 0.12 })
        .from('.hero-fade', { y: 22, opacity: 0, duration: 0.8, stagger: 0.1 }, '-=0.7')
        .from('.art-piece', { scale: 0.7, opacity: 0, y: 50, duration: 1.2, ease: 'back.out(1.5)', stagger: 0.1 }, 0.15);

      gsap.to('.art-float', { y: -16, duration: 2.8, yoyo: true, repeat: -1, ease: 'sine.inOut' });
      gsap.to('.art', { yPercent: -6, ease: 'none', scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: true } });

      // pointer parallax starts once the intro has finished, on devices that can hover
      tl.eventCallback('onComplete', () => {
        if (!window.matchMedia('(hover: hover)').matches) return;
        const pieces = gsap.utils.toArray('.art-piece');
        const move = (e) => {
          const r = root.current.getBoundingClientRect();
          const nx = (e.clientX - r.left) / r.width - 0.5; const ny = (e.clientY - r.top) / r.height - 0.5;
          pieces.forEach((p) => gsap.to(p, { x: nx * 34 * p.dataset.depth, y: ny * 34 * p.dataset.depth, duration: 0.9, ease: 'power3.out', overwrite: 'auto' }));
        };
        window.addEventListener('pointermove', move);
        stopPointer = () => window.removeEventListener('pointermove', move);
      });
    }, root);
    return () => { stopPointer(); ctx.revert(); };
  }, [reduced]);

  return (
    <section className="hero" ref={root}>
      <div className="hero-copy">
        <Lines as="h1" split={false} accentLast lines={['Ideas made visible.', 'Experiences made', 'memorable.']} />
        <p className="lead hero-fade">Creative design, intelligent automation and digital experiences built to make your ideas stand out.</p>
        <div className="row gap wrap hero-fade">
          <a className="btn primary lg" href="#work">Explore the work</a>
          <Link className="btn lg" to="/contact">Let’s work together</Link>
        </div>
      </div>
      <div className="art-wrap">
        <div className="art" aria-hidden="true">
          <div className="art-piece art-bg" data-depth="0.4" />
          <div className="art-piece art-podium" data-depth="1.2" />
          <div className="art-piece art-sphere" data-depth="1.8"><i className="art-float" /></div>
          <div className="art-piece art-card c1" data-depth="1"><Cover p={projects[0]} /></div>
          <div className="art-piece art-card c2" data-depth="1.5"><Cover p={projects[1]} /></div>
        </div>
        <a className="art-scroll" href="#work" aria-label="Scroll to selected work">↓</a>
      </div>
    </section>
  );
}
