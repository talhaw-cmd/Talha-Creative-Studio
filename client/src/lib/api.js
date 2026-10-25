import { supabase } from './supabase.js';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export class ApiError extends Error {
  constructor(status, message, details) { super(message); this.status = status; this.details = details; }
}

async function request(path, { method = 'GET', body, admin = false, form = false } = {}) {
  const headers = {};
  if (admin) {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw new ApiError(401, 'Please sign in');
    headers.Authorization = `Bearer ${data.session.access_token}`;
  }
  if (body && !form) headers['Content-Type'] = 'application/json';
  let res;
  try {
    res = await fetch(`${BASE}${path}`, { method, headers, body: form ? body : body ? JSON.stringify(body) : undefined });
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Check your connection and try again.');
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, json?.error?.message || 'Something went wrong', json?.error?.details);
  return json;
}

const qs = (params = {}) => {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') p.set(k, v); });
  const s = p.toString();
  return s ? `?${s}` : '';
};

export const api = {
  get: (path, params) => request(path + qs(params)),
  post: (path, body) => request(path, { method: 'POST', body }),
};

export const admin = {
  get: (path, params) => request('/admin' + path + qs(params), { admin: true }),
  post: (path, body) => request('/admin' + path, { method: 'POST', body: body ?? {}, admin: true }),
  put: (path, body) => request('/admin' + path, { method: 'PUT', body, admin: true }),
  patch: (path, body) => request('/admin' + path, { method: 'PATCH', body, admin: true }),
  del: (path) => request('/admin' + path, { method: 'DELETE', admin: true }),
  upload: (path, file, fields = {}) => {
    const fd = new FormData();
    Object.entries(fields).forEach(([k, v]) => v != null && fd.append(k, v));
    fd.append('file', file);
    return request('/admin' + path, { method: 'POST', body: fd, admin: true, form: true });
  },
};

export const slugify = (s) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100);

export const money = (n, cur = 'USD') =>
  new Intl.NumberFormat('en', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(Number(n || 0));

export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
export const fmtSize = (b) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
