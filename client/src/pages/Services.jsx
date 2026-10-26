import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTitle } from '../lib/useAsync.js';
import { useBatchIn, useSplitHeadings } from '../lib/motion.js';
import { services } from '../lib/services.js';
import Lines from '../components/Lines.jsx';
import CtaBanner from '../components/CtaBanner.jsx';

export default function Services() {
  useTitle('Services');
  const root = useRef(null);
  useSplitHeadings(root, []);
  useBatchIn(root, '.svc-row', []);
  return (
    <div ref={root}>
      <div className="section">
        <div className="page-head"><Lines as="h1" lines={['Creative solutions', 'for every stage.']} /><p>From brand ideas to automated workflows, everything you need to launch and grow, designed and built in one place.</p></div>
        {services.map((s, i) => (
          <article key={s.id} className={`svc-row tone-${s.tone}`} style={{ '--r': `${[12, -10, 18, -6][i]}deg` }}>
            <div className="svc-art" aria-hidden="true"><i /><i /><i /></div>
            <div className="svc-body">
              <h3>{s.title}</h3>
              <p>{s.copy}</p>
              <ul className="ticks">{s.points.map((t) => <li key={t}>{t}</li>)}</ul>
              <Link className="btn" to={`/contact?service=${encodeURIComponent(s.title)}`}>Start this project</Link>
            </div>
          </article>
        ))}
      </div>
      <CtaBanner tone="blue" title="Let’s discuss your project." text="Share a few details and I’ll reply with next steps and a quote." label="Contact us" />
    </div>
  );
}
