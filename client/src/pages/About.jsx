import { Link, useOutletContext } from 'react-router-dom';
import { useTitle } from '../lib/useAsync.js';

export default function About() {
  useTitle('About');
  const { settings } = useOutletContext();
  const paras = String(settings?.about_text || '').split(/\n{2,}/).filter(Boolean);
  return (
    <div className="section narrow">
      <h1>About</h1>
      {paras.length ? paras.map((p, i) => <p className="lead" key={i}>{p}</p>) : <p className="lead muted">The designer’s story will appear here once added in the admin panel.</p>}
      <h2>Process</h2>
      <ol className="steps">{['Brief', 'Concept', 'Refinement', 'Delivery'].map((s, i) => <li key={s}><span>0{i + 1}</span><h3>{s}</h3></li>)}</ol>
      <Link className="btn primary lg" to="/contact">Work with me</Link>
    </div>
  );
}
