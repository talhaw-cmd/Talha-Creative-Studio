import { useState } from 'react';

// Public renderer. Unknown / malformed blocks render nothing instead of crashing the page.
const safeUrl = (u) => (typeof u === 'string' && /^(https?:)?\/\//.test(u) ? u : null);
const Img = ({ src, alt, ...r }) => {
  const [bad, setBad] = useState(false);
  const url = safeUrl(src);
  if (!url || bad) return <div className="img-missing" role="img" aria-label="Image unavailable">Image unavailable</div>;
  return <img src={url} alt={alt || ''} loading="lazy" onError={() => setBad(true)} {...r} />;
};

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

function Block({ block }) {
  const c = block.content || {};
  switch (block.type) {
    case 'rich_text':
      return <div className="b-text">{String(c.text || '').split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}</div>;
    case 'image': return <figure><Img src={c.url} alt={c.alt} />{c.caption && <figcaption>{c.caption}</figcaption>}</figure>;
    case 'full_image': return <figure className="bleed"><Img src={c.url} alt={c.alt} />{c.caption && <figcaption>{c.caption}</figcaption>}</figure>;
    case 'gallery':
      return <div className="b-gallery">{(Array.isArray(c.images) ? c.images : []).map((im, i) => <Img key={i} src={im.url} alt={im.alt} />)}</div>;
    case 'two_columns':
      return <div className="b-two"><div>{c.left?.url ? <Img src={c.left.url} alt={c.left.alt} /> : <p>{c.left?.text}</p>}</div><div>{c.right?.url ? <Img src={c.right.url} alt={c.right.alt} /> : <p>{c.right?.text}</p>}</div></div>;
    case 'video': {
      const u = safeUrl(c.url); if (!u) return null;
      return <video className="b-video" src={u} controls preload="metadata" playsInline />;
    }
    case 'before_after': return <BeforeAfter before={c.before} after={c.after} alt={c.alt} />;
    case 'pdf': {
      const u = safeUrl(c.url); if (!u) return null;
      return <a className="btn" href={u} target="_blank" rel="noreferrer">{c.label || 'Open PDF'} ↗</a>;
    }
    case 'palette':
      return <div className="b-palette">{(Array.isArray(c.colors) ? c.colors : []).filter((x) => /^#[0-9a-f]{3,8}$/i.test(x)).map((x) => <div key={x} style={{ background: x }}><span>{x}</span></div>)}</div>;
    case 'divider': return <hr />;
    case 'spacer': return <div style={{ height: Math.min(Math.max(Number(c.height) || 48, 8), 400) }} />;
    default: return null;
  }
}

export default function BlockRenderer({ blocks = [] }) {
  return <div className="blocks">{blocks.map((b) => <section key={b.id || b.position} className={`block block-${b.type}`} data-reveal><Block block={b} /></section>)}</div>;
}
