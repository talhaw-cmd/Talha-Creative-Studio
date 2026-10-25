import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext.jsx';
import { supabaseConfigured } from '../../lib/supabase.js';
import { Field } from '../../components/ui.jsx';

export default function Login() {
  const { signIn, session, isAdmin } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [f, setF] = useState({ email: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  if (session && isAdmin) return <Navigate to={loc.state?.from || '/admin'} replace />;

  async function submit(e) {
    e.preventDefault(); setErr(''); setBusy(true);
    try { await signIn(f.email, f.password); nav(loc.state?.from || '/admin', { replace: true }); }
    catch (x) { setErr(x.message); } finally { setBusy(false); }
  }
  return (
    <div className="login">
      <form className="login-card" onSubmit={submit}>
        <h1>Admin sign in</h1>
        {!supabaseConfigured && <p className="field-err">Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.</p>}
        <Field label="Email"><input className="input" type="email" autoComplete="username" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        <Field label="Password"><input className="input" type="password" autoComplete="current-password" required value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></Field>
        {err && <p className="field-err" role="alert">{err}</p>}
        <button className="btn primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </div>
  );
}
