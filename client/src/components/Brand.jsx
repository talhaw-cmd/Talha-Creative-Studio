export default function Brand({ title }) {
  const words = String(title || 'Talha Creative Studio').split(/\s+/).filter(Boolean);
  return <span className="brand-mark">{words.map((w, i) => <span key={i}>{w}</span>)}</span>;
}
