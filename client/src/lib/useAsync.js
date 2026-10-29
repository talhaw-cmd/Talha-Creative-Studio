import { useCallback, useEffect, useRef, useState } from 'react';
import { apiKey, fetchCached, peek } from './api.js';

// Loads data with loading/error/retry state. `deps` re-run the loader.
export function useAsync(loader, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const alive = useRef(true);
  const run = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }));
    loader()
      .then((data) => alive.current && setState({ data, loading: false, error: null }))
      .catch((error) => alive.current && setState({ data: null, loading: false, error }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => { alive.current = true; run(); return () => { alive.current = false; }; }, [run]);
  return { ...state, reload: run };
}

export function useDebounced(value, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

export function useReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function useTitle(title) {
  useEffect(() => {
    const prev = document.title;
    document.title = title ? `${title} — graphicsbytalha` : 'graphicsbytalha';
    return () => { document.title = prev; };
  }, [title]);
}

// Cached GET. Shows cached data instantly (no spinner) and refreshes it quietly in the background.
// `loading` is only true when there is nothing to show yet.
export function useApi(path, params, { admin = false, skip = false } = {}) {
  const key = apiKey(admin, path, params);
  const [state, setState] = useState(() => ({ key, data: peek(key) ?? null, error: null, fetching: !skip }));
  let cur = state;
  if (state.key !== key) { cur = { key, data: peek(key) ?? null, error: null, fetching: !skip }; setState(cur); }
  const run = useCallback(() => {
    if (skip) return undefined;
    let live = true;
    setState((s) => (s.key === key ? { ...s, fetching: true } : s));
    fetchCached(admin, path, params)
      .then((json) => live && setState((s) => (s.key === key ? { key, data: json, error: null, fetching: false } : s)))
      .catch((error) => live && setState((s) => (s.key === key ? { ...s, error, fetching: false } : s)));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, skip]);
  useEffect(() => run(), [run]);
  return { data: cur.data, loading: !cur.data && !cur.error && !skip, error: cur.data ? null : cur.error, refreshing: cur.fetching && !!cur.data, reload: run };
}
