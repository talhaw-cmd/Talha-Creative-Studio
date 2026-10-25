import { useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAsync, useDebounced, useTitle } from '../lib/useAsync.js';
import { useReveal } from '../lib/motion.js';
import { Empty, ErrorState, Pager, Spinner } from '../components/ui.jsx';
import ProjectCard from '../components/ProjectCard.jsx';

export default function Work() {
  useTitle('Work');
  const [params, setParams] = useSearchParams();
  const category = params.get('category') || '';
  const sort = params.get('sort') || 'newest';
  const page = Number(params.get('page') || 1);
  const [q, setQ] = useState(params.get('q') || '');
  const dq = useDebounced(q);
  const [shuffled, setShuffled] = useState(0);
  const root = useRef(null);

  const cats = useAsync(() => api.get('/categories'), []);
  const { data, loading, error, reload } = useAsync(
    () => api.get('/projects', { category, sort, q: dq, page, limit: 12 }), [category, sort, dq, page]);

  const set = (k, v) => { const n = new URLSearchParams(params); v ? n.set(k, v) : n.delete(k); if (k !== 'page') n.delete('page'); setParams(n, { replace: true }); };
  const items = useMemo(() => {
    const rows = data?.data || [];
    if (!shuffled) return rows;
    return [...rows].sort(() => Math.random() - 0.5); // eslint-disable-line react-hooks/exhaustive-deps
  }, [data, shuffled]);
  useReveal(root, '[data-reveal]', [items]);

  return (
    <div className="section" ref={root}>
      <h1>Work</h1>
      <div className="filters">
        <div className="chips" role="group" aria-label="Filter by category">
          <button className={`chip ${!category ? 'on' : ''}`} onClick={() => set('category', '')}>All</button>
          {cats.data?.data.map((c) => <button key={c.id} className={`chip ${category === c.slug ? 'on' : ''}`} onClick={() => set('category', c.slug)}>{c.name}</button>)}
        </div>
        <div className="row gap wrap">
          <input className="input" type="search" placeholder="Search projects…" aria-label="Search projects" value={q} onChange={(e) => { setQ(e.target.value); set('q', e.target.value); }} />
          <select className="input" aria-label="Sort" value={sort} onChange={(e) => set('sort', e.target.value)}>
            <option value="newest">Newest</option><option value="oldest">Oldest</option><option value="title">Title A–Z</option><option value="position">Curated</option>
          </select>
          <button className="btn" onClick={() => setShuffled((s) => s + 1)}>Shuffle</button>
        </div>
      </div>
      {loading ? <Spinner /> : error ? <ErrorState error={error} onRetry={reload} /> :
        items.length === 0 ? <Empty title="No projects here yet" hint={category || dq ? 'Try another category or clear the search.' : 'Check back soon.'} /> :
          <div className="grid-work">{items.map((p, i) => <ProjectCard key={p.id} project={p} index={i} />)}</div>}
      <Pager meta={data?.meta} onPage={(p) => set('page', String(p))} />
    </div>
  );
}
