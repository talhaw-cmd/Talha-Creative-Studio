import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, useToast } from './ui.jsx';
import { MediaPicker } from './MediaPicker.jsx';
import { measure, uploadMedia } from '../lib/image.js';
import { COVER } from '../lib/showcase.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// Behance-style cover crop: fixed 808x632 (1.28:1) frame, drag to move, zoom, result saved as a 1616x1264 file.
export default function CoverCrop({ initial, candidates = [], title, owner, onDone, onClose }) {
  const toast = useToast();
  const [src, setSrc] = useState(initial || candidates[0] || '');
  const [dim, setDim] = useState(null);
  const [z, setZ] = useState(1); const [c, setC] = useState({ x: 0.5, y: 0.5 });
  const [lib, setLib] = useState(false); const [busy, setBusy] = useState(false);
  const frame = useRef(null); const drag = useRef(null);

  useEffect(() => { let live = true; setDim(null); measure(src).then((d) => { if (live) { setDim(d); setZ(1); setC({ x: 0.5, y: 0.5 }); } }); return () => { live = false; }; }, [src]);

  const k = useMemo(() => {
    if (!dim) return null;
    const ar = dim.w / dim.h;
    return { rw: z * Math.max(1, ar / COVER.ratio), rh: z * Math.max(1, COVER.ratio / ar) };
  }, [dim, z]);
  const fix = (p, kk = k) => (kk ? { x: clamp(p.x, 0.5 / kk.rw, 1 - 0.5 / kk.rw), y: clamp(p.y, 0.5 / kk.rh, 1 - 0.5 / kk.rh) } : p);
  const pos = fix(c);
  const style = k ? { width: `${k.rw * 100}%`, height: `${k.rh * 100}%`, left: `${(0.5 - pos.x * k.rw) * 100}%`, top: `${(0.5 - pos.y * k.rh) * 100}%` } : null;
  const cropW = dim && k ? Math.round(dim.w / k.rw) : 0; const cropH = dim && k ? Math.round(dim.h / k.rh) : 0;

  const down = (e) => { e.currentTarget.setPointerCapture(e.pointerId); drag.current = { x: e.clientX, y: e.clientY, c: pos }; };
  const move = (e) => {
    if (!drag.current || !k) return;
    const r = frame.current.getBoundingClientRect();
    setC(fix({ x: drag.current.c.x - (e.clientX - drag.current.x) / (r.width * k.rw), y: drag.current.c.y - (e.clientY - drag.current.y) / (r.height * k.rh) }));
  };
  const zoom = (v) => { const nz = Number(v); const ar = dim.w / dim.h; const kk = { rw: nz * Math.max(1, ar / COVER.ratio), rh: nz * Math.max(1, COVER.ratio / ar) }; setZ(nz); setC(fix(c, kk)); };

  async function crop() {
    setBusy(true);
    try {
      const res = await fetch(src, { mode: 'cors' }); if (!res.ok) throw new Error('fetch');
      const bmp = await createImageBitmap(await res.blob());
      const sw = bmp.width / k.rw; const sh = bmp.height / k.rh;
      const cv = document.createElement('canvas'); cv.width = COVER.outW; cv.height = COVER.outH;
      cv.getContext('2d').drawImage(bmp, pos.x * bmp.width - sw / 2, pos.y * bmp.height - sh / 2, sw, sh, 0, 0, COVER.outW, COVER.outH);
      const blob = await new Promise((r) => cv.toBlob(r, 'image/jpeg', 0.92));
      if (!blob) throw new Error('blob');
      const up = await uploadMedia(new File([blob], `cover-${Date.now().toString(36)}.jpg`, { type: 'image/jpeg' }));
      onDone({ id: up.data.id, url: up.data.url, alt_text: up.data.alt_text });
    } catch {
      toast.error('The browser blocked cropping this image. Upload it to the library again, or use it as it is.');
    } finally { setBusy(false); }
  }

  return (
    <Modal title="Project cover" onClose={onClose} wide>
      <div className="cc">
        <div className="cc-left">
          <p className="field-label">Card preview</p>
          <div className="cc-card"><div className="cc-frame">{src && style && <img src={src} alt="" style={style} />}</div>
            <div className="cc-meta"><strong>{title || 'Untitled project'}</strong><span>{owner}</span></div></div>
          <p className="muted small">Cover ratio is <b>808 × 632</b> (about 1.28 : 1). It is saved at 1616 × 1264 so it stays sharp on retina screens.</p>
        </div>
        <div className="cc-right">
          <p className="field-label">Drag to move · slider to zoom</p>
          <div className="cc-frame big" ref={frame} onPointerDown={down} onPointerMove={move} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
            {src && style ? <img src={src} alt="" draggable="false" style={style} /> : <span className="muted">{src ? 'Loading…' : 'Choose an image below'}</span>}
          </div>
          <div className="cc-zoom"><span aria-hidden="true">−</span><input type="range" min="1" max="3" step="0.01" value={z} disabled={!dim} onChange={(e) => zoom(e.target.value)} aria-label="Zoom" /><span aria-hidden="true">+</span></div>
          {dim && <p className={`small ${cropW < COVER.w ? 'warn' : 'muted'}`}>Original {dim.w} × {dim.h}px · crop area {cropW} × {cropH}px{cropW < COVER.w ? ` — smaller than ${COVER.w} × ${COVER.h}, it will look soft` : ''}</p>}
          <div className="cc-thumbs">
            {candidates.map((u) => <button key={u} type="button" className={u === src ? 'on' : ''} onClick={() => setSrc(u)} aria-label="Use this image"><img src={u} alt="" /></button>)}
            <button type="button" className="cc-add" onClick={() => setLib(true)} aria-label="Choose another image">+</button>
          </div>
        </div>
      </div>
      <div className="row gap end">
        <button type="button" className="btn" onClick={onClose}>Cancel</button>
        <button type="button" className="btn primary" disabled={!dim || busy} onClick={crop}>{busy ? 'Cropping…' : 'Crop'}</button>
      </div>
      {lib && <MediaPicker onClose={() => setLib(false)} onSelect={(m) => { setSrc(m.url); setLib(false); }} />}
    </Modal>
  );
}
