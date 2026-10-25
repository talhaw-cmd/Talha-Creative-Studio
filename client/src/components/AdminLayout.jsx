import { useState } from 'react';
import { Navigate, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext.jsx';
import { Spinner } from './ui.jsx';

const nav = [
  ['/admin', 'Dashboard', true], ['/admin/projects', 'Projects'], ['/admin/packages', 'Packages'], ['/admin/media', 'Media'],
  ['/admin/clients', 'Clients'], ['/admin/invoices', 'Invoices'], ['/admin/enquiries', 'Enquiries'], ['/admin/settings', 'Settings'],
];

export default function AdminLayout() {
  const { session, isAdmin, loading, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  if (loading) return <Spinner label="Checking session…" />;
  if (!session) return <Navigate to="/admin/login" replace state={{ from: loc.pathname }} />;
  if (!isAdmin) return (
    <div className="login"><div className="login-card"><h1>No access</h1><p className="muted">This account is not an admin.</p><button className="btn" onClick={signOut}>Sign out</button></div></div>
  );
  return (
    <div className="admin">
      <button className="menu-btn admin-menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>{open ? 'Close' : 'Menu'}</button>
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="logo">admin<i>.</i></div>
        <nav aria-label="Admin">
          {nav.map(([to, label, end]) => <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)}>{label}</NavLink>)}
        </nav>
        <div className="side-foot">
          <a href="/" target="_blank" rel="noreferrer" className="link">View site ↗</a>
          <button className="btn ghost sm" onClick={signOut}>Sign out</button>
        </div>
      </aside>
      <section className="admin-main"><Outlet /></section>
    </div>
  );
}
