import { lazy, Suspense, useRef } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAsync, useTitle } from '../lib/useAsync.js';
import { useReveal } from '../lib/motion.js';
import { ErrorState, Spinner } from '../components/ui.jsx';
import ProjectCard from '../components/ProjectCard.jsx';
import PackageCard from '../components/PackageCard.jsx';

const Hero3D = lazy(() => import('../components/Hero3D.jsx'));
const steps = [['Brief', 'You share goals, audience and references.'], ['Concept', 'I explore directions and show the strongest ones.'], ['Refinement', 'We polish the chosen direction together.'], ['Delivery', 'Print-ready files, mockups and source files.']];

export default function Home() {
  useTitle('');
  const { settings } = useOutletContext();
  const root = useRef(null);
  const work = useAsync(() => api.get('/projects', { limit: 6 }), []);
  const pk = useAsync(() => api.get('/packages'), []);
  useReveal(root, '[data-reveal]', [work.data, pk.data]);

  return (
    <div ref={root}>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Graphic design · Packaging · Branding</p>
          <h1>{settings?.tagline || 'Ideas made visible'}</h1>
          <p className="lead">{settings?.seo_description || 'I design packaging, posters and brand identities that look sharp on the shelf and on the screen.'}</p>
          <div className="row gap wrap"><Link className="btn primary lg" to="/work">See selected work</Link><Link className="btn lg" to="/contact">Start a project</Link></div>
        </div>
        <Suspense fallback={<div className="hero3d fallback" aria-hidden="true"><div className="blob" /></div>}><Hero3D /></Suspense>
      </section>

      <section className="section">
        <div className="row between end-v"><h2 data-reveal>Selected work</h2><Link to="/work" className="link">All projects →</Link></div>
        {work.loading ? <Spinner /> : work.error ? <ErrorState error={work.error} onRetry={work.reload} /> :
          work.data.data.length === 0 ? <p className="muted">Projects will appear here once published.</p> :
            <div className="grid-work">{work.data.data.map((p, i) => <ProjectCard key={p.id} project={p} index={i} />)}</div>}
      </section>

      <section className="section dark">
        <h2 data-reveal>Packages</h2>
        {pk.loading ? <Spinner /> : pk.error ? <ErrorState error={pk.error} onRetry={pk.reload} /> :
          pk.data.data.length === 0 ? <p className="muted">No packages published yet.</p> :
            <div className="grid-pkg">{pk.data.data.slice(0, 3).map((p) => <PackageCard key={p.id} pkg={p} />)}</div>}
        <Link className="btn lg" to="/packages">Compare packages</Link>
      </section>

      <section className="section">
        <h2 data-reveal>How it works</h2>
        <ol className="steps">{steps.map(([t, d], i) => <li key={t} data-reveal><span>0{i + 1}</span><h3>{t}</h3><p className="muted">{d}</p></li>)}</ol>
      </section>

      <section className="section cta" data-reveal>
        <h2>Have a product or brand to design?</h2>
        <Link className="btn primary lg" to="/contact">Tell me about it</Link>
      </section>
    </div>
  );
}
