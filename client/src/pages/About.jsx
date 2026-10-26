import { useRef } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { useTitle } from '../lib/useAsync.js';
import { useSplitHeadings } from '../lib/motion.js';
import Lines from '../components/Lines.jsx';
import Process from '../components/Process.jsx';

export default function About() {
  useTitle('About');
  const { settings } = useOutletContext();
  const root = useRef(null);
  useSplitHeadings(root, []);
  const paras = String(settings?.about_text || '').split(/\n{2,}/).filter(Boolean);
  return (
    <div ref={root}>
      <div className="section narrow">
        <div className="page-head"><Lines as="h1" lines={['About']} /></div>
        {paras.length ? paras.map((p, i) => <p className="lead" key={i}>{p}</p>) : <p className="lead muted">Add your story in Admin → Settings → About page text.</p>}
        <Link className="btn primary lg" to="/contact">Work with me</Link>
      </div>
      <Process />
    </div>
  );
}
