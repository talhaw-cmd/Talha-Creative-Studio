import { useState } from 'react';
import { sanitizeHtml, textToHtml } from '../lib/sanitize.js';
import { DEFAULT_WIDTH, WIDTHS } from '../lib/showcase.js';

// Renders case-study modules. Unknown or broken modules render nothing instead of crashing the page.
const safeUrl = (u) => (typeof u === 'string' && /^(https?:)?\/\//.test(u) ? u : null);

function Img({ src, alt, w, h, eager }) {
  const [bad, setBad] = useState(false);
  const url = safeUrl(src);
  if (!url || bad) return <div className="img-missing" role="img" aria-label="Image unavailable">Image unavailable</div>;
  return <img src={url} alt={alt || ''} width={w || undefined} height={h || undefined} loading={eager ? 'eager' : 'lazy'} decoding="async" onError={() => setBad(true)} />;
}

function BeforeAfter({ before, after, alt }) {
  const [pos, setPos] = useState(50);
  return (
    <div className="ba">
      <div className="ba-stage">
        <Img src={after} alt={`${alt || ''} after`} />
        <div className="ba-before" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}><Img src={before} alt={`${alt || ''} before`} /></div>
        <span className="ba-line" style={{ left: `${pos}%` }} />
      </div>
      <input type="range" min="0" max="100" value={pos} onChange={(e) => setPos(+e.target.value)} aria-label="Compare before and after" />
    </div>
  );
}

function Module({ b, first }) {
  const c = b.content || {};
  const width = c.width || DEFAULT_WIDTH[b.type] || 'wide';
  const style = { '--mw': `${WIDTHS[width] || WIDTHS.wide}px` };
  const cls = `mod a-${c.align || 'center'}`;
  switch (b.type) {
    case 'rich_text':
      return <div className={`mod txt ta-${c.align || 'left'} s-${c.size || 'm'}`} style={style} dangerouslySetInnerHTML={{ __html: c.html ? sanitizeHtml(c.html) : textToHtml(c.text) }} />;
    case 'image': case 'full_image':
      return (
        <figure className={`${cls} img r-${c.radius || 'none'} ${c.fit ? 'fit' : ''}`} style={style}>
          <Img src={c.url} alt={c.alt} w={c.w} h={c.h} eager={first} />
          {c.caption && <figcaption className="pad">{c.caption}</figcaption>}
        </figure>
      );
    case 'gallery': {
      const imgs = Array.isArray(c.images) ? c.images : [];
      return (
        <div className={`${cls} gal ${c.crop === 'square' ? 'sq' : ''}`} style={{ ...style, '--cols': Math.min(Math.max(Number(c.cols) || 2, 1), 4), '--g': `${Number(c.gap) || 0}px` }}>
          {imgs.map((im, i) => <Img key={i} src={im.url} alt={im.alt} w={im.w} h={im.h} />)}
        </div>
      );
    }
    case 'two_columns':
      return (
        <div className={`${cls} b-two pad`} style={style}>
          {[c.left, c.right].map((s, i) => <div key={i}>{s?.url ? <Img src={s.url} alt={s.alt} /> : <p>{s?.text}</p>}</div>)}
        </div>
      );
    case 'video': { const u = safeUrl(c.url); return u ? <div className={cls} style={style}><video className="b-video" src={u} controls preload="metadata" playsInline /></div> : null; }
    case 'before_after': return <div className={cls} style={style}><BeforeAfter before={c.before} after={c.after} alt={c.alt} /></div>;
    case 'pdf': { const u = safeUrl(c.url); return u ? <div className={`${cls} pad`} style={style}><a className="btn" href={u} target="_blank" rel="noreferrer">{c.label || 'Open PDF'} ↗</a></div> : null; }
    case 'palette':
      return <div className={`${cls} b-palette`} style={style}>{(Array.isArray(c.colors) ? c.colors : []).filter((x) => /^#[0-9a-f]{3,8}$/i.test(x)).map((x) => <div key={x} style={{ background: x }}><span>{x}</span></div>)}</div>;
    case 'divider': return <hr className={`${cls} pad`} style={style} />;
    case 'spacer': return <div style={{ height: Math.min(Math.max(Number(c.height) || 48, 8), 400) }} />;
    default: return null;
  }
}

export function ModuleSkeleton() {
  return <div className="sc-mods" aria-hidden="true">{[0.7, 0.55, 0.7].map((r, i) => <div key={i} className="mod sk" style={{ '--mw': '1400px', aspectRatio: `1400 / ${Math.round(1400 * r)}` }} />)}</div>;
}

export default function Modules({ modules = [], skipFirstLazy = false }) {
  return <div className="sc-mods">{modules.map((b, i) => <Module key={b.id || b._k || i} b={b} first={skipFirstLazy && i === 0} />)}</div>;
}
