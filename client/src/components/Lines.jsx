// Headline split into masked lines. `split` lets the scroll helper animate it; the hero animates its own.
export default function Lines({ as: Tag = 'h2', lines, className = '', split = true, accentLast = false, id }) {
  return (
    <Tag className={className} id={id} {...(split ? { 'data-split': '' } : { 'data-lines': '' })}>
      {lines.map((l, i) => (
        <span key={i} className={`hl ${accentLast && i === lines.length - 1 ? 'accent' : ''}`}>
          <span className="hl-inner">{l}</span>
        </span>
      ))}
    </Tag>
  );
}
