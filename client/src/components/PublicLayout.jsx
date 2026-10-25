import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAsync } from '../lib/useAsync.js';
import { useEffect } from 'react';

const links = [['/', 'Home'], ['/work', 'Work'], ['/packages', 'Packages'], ['/about', 'About'], ['/contact', 'Contact']];

export default function PublicLayout() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const { data } = useAsync(() => api.get('/settings'), []);
  const s = data?.data;
  useEffect(() => { setOpen(false); window.scrollTo(0, 0); }, [pathname]);

  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <header className="site-header">
        <Link to="/" className="logo">{s?.site_title || 'graphicsbytalha'}<i>.</i></Link>
        <button className="menu-btn" aria-expanded={open} aria-controls="nav" onClick={() => setOpen((o) => !o)}>{open ? 'Close' : 'Menu'}</button>
        <nav id="nav" className={open ? 'open' : ''} aria-label="Main">
          {links.map(([to, label]) => <NavLink key={to} to={to} end={to === '/'}>{label}</NavLink>)}
        </nav>
      </header>
      <main id="main"><Outlet context={{ settings: s }} /></main>
      <footer className="site-footer">
        <div>
          <strong>{s?.site_title || 'graphicsbytalha'}</strong>
          <p className="muted">{s?.tagline || 'Ideas made visible'}</p>
        </div>
        <div className="footer-links">
          {s?.contact_email && <a href={`mailto:${s.contact_email}`}>{s.contact_email}</a>}
          {s?.whatsapp && <a href={`https://wa.me/${s.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">WhatsApp</a>}
          {s?.instagram && <a href={s.instagram} target="_blank" rel="noreferrer">Instagram</a>}
          {s?.behance && <a href={s.behance} target="_blank" rel="noreferrer">Behance</a>}
          {s?.linkedin && <a href={s.linkedin} target="_blank" rel="noreferrer">LinkedIn</a>}
        </div>
        <small className="muted">© {new Date().getFullYear()} {s?.site_title || 'graphicsbytalha'}</small>
      </footer>
    </>
  );
}
