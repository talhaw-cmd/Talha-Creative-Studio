import { useLayoutEffect, useRef } from 'react';
import { gsap } from '../lib/motion.js';
import Lines from './Lines.jsx';

const steps = [
  ['Discover', 'You share goals, audience and references.', 'var(--lime)'],
  ['Explore', 'I sketch directions and show the strongest ones.', '#fff'],
  ['Create', 'The chosen direction gets built out properly.', 'var(--coral)'],
  ['Refine and deliver', 'We polish together, then you get final files.', 'var(--blue)'],
];

export default function Process({ title = ['A simple process.', 'Powerful results.'], text = 'Four steps from first message to final files.' }) {
  const root = useRef(null);
  useLayoutEffect(() => {
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference) and (min-width: 761px)', () => {
      gsap.to('.proc-line i', { scaleX: 1, ease: 'none', scrollTrigger: { trigger: '.proc', start: 'top 80%', end: 'top 35%', scrub: true } });
    }, root);
    return () => mm.revert();
  }, []);
  return (
    <section className="section" ref={root}>
      <div className="proc-head"><Lines lines={title} /><p>{text}</p></div>
      <div className="proc">
        <div className="proc-line" aria-hidden="true"><i /></div>
        <ol className="proc-list">
        {steps.map(([t, d, c], i) => (
          <li key={t}><span className="proc-dot" style={{ '--c': c, color: c === 'var(--blue)' || c === 'var(--coral)' ? '#fff' : undefined }}>{i + 1}</span><h3>{t}</h3><p>{d}</p></li>
        ))}
        </ol>
      </div>
    </section>
  );
}
