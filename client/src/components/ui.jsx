import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

/* ---------- toasts ---------- */
const ToastCtx = createContext(null);
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((message, type = 'ok') => {
    const id = Math.random().toString(36).slice(2);
    setItems((s) => [...s, { id, message, type }]);
    setTimeout(() => setItems((s) => s.filter((t) => t.id !== id)), 4500);
  }, []);
  const toast = { success: (m) => push(m, 'ok'), error: (m) => push(m, 'err') };
  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => <div key={t.id} className={`toast ${t.type}`}>{t.message}</div>)}
      </div>
    </ToastCtx.Provider>
  );
}

/* ---------- confirm dialog ---------- */
const ConfirmCtx = createContext(null);
export const useConfirm = () => useContext(ConfirmCtx);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);
  const confirm = useCallback((opts) => new Promise((resolve) => setState({ ...opts, resolve })), []);
  const close = (v) => { state.resolve(v); setState(null); };
  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      {state && (
        <Modal title={state.title || 'Are you sure?'} onClose={() => close(false)}>
          <p className="muted">{state.message}</p>
          <div className="row end gap">
            <button className="btn ghost" onClick={() => close(false)}>Cancel</button>
            <button className={`btn ${state.danger ? 'danger' : 'primary'}`} onClick={() => close(true)}>{state.confirmLabel || 'Confirm'}</button>
          </div>
        </Modal>
      )}
    </ConfirmCtx.Provider>
  );
}

export function Modal({ title, onClose, children, wide }) {
  const ref = useRef(null);
  const close = useRef(onClose);
  close.current = onClose; // keep latest handler without re-running the effect (re-running stole focus from inputs)
  useEffect(() => {
    const prev = document.activeElement;
    ref.current?.focus();
    const onKey = (e) => e.key === 'Escape' && close.current();
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); prev?.focus?.(); };
  }, []);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref}>
        <div className="row between"><h3>{title}</h3><button className="btn ghost sm" onClick={onClose} aria-label="Close">✕</button></div>
        {children}
      </div>
    </div>
  );
}

/* ---------- states ---------- */
export const Spinner = ({ label = 'Loading…' }) => <div className="state" role="status"><span className="spin" />{label}</div>;
export const ErrorState = ({ error, onRetry }) => (
  <div className="state err" role="alert">
    <p>{error?.message || 'Something went wrong.'}</p>
    {onRetry && <button className="btn" onClick={onRetry}>Retry</button>}
  </div>
);
export const Empty = ({ title, hint, action }) => (
  <div className="state"><strong>{title}</strong>{hint && <p className="muted">{hint}</p>}{action}</div>
);

/* ---------- form bits ---------- */
export function Field({ label, error, hint, children }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && !error && <small className="muted">{hint}</small>}
      {error && <small className="field-err">{Array.isArray(error) ? error[0] : error}</small>}
    </label>
  );
}

export function Pager({ meta, onPage }) {
  if (!meta || meta.total <= meta.limit) return null;
  const pages = Math.ceil(meta.total / meta.limit);
  return (
    <div className="row center gap pager">
      <button className="btn sm" disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)}>← Prev</button>
      <span className="muted">Page {meta.page} of {pages} · {meta.total} items</span>
      <button className="btn sm" disabled={meta.page >= pages} onClick={() => onPage(meta.page + 1)}>Next →</button>
    </div>
  );
}

export const StatusBadge = ({ value }) => <span className={`badge b-${String(value).replace(/_/g, '-')}`}>{String(value).replace(/_/g, ' ')}</span>;

// Warn before leaving a dirty form (browser tab close / reload)
export function useUnsavedWarning(dirty) {
  useEffect(() => {
    if (!dirty) return;
    const h = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);
}
