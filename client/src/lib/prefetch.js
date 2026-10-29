import { prefetch } from './api.js';

// Warm the cache and the browser image cache so opening a project feels instant.
export function prefetchProject(p) {
  if (!p?.slug) return;
  prefetch(`/projects/${p.slug}`);
  if (p.cover_url) { const i = new Image(); i.decoding = 'async'; i.src = p.cover_url; }
}
export const prefetchProps = (p) => ({ onPointerEnter: () => prefetchProject(p), onFocus: () => prefetchProject(p) });
