// Turn a pasted link into a safe embeddable URL. Only YouTube and Vimeo are allowed.
export function embedSrc(input) {
  let u; try { u = new URL(String(input || '').trim()); } catch { return null; }
  const h = u.hostname.replace(/^www\./, '');
  if (h === 'youtu.be') return /^[\w-]{6,15}$/.test(u.pathname.slice(1)) ? `https://www.youtube-nocookie.com/embed/${u.pathname.slice(1)}` : null;
  if (h === 'youtube.com' || h === 'm.youtube.com') {
    const id = u.pathname === '/watch' ? u.searchParams.get('v') : (u.pathname.match(/^\/(?:embed|shorts)\/([\w-]{6,15})/) || [])[1];
    return id && /^[\w-]{6,15}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  }
  if (h === 'vimeo.com' || h === 'player.vimeo.com') { const id = (u.pathname.match(/(\d{5,})/) || [])[1]; return id ? `https://player.vimeo.com/video/${id}` : null; }
  return null;
}
