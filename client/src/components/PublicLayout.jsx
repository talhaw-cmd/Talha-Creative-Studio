import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useApi } from '../lib/useAsync.js';
import Brand from './Brand.jsx';

const links = [['/work', 'Work'], ['/services', 'Services'], ['/packages', 'Packages'], ['/about', 'About']];

export default function PublicLayout() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const { data } = useApi('/settings');
  const s = data?.data;

  useEffect(() => { setOpen(false); window.scrollTo(0, 0); }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKey); };
  }, [open]);

  const socials = [
    s?.instagram && ['Instagram', s.instagram, 'IG'], s?.behance && ['Behance', s.behance, 'Bē'], s?.linkedin && ['LinkedIn', s.linkedin, 'in'],
    s?.whatsapp && ['WhatsApp', `https://wa.me/${s.whatsapp.replace(/\D/g, '')}`, 'WA'], s?.contact_email && ['Email', `mailto:${s.contact_email}`, '@'],
  ].filter(Boolean);

  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <header className="site-header">
        <Link to="/" className="brand" aria-label="Home"><Brand title={s?.site_title} /></Link>
        <div className="head-right">
          <nav className="main-nav" aria-label="Main">{links.map(([to, label]) => <NavLink key={to} to={to}>{label}</NavLink>)}</nav>
          <Link className="btn primary" to="/contact">Contact</Link>
        </div>
        <button className="menu-btn" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)}><span /><span /></button>
      </header>

      {open && (
        <div className="mobile-menu" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="row"><Brand title={s?.site_title} /><button className="menu-btn menu-close" aria-label="Close menu" onClick={() => setOpen(false)}>✕</button></div>
          <nav aria-label="Mobile">{[['/', 'Home'], ...links].map(([to, label]) => <NavLink key={to} to={to} end={to === '/'}>{label}</NavLink>)}</nav>
          <Link className="btn primary lg" to="/contact">Contact</Link>
        </div>
      )}

      <main id="main"><Outlet context={{ settings: s }} /></main>

      <footer className="site-footer">
        <div className="foot-top">
          <Link to="/" className="brand" aria-label="Home"><Brand title={s?.site_title} /></Link>
          <nav className="foot-nav" aria-label="Footer">{[...links, ['/contact', 'Contact']].map(([to, label]) => <Link key={to} to={to}>{label}</Link>)}</nav>
          {socials.length > 0 && <div className="socials">{socials.map(([label, href, t]) => <a key={label} href={href} aria-label={label} target={href.startsWith('http') ? '_blank' : undefined} rel="noreferrer">{t}</a>)}</div>}
        </div>
        <small className="muted">© {new Date().getFullYear()} {s?.site_title || 'Talha Creative Studio'}. All rights reserved.</small>
      </footer>
    </>
  );
}
