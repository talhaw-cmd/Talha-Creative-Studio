import { useEffect, useRef, useState } from 'react';
import { measure } from '../lib/image.js';
import { MediaPicker } from './MediaPicker.jsx';

const RATIOS = [['Card 4:3', '4 / 3'], ['Portrait 4:5', '4 / 5'], ['Square 1:1', '1 / 1']];

// Cover: choose image, set the focal point by clicking/dragging, see how each crop looks.
export default function CoverPicker({ url, hasImage, fx, fy, onPick, onRemove, onFocal }) {
  const [open, setOpen] = useState(false);
  const [size, setSize] = useState(null);
  const box = useRef(null);
  useEffect(() => { let live = true; measure(url).then((s) => live && setSize(s)); return () => { live = false; }; }, [url]);

  const move = (e) => {
    const r = box.current.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, Math.round(((e.clientX - r.left) / r.width) * 100)));
    const y = Math.min(100, Math.max(0, Math.round(((e.clientY - r.top) / r.height) * 100)));
    onFocal(x, y);
  };
  const low = size && (size.w < 808 || size.h < 632);
  const soft = size && !low && size.w < 1000;
  const pos = `${fx}% ${fy}%`;

  return (
    <div className="cover-picker">
      {url ? (
        <div className="cover-main">
          <div className="focal" ref={box} onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); move(e); }} onPointerMove={(e) => e.buttons === 1 && move(e)} title="Click or drag to set the focal point">
            <img src={url} alt="" draggable="false" />
            <span className="focal-dot" style={{ left: `${fx}%`, top: `${fy}%` }} />
          </div>
          <div className="cover-previews">
            {RATIOS.map(([l, r]) => (
              <figure key={l}><div style={{ aspectRatio: r }}><img src={url} alt="" style={{ objectPosition: pos }} /></div><figcaption>{l}</figcaption></figure>
            ))}
          </div>
        </div>
      ) : <div className="thumb empty">No cover yet</div>}
      <div className="row gap wrap center">
        <button type="button" className="btn sm" onClick={() => setOpen(true)}>{hasImage ? 'Change cover' : 'Choose cover'}</button>
        {hasImage && <button type="button" className="btn ghost sm" onClick={onRemove}>Remove</button>}
        {size && <span className="muted small">{size.w} × {size.h}px</span>}
      </div>
      {url && <p className="muted small">Click the picture to choose the point that stays in view when the cover is cropped for cards. Recommended: at least 808 × 632 px (Behance cover size), ideally 1600 px wide.</p>}
      {low && <p className="warn">This cover is smaller than 808 × 632 px and may look blurry on cards.</p>}
      {soft && <p className="warn">Under 1000px wide. Fine for cards, but soft if shown large.</p>}
      {open && <MediaPicker onClose={() => setOpen(false)} onSelect={(m) => { onPick(m); setOpen(false); }} />}
    </div>
  );
}
