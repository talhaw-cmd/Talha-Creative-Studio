import { useLayoutEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from '../lib/motion.js';
import { services } from '../lib/services.js';
import Lines from './Lines.jsx';

// Sticky card stack: each new card slides over the previous one, which scales back as it is covered.
export default function ServiceStack() {
  const root = useRef(null);
  useLayoutEffect(() => {
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const cards = gsap.utils.toArray('.svc-card', root.current);
      cards.forEach((card, i) => {
        if (i === cards.length - 1) return;
        const next = cards[i + 1];
        gsap.fromTo(card, { scale: 1, filter: 'brightness(1)' }, {
          scale: 0.93, filter: 'brightness(0.92)', ease: 'none',
          scrollTrigger: { trigger: next, start: 'top 88%', end: () => `top ${parseFloat(getComputedStyle(next).top)}px`, scrub: true, invalidateOnRefresh: true },
        });
      });
    }, root);
    return () => mm.revert();
  }, []);

  return (
    <section className="section" ref={root} aria-labelledby="svc-title">
      <div className="svc-head">
        <Lines id="svc-title" lines={['Creative services', 'for modern brands.']} />
        <div><p>Design, automation and web work under one roof, so your brand looks and runs as one thing.</p><Link className="btn" to="/services">View all services</Link></div>
      </div>
      <div className="svc-stack">
        {services.map((s, i) => (
          <article key={s.id} className={`svc-card tone-${s.tone}`} style={{ '--i': i, '--r': `${[12, -10, 18, -6][i]}deg` }}>
            <div className="svc-body">
              <h3>{s.title}</h3>
              <p>{s.copy}</p>
              <ul className="svc-tags">{s.points.slice(0, 3).map((t) => <li key={t}>{t}</li>)}</ul>
              <Link className="btn" to={`/contact?service=${encodeURIComponent(s.title)}`}>Start this project</Link>
            </div>
            <div className="svc-art" aria-hidden="true"><i /><i /><i /></div>
          </article>
        ))}
      </div>
    </section>
  );
}
