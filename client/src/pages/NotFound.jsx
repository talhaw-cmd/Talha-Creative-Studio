import { Link } from 'react-router-dom';
import { useTitle } from '../lib/useAsync.js';

export default function NotFound() {
  useTitle('Not found');
  return <div className="section narrow"><h1>Page not found</h1><p className="lead">That page doesn’t exist or isn’t published.</p><Link className="btn primary" to="/">Back home</Link></div>;
}
