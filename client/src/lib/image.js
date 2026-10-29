import { admin } from './api.js';

export const MAX_W = 2800;          // 2 x the 1400 px canvas, for retina screens
export const MAX_BYTES = 20 * 1024 * 1024;

export const measure = (url) => new Promise((resolve) => {
  if (!url) return resolve(null);
  const i = new Image();
  i.onload = () => resolve({ w: i.naturalWidth, h: i.naturalHeight });
  i.onerror = () => resolve(null);
  i.src = url;
});

// Downscale very large JPEG/PNG/WebP files in the browser before upload (same type, same name).
export async function prepareImage(file) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type) || !window.createImageBitmap) return { file, resized: false };
  let bmp;
  try { bmp = await createImageBitmap(file); } catch { return { file, resized: false }; }
  if (bmp.width <= MAX_W) { bmp.close?.(); return { file, resized: false }; }
  const w = MAX_W; const h = Math.round((bmp.height * MAX_W) / bmp.width);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  c.getContext('2d').drawImage(bmp, 0, 0, w, h); bmp.close?.();
  const blob = await new Promise((r) => c.toBlob(r, file.type, 0.92));
  if (!blob || blob.size >= file.size) return { file, resized: false };
  return { file: new File([blob], file.name, { type: file.type }), resized: true };
}

export async function uploadMedia(file, fields) {
  const p = await prepareImage(file);
  if (p.file.size > MAX_BYTES) throw new Error(`${file.name} is over 20 MB, even after resizing. Export it smaller first.`);
  const r = await admin.upload('/media', p.file, fields);
  return { ...r, resized: p.resized };
}
